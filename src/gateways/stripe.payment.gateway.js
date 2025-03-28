/**
 * Stripe payment gateway implementation
 */

const Stripe = require("stripe");
const AbstractPaymentGateway = require("./Abstract.payment.gateway");
const User = require("../models/user.model");
const { logger } = require("../controllers/logger.controller");
const { audit } = require("../helpers/messaging");
const { formatMoney, nextError } = require("../helpers/misc");
const i18n = require("../middlewares/i18n");
const config = require("../config");


class StripeGateway extends AbstractPaymentGateway {
  constructor(config) {
    super();
    this.config = config;
    //console.log("StripeGateway received config:", JSON.stringify(config.app.api, null, 2));
  }

  init() {
    //console.log(1);
    const apiKey = this.config.mode.stripelive
      ? process.env.STRIPE_API_KEY_LIVE
      : process.env.STRIPE_API_KEY_TEST
    ;
    //console.log(2);

    if (!apiKey) {
      //console.log(3);
      throw new Error(i18n.t("Stripe API key not configured for current environment"));
    }

    //try { // TODO: re-enable try/catch, when understand how to test catch!
      //console.log(4);
      this.client = new Stripe(apiKey, {
        apiVersion: "2023-08-16",
        maxNetworkRetries: 2,
        appInfo: {
          name: config.app.api.name || "DefaultAPI",
          version: String(config.app.api.version || "1.0.0"), // Ensure string
        },
      });
      //console.log(5);
    // } catch (err) {
    //   //console.log(6);
    //   throw new Error(i18n.t("Error initializing Stripe interface") + ": " + err.message);
    // }
  }

  async createCheckoutSession(req, res, next) {
    if (!this.client) {
      return res.status(400).json({ message: req.t("Please call init") });
    }
    //console.log(8);
    const cart = req.parameters.cart; // cart is an object with items array
    
    if (!cart || !cart.items || cart.items.length === 0) {
      //console.log(9, cart);
      return res.status(400).json({ message: req.t("Empty cart") });
    }
    //console.log(10);
    //logger.info("**************** CART:", cart);
  
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
    //console.log(3, req);
    let user, stripeCustomerId;
    if (req.userId) { // user is authenticated
      //console.log(3);
      user = await User.findById(req.userId);
      //console.log("3a:", user);
      if (!user) {
        return res.status(403).json({ message: req.t("User with id {{userId}} not found", { userId: req.userId }) });
      }
      //console.log(4);
      try {
        if (user.stripeCustomerId) { // user already has a customer id, she did buy already: use it
          //console.log(6);
          stripeCustomerId = user.stripeCustomerId;
        } else {
          //console.log(7);
          // user does not have a customer id, she did never buy before: create a customer
          const customer = await this.client.customers.create({
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            metadata: {
              userId: req.userId, // optional, to map our userId with the Stripe customer
            },
          });
          //console.log(20, customer);
          stripeCustomerId = customer.id;
        }
        //console.log(0);
        user.stripeCustomerId = stripeCustomerId;
        await user.save(); // save customer id to user
        logger.info(`Payment customer created`);
        //console.log(1);
      } catch (err) {
        //console.log(21, err.message);
        logger.error("Payment checkout customer creation error:", err);
        audit({ req, mode: "error", subject: `Payment checkout customer creation error`, htmlContent: `Payment checkout customer creation error for user ${user.firstName} ${user.lastName} (email: ${user.email}):\n${err.message}` });
        return res.status(400).json({ message: err.message });
      }
    } else {
      // user is not authenticated: simply do not pass a customer to stripe.checkout.sessions.create
    }
  
    // create session
    try {
      //console.log(31);
      const session = await this.client.checkout.sessions.create({
        mode: "payment",
        line_items,
        shipping_address_collection: { // ask stripe to collect customer"s shipping address
          allowed_countries: config.payment.gateways.stripe.checkout.shipping_allowed_countries,
        },
        ...(stripeCustomerId && { customer: stripeCustomerId }), // pass a customer if user has a stripeCustomerId
        success_url: `${config.payment.gateways.stripe.paymentSuccessUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${config.payment.gateways.stripe.paymentCancelUrl}?session_id={CHECKOUT_SESSION_ID}`,
        metadata: { // pass custom metadata here
          deliveryCode: cart.deliveryCode,
          isGift: cart.isGift,
          userId: user?.id, // user id
        },
      });
      //console.log(32, session);
      if (!session?.url) { // incomplete response, we miss the redirect url
        //console.log(33, session);
        throw new Error(req.t("No session url"));
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
  
      // if user did accept to receive offers emails, set it in user"s prefereces
      //console.log(35, "user:", user, "cart:", cart);
      if (user && cart.acceptToReceiveOffersEmails) {
        user.preferences.notifications.email.offers = true;
        //console.log("Before save:", user);
        await user.save(); // save preferences to user
        //console.log("After save called");
      }
  
      return res.status(200).json({ session, user }); // return the session with the redirect url, and the user, possibly with updated notifications
    } catch (err) {
      //console.log(33, err.message);
      audit({req, mode: "error", subject: `Payment checkout session creation error`, htmlContent: `Payment checkout session creation error for user ${user.firstName} ${user.lastName} (email: ${user.email}):\n${err.message}` });
      return nextError(next, req.t("Payment checkout session creation error: {{err}}", { err: err.message }), 500, err.stack);
    }
  }
  
  async paymentSuccess(req, res, next) {
    //console.log("**************** paymentSuccess");
    if (!this.client) {
      //console.log("**************** paymentSuccess", !this.client);
      return res.status(400).json({ message: req.t("Please call init") });
    }
    //const currency = config.currencies[config.currency];
    let customer;
    try {
      //console.log("**************** paymentSuccess BENE", req.query.session_id);
      const session = await this.client.checkout.sessions.retrieve(req.query.session_id, {
        expand: ["customer", "payment_intent"], // include customer and payment details
      });
      //console.log("**************** SESSION:", session); // eslint-disable-line no-console
      customer = session.customer;
      //console.log("**************** CUSTOMER:", customer); // eslint-disable-line no-console
      const shippingInfo = session.shipping_details;
      //console.log("**************** SHIPPINGINFO:", shippingInfo); // eslint-disable-line no-console
  
      // const session = await stripe.checkout.sessions.retrieve(req.parameters.session_id);
      // const customer = session.customer ? await stripe.customers.retrieve(session.customer) : null;
  
      const items = await this.client.checkout.sessions.listLineItems(session.id);
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
          <p>Delivery code: ${session.metadata.deliveryCode}</p>
          <p>Is a gift: ${session.metadata.isGift ? "true" : "false"}</p>
        ` :
          "(no shipping info)"
        )
      });
      //console.log("session.metadata.isGift", session.metadata.isGift);
      res.redirect(config.payment.gateways.stripe.paymentSuccessUrlClient);
    } catch (err) { // should not happen...
      audit({req, mode: "error", subject: `Error retrieving payment info on payment success`, htmlContent: `Payment checkout session creation error for customer ${customer?.name} (email: ${customer?.email}):\n${err.message}` });
      return nextError(next, req.t("Error retrieving payment info on payment success callback: {{err}}"), 500, err.stack);
    }
  }
  
  async paymentCancel(req, res, next) {
    if (!this.client) {
      //console.log(1);
      return res.status(400).json({ message: req.t("Please call init") });
    }
    let customer;
    try {
      //console.log(2);
      const session = await this.client.checkout.sessions.retrieve(req.parameters.session_id);
      //console.log(3);
      customer = session.customer ? await this.client.customers.retrieve(session.customer) : null;
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
      res.redirect(config.payment.gateways.stripe.paymentCancelUrlClient);
    } catch (err) { // should not happen...
      //console.log(9, err.message);
      audit({req, mode: "error", subject: `Error retrieving payment info on payment cancel`, htmlContent: `Payment checkout session creation error for customer ${customer?.name} (email: ${customer?.email}):\n${err.message}` });
      return nextError(next, req.t("Error retrieving payment info on payment cancel callback: {{err}}"), 500, err.stack);
    }
  }
  
}

module.exports = StripeGateway;
