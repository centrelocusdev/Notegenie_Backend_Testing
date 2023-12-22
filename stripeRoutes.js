const router = require("express").Router();
const stripe = require("stripe")(process.env.STRIPE_PERSONAL_SECRET);
const User = require("./userModal");

router.get("/create-price", async (req,res) => {
  try {
    const plan = 'Basic'
    const product = await stripe.products.create({
      name: `NoteGenie ${plan}`,
    });

    if (product) {
      const price = await stripe.prices.create({
        unit_amount: (10.99 * 100),
        currency: "usd",
        product: product.id,
        recurring: { interval: "day" },
      });
      // console.log(price.id, price.product);
    }
    res.status(200).json({
      priceId: price.id,
      productId: price.product
    })
  } catch (err) {
    console.log(err);
  }
})

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

    let priceId;
    if (plan == "basic") priceId = process.env.BASIC_PRICE_ID_ONEDAY_TEST;
    else if (plan == "premium") priceId = process.env.PREMIUM_PRICE_ID_ONEDAY_TEST;
    else return;

    const subs = await stripe.subscriptions.create({
      customer: user.customer_id,
      items: [
        {
          price: priceId,
        },
      ],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent']
    });
    // console.log(subs);
    res.status(200).send({
      status: "success",
      message: "subscription created successfully",
      data: {
        subsId: subs.id,
        clientSecret: subs.latest_invoice.payment_intent.client_secret,
      }
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

router.post("/cancel-subscription", async (req, res) => {
  try {
    const { userId} = req.body
    const user = await User.findById(userId)
    const subs = await stripe.subscriptions.cancel(user.subs_id);

    user.subs_status = subs.status
    await user.save()
    res.status(200).send({ status: "success", message: 'Your subscription has been canceled'});
  } catch (err) {
    res.status(500).send({ status: "error", message: err.message });
  }
});

router.post('/update-subs-status', async (req, res) => {
  try {
    const { userId, plan, subsId } = req.body
    const user = await User.findById(userId)
    
    const subs = await stripe.subscriptions.retrieve(subsId)

    user.subs_id = subs.id
    user.subs_plan = plan
    user.subs_status = subs.status
    user.trial = false;
    user.subs_started_at = new Date(subs.created * 1000)
    await user.save();
    res.status(200).send({ status: "success", message: "user subscription updated" });
  } catch (err) {
    res.status(500).send({status: 'error', message: err.message });
  } 
})


router.post("/attach-payment-method", async (req, res) => {
  try {
    const { userId, paymentMethodId } = req.body
    const user = await User.findById(userId)
    await stripe.paymentMethods.attach(paymentMethodId, { customer: user.customer_id });

    await stripe.customers.update(user.customer_id, {
    invoice_settings: {
      default_payment_method: paymentMethodId
    }
   })

   res.status(200).send({
    status: "success",
    message: "payment method has been attached successfully",
  });
  } catch (err) {
    res.status(500).send({ status: "error", message: err.message });
  }
})

const cancelSubs = async () => {
  const subs = await stripe.subscriptions.retrieve('sub_1NJCBMHDuMBRsT9C9i233VjA')
  // console.log(subs)
} 

router.post("/retrieve-sub", async (req, res) => {
  const id = req.body.id;
  const subs = await stripe.subscriptions.retrieve(id);
  res.status(200).json({
    status: "success",
    data: subs
  })
  
})
// cancelSubs()



module.exports = router;
