const stripe = require("stripe")(process.env.STRIPE_PERSONAL_SECRET);
const User = require("./userModal");

exports.handleWebhook = async (req, res) => {
    // console.log("in the webhook");
 try{
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    // console.log(webhookSecret);
    let event;
    let eventType;
    if (webhookSecret) {
      let signature = req.headers["stripe-signature"];
    //   console.log(signature, "signature");
    //   console.log("body" ,req.body);
      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          signature,
          webhookSecret
        );
        // console.log("event" , event);
      } catch (err) {
        // console.log(err);
        // console.log(`⚠️  Webhook signature verification failed.`);
        return res.status(400).json({
          status: "fail",
          message: "⚠️  Webhook signature verification failed.",
          data: err,
        });
      }
      eventType = event.type;
    } else {
      data = req.body.data;
      eventType = req.body.type;
    //   console.log("data" , data);
    }
    // console.log("event type" , eventType);
    details = event.data.object;
    // console.log("details", details);

    switch (eventType) {
        case "invoice.payment_succeeded":
            // console.log("in the update");
            if(details.status === 'paid'){
                const email = details.customer_email;
                let user = await User.findOne({ email: email });
                const priceid = details.lines.data[0].plan.id;
                let plan;
                if(priceid === process.env.BASIC_PRICE_ID_ONEDAY_TEST){
                    plan = 'Basic'
                }else if(priceid === process.env.PREMIUM_PRICE_ID_ONEDAY_TEST){
                    plan = 'Premium'
                }
                //subs details
                const subs_id = details.subscription;
                const subs = await stripe.subscriptions.retrieve(subs_id)
                const subs_status = subs.status
                const subs_started = new Date(subs.created * 1000);

                //save data to db
                // console.log(subs_id , subs, subs_status, subs_started , user);
                const result = await User.updateOne(
                    { _id: user._id },
                    {
                      $set: {
                        subs_id: "27373773763",
                        subs_started_at: "2023-12-12",
                        subs_status: "bhavya",
                        subs_plan: "bhavya"
                      },
                    }
                  );
                  // console.log(result);
            }
        break;
        default:
          return res.status(400).end();
    }
    res.sendStatus(200);
 }catch (err) {
    res.status(400).json({
      status: "fail",
      message: err,
    });
  }

}

