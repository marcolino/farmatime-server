/**
 * Stripe payment controller implementation
 */

const stripeModule = require("stripe");
const User = require("../models/user.model");
const { logger } = require("../controllers/logger.controller");
const { audit } = require("../helpers/messaging");
const { formatMoney } = require("../helpers/misc");
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
    audit({req, mode: "action", subject: `Payment checkout session created`, htmlContent: `Payment checkout session created for user ${user.firstName} ${user.lastName} (email: ${user.email})`});

    // if user did accept to receive offers emails, set it in user's prefereces
    if (cart.acceptToReceiveOffersEmails) {
      user.preferences.notifications.email.offers = true;
      await user.save();
    }

    return res.status(200).json({ session, user }); // return the session with the redirect url, and the user, possibly with updated notifications
  } catch(err) {
    logger.error("Payment checkout session creation error:", err);
    audit({req, mode: "error", subject: `Payment checkout session creation error`, htmlContent: `Payment checkout session creation error for user ${user.firstName} ${user.lastName} (email: ${user.email}):\n${err.message}` });
    return res.status(400).json({ message: err.message });
  }
};

const paymentSuccess = async(req, res) => {
  //const currency = config.currencies[config.currency];
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
    logger.info(`Session ${req.parameters.session_id} payment successful for ${items.data.length} product${items.data.length > 1 ? "s" : ""}${customer ? ` by customer ${customer.email}` : ""}`);
    audit({req, mode: "action", subject: `Payment successful`, htmlContent: `Payment successful for ${items.data.length} product${items.data.length > 1 ? "s" : ""}:\n` +
        items.data.map(item =>
          `<ul>
            <li>description: ${item.description}</li>
            <li>quantity: ${item.quantity}</li>
            <li>price discount: ${formatMoney(item.amount_discount)}</li>
            <li>price subtotal: ${formatMoney(item.amount_subtotal)}</li>
            <li>price tax: ${formatMoney(item.amount_tax)}</li>
            <li>price total: ${formatMoney(item.amount_total)}</li>
          </ul>`
        ).join("\n")
      + (customer ? `
        By customer:
        <ul>
          <li>name: ${customer.name}</li>
          <li>email: ${customer.email}</li>
        </ul>
      `
     :
        "(no customer info)"
      )
    });
    res.redirect(config.payment.stripe.paymentSuccessUrlClient);
  } catch (err) { // should not happen...
    const message = "Error retrieving payment info on payment success callback";
    logger.error(message + ":", err.message);
    throw new Error(message + ":" + err.message);
  }
};

const paymentCancel = async(req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.parameters.session_id);
    const customer = session.customer ? await stripe.customers.retrieve(session.customer) : null;
    const items = await stripe.checkout.sessions.listLineItems(session.id);
    logger.info(`Payment canceled`);
    audit({req, mode: "action", subject: "Payment canceled", htmlContent: `
        Session id: ${req.parameters.session_id}\n
        Payment canceled\n
      `
      + (customer ? `
        By customer:
         <li>name: ${customer.name}
         <li>email: ${customer.email}
      `
     :
        "(no customer info)"
      )
    });
    res.redirect(config.payment.stripe.paymentCancelUrlClient);
  } catch (err) { // should not happen...
    const message = "Error retrieving payment info on payment cancel callback";
    logger.error(message + ":", err.message);
    throw new Error(message + ":" + err.message);
  }
};

module.exports = {
  getMode,
  createCheckoutSession,
  paymentSuccess,
  paymentCancel,
}