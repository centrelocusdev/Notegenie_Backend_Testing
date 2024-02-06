const router = require("express").Router();
const stripe = require("stripe")(process.env.STRIPE_PERSONAL_SECRET);
const User = require("./userModal");
const axios = require("axios");
router.get("/create-price", async (req, res) => {
  try {
    const plan = "Basic";
    const product = await stripe.products.create({
      name: `NoteGenie ${plan}`,
    });
    if (product) {
      const price = await stripe.prices.create({
        unit_amount: 10.99 * 100,
        currency: "usd",
        product: product.id,
        recurring: { interval: "day" },
      });
      // console.log(price.id, price.product);
    }
    res.status(200).json({
      priceId: price.id,
      productId: price.product,
    });
  } catch (err) {
    console.log(err);
  }
});

// createPrice()

router.post("/create-payment-intent", async (req, res) => {
  try {
    // console.log("in the payment intent");

    const { amount, currency, description, customer, payment_method } =
      req.body;
    // console.log("body" , req.body);
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      description,
      customer,
      payment_method,
      payment_method_types: ["card"],
    });
    // console.log("payment intent",paymentIntent)
    const { status, client_secret, id } = paymentIntent;
    res.send({
      status: "success",
      data: {
        status,
        client_secret,
        id,
      },
    });
  } catch (err) {
    res.status(500).send({ status: "error", message: err.message });
  }
});

router.post("/create-subscription", async (req, res) => {
  try {
    const { userId, plan } = req.body;
    // console.log(userId, plan);
    const user = await User.findById(userId);
    if (user && user.subs_status && user.subs_status === "active") {
      const subs = await cancelSubscription(user);
      user.subs_status = subs.status;
      await user.save();
    }

    let priceId;
    if (plan == "basic") priceId = process.env.BASIC_PRICE_ID_ONEDAY_TEST;
    else if (plan == "premium")
      priceId = process.env.PREMIUM_PRICE_ID_ONEDAY_TEST;
    else return;

    const subs = await stripe.subscriptions.create({
      customer: user.customer_id,
      items: [
        {
          price: priceId,
        },
      ],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
    });
    // console.log(subs);
    res.status(200).send({
      status: "success",
      message: "subscription created successfully",
      data: {
        subsId: subs.id,
        clientSecret: subs.latest_invoice.payment_intent.client_secret,
      },
    });
  } catch (err) {
    res.status(500).send({ status: "error", message: err.message });
  }
});

router.post("/subscription", async (req, res) => {
  try {
    const { subsId } = req.body;
    const subs = await stripe.subscriptions.retrieve(subsId);
    res.status(200).send({ status: "success", data: subs });
  } catch (err) {
    res.status(500).send({ status: "error", message: err.message });
  }
});

async function cancelSubscription(user) {
  try {
    const subs = await stripe.subscriptions.cancel(user.subs_id);
    return subs;
  } catch (err) {
    console.log(err);
  }
}
router.post("/cancel-subscription", async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    const subs = await cancelSubscription(user);
    user.subs_status = subs.status;
    await user.save();
    res
      .status(200)
      .send({
        status: "success",
        message: "Your subscription has been canceled",
      });
  } catch (err) {
    res.status(500).send({ status: "error", message: err.message });
  }
});

router.post("/update-subs-status", async (req, res) => {
  try {
    const { userId, plan, subsId } = req.body;
    const user = await User.findById(userId);

    const subs = await stripe.subscriptions.retrieve(subsId);

    user.subs_id = subs.id;
    user.subs_plan = plan;
    user.subs_status = subs.status;
    user.trial = false;
    user.subs_started_at = new Date(subs.created * 1000);
    user.note_count = 0;
    await user.save();
    res
      .status(200)
      .send({ status: "success", message: "user subscription updated" });
  } catch (err) {
    res.status(500).send({ status: "error", message: err.message });
  }
});

router.post("/attach-payment-method", async (req, res) => {
  try {
    const { userId, paymentMethodId } = req.body;
    const user = await User.findById(userId);
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: user.customer_id,
    });

    await stripe.customers.update(user.customer_id, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    res.status(200).send({
      status: "success",
      message: "payment method has been attached successfully",
    });
  } catch (err) {
    res.status(500).send({ status: "error", message: err.message });
  }
});

const cancelSubs = async () => {
  const subs = await stripe.subscriptions.retrieve(
    "sub_1NJCBMHDuMBRsT9C9i233VjA"
  );
  // console.log(subs)
};

router.post("/retrieve-sub", async (req, res) => {
  const id = req.body.id;
  const subs = await stripe.subscriptions.retrieve(id);
  res.status(200).json({
    status: "success",
    data: subs,
  });
});

//get user by token
async function fetchUserByToken(token) {
  try {
    const user = await User.findOne({ token });
    return user;
  } catch (err) {
    throw new Error("Error fetching user by token: " + err.message);
  }
}

router.post("/update-detailsof-default-paymentmethod/:token", async (req, res) => {
  try {
    const token = req.params.token;
    if (!token) {
      throw new Error("Authorization failed!");
    }
    const user = await fetchUserByToken(token);
    // console.log(user);
    if (!user) {
      throw new Error("User not found!");
    }
    // const billing_details = req.body.billing_details;
    const card = req.body.card;
    const subs_id = user.subs_id;
    const subscription = await stripe.subscriptions.retrieve(subs_id);
    const defaultPaymentMethodId = subscription.default_payment_method;
    // console.log("de" ,defaultPaymentMethodId);
    //update payment methods details
    const paymentMethod = await stripe.paymentMethods.update(
      defaultPaymentMethodId,
      {
        // billing_details: billing_details,
        card: card,
      }
    );
    // console.log("payment method" , paymentMethod);

    res.status(200).json({
      status: "success",
      message: "Card Details have been updated successfully!"
      
    });
  } catch (err) {
    console.log(err);
    res.status(500).send({ status: "error", message: err.message });
  }
});

router.get('/create-checkout-session/:token' , async (req,res) => {
  try{
    const token = req.params.token;
    // console.log(token);
    if (!token) {
      throw new Error("Authorization failed!");
    }
    const user = await fetchUserByToken(token);
    // console.log(user);
    if (!user) {
      throw new Error("User not found!");
    }
    const customer_id = user.customer_id;

    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      currency: 'usd',
      customer: customer_id,
      success_url: 'https://notegenie.vercel.app/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'http://notegenie.vercel.app/cancel',
    });
    // console.log("session" , session);
    res.status(200).json({
      status: "success",
      message: "Checkout session has been created successfully!",
      session: session
    });

  }catch(err){
    console.log(err);
    res.status(500).send({ status: "error", message: err.message });
  }
})
router.post('/attatchPaymentMethodToSubs/:token' , async(req, res) => {
  try{
    const token = req.params.token;
    if (!token) {
      throw new Error("Authorization failed!");
    }
    const user = await fetchUserByToken(token);
    // console.log(user);
    if (!user) {
      throw new Error("User not found!");
    }
    const subscription_id = user.subs_id;
    // console.log("checkout id" ,req.body.CHECKOUT_SESSION_ID )
    const CHECKOUT_SESSION_ID = req.body.CHECKOUT_SESSION_ID;
    //retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(
      CHECKOUT_SESSION_ID
    );

    console.log("session" ,session);
    //retreive the setup intent id
    const setup_intent_id = session.setup_intent;

    // retrieve the setup intent
    const setupIntent = await stripe.setupIntents.retrieve(setup_intent_id);

    console.log("setup intent object" , setupIntent);
    // collect payment method id from here and attatch to the required subscription

    // console.log("setup intent" , setupIntent);
    const payment_method_id = setupIntent.payment_method;

    // attatching it to the subscription
    const subscription = await stripe.subscriptions.update(subscription_id, {
      default_payment_method: payment_method_id,
    });

    res.status(200).json({
      status: "success",
      message: "Payment method has been attatched successfully!",
      subscription
    });

  }catch(err){
    console.log(err);
    res.status(500).send({ status: "error", message: err.message });
  }
})

router.get('/cardDetails/:token' , async(req, res) => {
  try{
    const token = req.params.token;
    if (!token) {
      throw new Error("Authorization failed!");
    }
    const user = await fetchUserByToken(token);
    // console.log(user);
    if (!user) {
      throw new Error("User not found!");
    }
    const subs_id = user.subs_id;

    const subscription = await stripe.subscriptions.retrieve(
      subs_id
    );
    const payment_method_id = subscription.default_payment_method;

    const paymentMethod = await stripe.paymentMethods.retrieve(
      payment_method_id
    );
    const card = {
      "last4": paymentMethod.card.last4,
      "exp_month": paymentMethod.card.exp_month,
      "exp_year": paymentMethod.card.exp_year,
    };
    res.status(200).json({
      status: "success",
      card: card
    });

  }catch(err){
    console.log(err);
    res.status(500).send({ status: "error", message: err.message });
  }
})

module.exports = router;
