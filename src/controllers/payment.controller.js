/**
 * Stripe payment controller implementation
 */

const stripeModule = require("stripe");
const User = require("../models/user.model");
const { logger } = require("../controllers/logger.controller");
const { audit } = require("../helpers/messaging");
const { formatMoney, secureStack } = require("../helpers/misc");
const config = require("../config");


// initialize Stripe module
const stripe = stripeModule(config.mode.stripelive ?
  process.env.STRIPE_API_KEY_LIVE :
  process.env.STRIPE_API_KEY_TEST
);

const createCheckoutSession = async (req, res, next) => {
  const cart = req.parameters.cart; // cart is an object with items array

  if (!cart || !cart.items || cart.items.length === 0) {
    return res.status(400).json({ message: req.t("Empty cart") });
  }

  // create line items
  const line_items = cart.items.map(item => {
    // warning: we have to use public url, becauss Stripe needs to reach public images
    const imageUrl = config.mode.production ?
      `${config.baseUrlPublic}/assets/products/images/${item.imageName}` :
      // while developing we show a public static image placeholder, stripe cannot access local images...
      `${config.baseUrlPublic}/assets/images/ImagePlaceholder.jpg`
    ;
    return {
      price_data: {
        currency: config.currency,
        product_data: {
          name: item.mdaCode,
          images: [imageUrl],
          ...(item.notes && { description: item.notes }), // conditionally add description, Stripe is quite picky here...
        },
        unit_amount: item.price, // stripe expects integer (cents)
      },
      quantity: item.quantity,
    };
  });

  // create customer
  let user, stripeCustomerId;
  if (req.userId) { // user is authenticated
    user = await User.findById(req.userId);
    if (!user) {
      let message = req.t("User with id {{userId}} not found", { userId: req.userId });
      return res.status(403).json({ message });
    }
    try {
      if (user.stripeCustomerId) { // user already has a customer id, she did buy already: use it
        stripeCustomerId = user.stripeCustomerId;
      } else {
        // user does not have a customer id, she did never buy before: create a customer
        const customer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          metadata: {
            userId: req.userId, // optional, to map our userId with the Stripe customer
          },
        });
        stripeCustomerId = customer.id;
      }
      user.stripeCustomerId = stripeCustomerId;
      await user.save(); // save customer id to user
      logger.info(`Payment customer created`);
    } catch (err) {
      logger.error("Payment checkout customer creation error:", err);
      audit({ req, mode: "error", subject: `Payment checkout customer creation error`, htmlContent: `Payment checkout customer creation error for user ${user.firstName} ${user.lastName} (email: ${user.email}):\n${err.message}` });
      return res.status(400).json({ message: err.message });
    }
  } else { // user is not authenticated: simply do not pass a customer to stripe.checkout.sessions.create
  }

  // create session
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      shipping_address_collection: { // ask stripe to collect customer's shipping address
        allowed_countries: config.payment.stripe.checkout.shipping_allowed_countries,
      },
      ...(stripeCustomerId && { customer: stripeCustomerId }),
      success_url: `${config.payment.stripe.paymentSuccessUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.payment.stripe.paymentCancelUrl}?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        isGift: cart.isGift, // pass custom metadata here
        userId: user?.id, // user id
      },
    });
    if (!session?.url) { // incomplete response, we miss the redirect url
      throw new Error("no session url");
    }
    logger.info(`Payment checkout session created`);
    audit({
      req,
      mode: "action",
      subject: `Payment checkout session created`,
      htmlContent: user ?
        `Payment checkout session created for user ${user.firstName} ${user.lastName} (email: ${user.email})` :
        `Payment checkout session created for guest user`
    });

    // if user did accept to receive offers emails, set it in user's prefereces
    if (user && cart.acceptToReceiveOffersEmails) {
      user.preferences.notifications.email.offers = true;
      await user.save();
    }

    return res.status(200).json({ session, user }); // return the session with the redirect url, and the user, possibly with updated notifications
  } catch (err) {
    audit({req, mode: "error", subject: `Payment checkout session creation error`, htmlContent: `Payment checkout session creation error for user ${user.firstName} ${user.lastName} (email: ${user.email}):\n${err.message}` });
    return next(Object.assign(new Error(req.t("Payment checkout session creation error: {{ err }}", { err: err.message }), { status: 500, stack: secureStack(err) })));
  }
};

const paymentSuccess = async (req, res, next) => {
  //const currency = config.currencies[config.currency];
  try {
    const session = await stripe.checkout.sessions.retrieve(req.query.session_id, {
      expand: ["customer", "payment_intent"], // include customer and payment details
    });
    //console.log("**************** SESSION:", session); // eslint-disable-line no-console
    const customer = session.customer;
    //console.log("**************** CUSTOMER:", customer); // eslint-disable-line no-console
    const shippingInfo = session.shipping_details;
    //console.log("**************** SHIPPINGINFO:", shippingInfo); // eslint-disable-line no-console

    // const session = await stripe.checkout.sessions.retrieve(req.parameters.session_id);
    // const customer = session.customer ? await stripe.customers.retrieve(session.customer) : null;

    const items = await stripe.checkout.sessions.listLineItems(session.id);
    logger.info(`Session ${req.parameters.session_id} payment successful for ${items.data.length} product${items.data.length > 1 ? "s" : ""}${customer ? ` by customer ${customer.email}` : ""}`);
    audit({
      req, mode: "action", subject: `Payment successful`, htmlContent: `
        <p>Payment successful for ${items.data.length} product${items.data.length > 1 ? "s" : ""}:</p>
      ` +
        items.data.map(item =>
          `<ul>
            <li>description: ${item.description}</li>
            <li>quantity: ${item.quantity}</li>
            <li>price discount: ${formatMoney(item.amount_discount)}</li>
            <li>price subtotal: ${formatMoney(item.amount_subtotal)}</li>
            <li>price tax: ${formatMoney(item.amount_tax)}</li>
            <li>price total: ${formatMoney(item.amount_total)}</li>
          </ul>`
        ).join("\n") +
      (customer ? `
        <p>By customer:</p>
        <ul>
          <li>name: ${customer.name}</li>
          <li>email: ${customer.email}</li>
        </ul>
      ` :
        "(no customer info)"
      ) +
      (shippingInfo ? `
        <p>Shipping info:</p>
        <p>Name: ${shippingInfo.name}</p>
        <p>Address:</p>
        <ul>
          <li>city: ${shippingInfo.address?.city}</li>
          <li>country: ${shippingInfo.address?.country}</li>
          <li>street: ${shippingInfo.address?.line1}</li>
          ` + (shippingInfo.address?.line2 ? `<li> ${shippingInfo.address?.line2}</li>` : ``) + `
          <li>postal code: ${shippingInfo.address?.postal_code}</li>
          <li>state: ${shippingInfo.address?.state}</li>
        </ul>
      ` :
        "(no shipping info)"
      )
    });
    res.redirect(config.payment.stripe.paymentSuccessUrlClient);
  } catch (err) { // should not happen...
    return next(Object.assign(new Error(req.t("Error retrieving payment info on payment success callback: {{ err }}", { err: err.message }), { status: 500, stack: secureStack(err) })));
  }
};

const paymentCancel = async (req, res, next) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.parameters.session_id);
    const customer = session.customer ? await stripe.customers.retrieve(session.customer) : null;
    //const items = await stripe.checkout.sessions.listLineItems(session.id);
    logger.info(`Payment canceled`);
    audit({req, mode: "action", subject: "Payment canceled", htmlContent: `
        Session id: ${req.parameters.session_id}\n
        Payment canceled\n
      ` +
      (customer ? `
        By customer:
         <li>name: ${customer.name}
         <li>email: ${customer.email}
      ` :
        "(no customer info)"
      )
    });
    res.redirect(config.payment.stripe.paymentCancelUrlClient);
  } catch (err) { // should not happen...
    return next(Object.assign(new Error(req.t("Error retrieving payment info on payment cancel callback: {{ err }}", { err: err.message }), { status: 500, stack: secureStack(err) })));
  }
};

module.exports = {
  createCheckoutSession,
  paymentSuccess,
  paymentCancel,
};
