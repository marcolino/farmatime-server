/**
 * Stripe payment controller implementation
 */

const stripeModule = require("stripe");
const User = require("../models/user.model");
const { logger } = require("../controllers/logger.controller");
const { audit } = require("../helpers/messaging");
const config = require("../config");

const stripe = stripeModule(
  (process.env.STRIPE_MODE === "live") ?
    process.env.STRIPE_API_KEY_LIVE
  :
    process.env.STRIPE_API_KEY_TEST
  )
  ;
//console.log("*** STRIPE:", stripe);

const getMode = async(req, res) => {
  res.status(200).json({mode: process.env.STRIPE_MODE});
};

const createCheckoutSession = async (req, res) => {
  const cart = req.parameters.cart; // cart is an object with items array
  console.log("CART: ", cart);
  const line_items = cart.items.map(item => {
    return {
      price_data: {
        currency: config.currency,
        product_data: {
          name: item.mdaCode,
          ...(item.notes && { description: item.notes }), // conditionally add description, Stripe is quite picky here...
        },
        unit_amount: item.price, // stripe expects integer (cents)
      },
      quantity: item.quantity,
    }
  });

  const user = await User.findById(req.userId);
  if (!user) throw new Error(req.t("User with id {userId} not found", { userId }));
  try {
    let stripeCustomerId;
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

    const session = await stripe.checkout.sessions.create({
      line_items,
      mode: "payment",
      shipping_address_collection: { // ask stripe to collect customer's shipping address
        allowed_countries: config.payment.stripe.checkout.shipping_allowed_countries,
      },
      customer: stripeCustomerId,
      success_url: `${config.payment.stripe.paymentSuccessUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.payment.stripe.paymentCancelUrl}?session_id={CHECKOUT_SESSION_ID}`,
    });
    if (!session?.url) { // incomplete response, we miss the redirect url
      throw new Error("no session url");
    }
    logger.info(`Payment checkout session created`);
    audit({
      req,
      subject: `Payment checkout session created`,
      htmlContent: `Payment checkout session created\n` + `User id: ${req.userId}`
    });

    // if user did accept to receive offers emails, set it in user's prefereces
    console.log("******************* cart.acceptToReceiveOffersEmails:", cart.acceptToReceiveOffersEmails);
    if (cart.acceptToReceiveOffersEmails) {
      user.preferences.notifications.email.offers = true;
      //user.preferences.notifications = req.parameters.notificationPreferences;
      await user.save();
    }

    return res.status(200).json({ session, user }); // return the session with the redirect url, and the user, possibly with updated notifications
  } catch(err) {
    logger.error("Payment checkout session creation error:", err);
    audit({ req, subject: `Payment checkout session creation error: ${err.message}`, htmlContent: `Payment checkout session creation error: ${err.message}` });
    return res.status(400).json({ message: err.message });
  }
};

const paymentSuccess = async(req, res) => {
  const currency = config.currencies[config.currency];
  try {
    const session = await stripe.checkout.sessions.retrieve(req.query.session_id, {
      expand: ["customer", "payment_intent"], // include customer and payment details
    });
    console.log("**************** SESSION:", session);
    const customer = session.customer;
    console.log("**************** CUSTOMER:", customer);
    const shippingInfo = session.shipping_details;
    console.log("**************** SHIPPINGINFO:", shippingInfo);

    // const session = await stripe.checkout.sessions.retrieve(req.parameters.session_id);
    // const customer = session.customer ? await stripe.customers.retrieve(session.customer) : null;

    const items = await stripe.checkout.sessions.listLineItems(session.id);
    logger.info(`Session ${req.parameters.session_id} payment successful for ${items.data.length} product(s)${customer ? ` by customer ${customer.email}` : ""}`);
    audit({
      req,
      subject: `Payment successful for ${items.data.length} product(s)${customer ? ` by customer ${customer.email}` : ""}`,
      htmlContent: "Payment successful for product(s):\n" +
        items.data.map(item =>
          `
            - description: ${item.description}
            - quantity: ${item.quantity}
            - price discount: ${item.amount_discount}
            - price subtotal: ${item.amount_subtotal}
            - price tax: ${item.amount_tax}
            - price total: ${item.amount_total}
            - currency: ${currency}
          `
        ).join("\n")
      + (customer ? `
        By customer:
         - name: ${customer.name}
         - email: ${customer.email}
      `
      :
        ""
      )
    });
    res.redirect(config.payment.stripe.paymentSuccessUrlClient);
  } catch (err) { // should not happen...
    const message = "Error retrieving payment info on payment success callback";
    logger.error(message + ":", err.message);
    // TODO: audit or throw?
    throw new Error(message + ":" + err.message);
    // audit({
    //   req,
    //   subject: `Error retrieving payment info on payment success callback`,
    //   htmlContent: `
    //     Session id: ${session_id}\n
    //     Error: ${err.message}\n
    //   `,
    // });
    // res.redirect(config.payment.stripe.paymentSuccessUrlClient + `?error=${err.message}`);
  }
};

const paymentCancel = async(req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.parameters.session_id);
    const customer = session.customer ? await stripe.customers.retrieve(session.customer) : null;
    const items = await stripe.checkout.sessions.listLineItems(session.id);
    logger.info(`Payment canceled`);
    audit({
      req,
      subject: "Payment canceled",
      htmlContent: `
        Session id: ${req.parameters.session_id}\n
        Payment canceled\n
      `,
    });
    res.redirect(config.payment.stripe.paymentCancelUrlClient);
  } catch (err) { // should not happen...
    const message = "Error retrieving payment info on payment cancel callback";
    logger.error(message + ":", err.message);
    // TODO: audit or throw?
    throw new Error(message + ":" + err.message);
    // TODO: audit or throw?
    // audit({
    //   req,
    //   subject: `Error retrieving payment info on payment cancel callback`,
    //   htmlContent: `
    //     Session id: ${req.parameters.session_id}\n
    //     Error: ${ err.message}\n
    //   `,
    // });
    // res.redirect(config.payment.stripe.paymentCancelUrlClient + `?error=${err.message}`);
  }
};

module.exports = {
  getMode,
  createCheckoutSession,
  paymentSuccess,
  paymentCancel,
}