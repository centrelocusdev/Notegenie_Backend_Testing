const router = require("express").Router();
const User = require("./userModal");
const Subscriber = require("./SubscriberModal")
const bcrypt = require("bcrypt");
const stripe = require("stripe")(process.env.STRIPE_PERSONAL_SECRET);
const moment = require("moment");

//get user by token
router.get("/user/:token", async (req, res) => {
  try {
    const token = req.params.token;
    const user = await User.findOne({ token });
    res.status(200).send({status: 'success', data: user});
  } catch (err) {
    res.status(400).send({status: 'error', message: err.message });
  }
});

//signup
router.post("/register", async (req, res) => {
  try {
    const user = new User(req.body);
    await user.generateAuthToken();

    const customer = await stripe.customers.create({
      name: user.name,
      email: user.email,
    });
    user.customer_id = customer.id;

    if (!customer) {
      throw new Error("something went wrong");
    }

    await user.save();

    res.status(200).send({ status: "success", data: user });
  } catch (err) {
    res.status(400).send({ status: "error", message: err.message });
  }
});

//login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) throw new Error("User not found, please try again");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error("Incorrect password, please try again");
    else {
      await user.generateAuthToken();
      res.status(200).send({ status: "success", data: user});
    }
  } catch (err) {
    res.status(400).send({ status: "error", message: err.message });
  }
});

//update
router.post("/update-profile", async (req, res) => {
  try {
    const { id } = req.query;
    const user = await User.findById(id);
    if (!user) throw new Error("user not found");

    const fieldsToBeUpdated = ["password", "profession"];
    const fields = Object.keys(req.body);

    fieldsToBeUpdated.map((f, i) => {
      if (fields.includes(fieldsToBeUpdated[i])) {
        user[f] = req.body[f];
      }
    });
    await user.save();
    res.send({status: 'success', message: 'profile updated successfully'});
  } catch (err) {
    res.status(400).send({status: 'error', message: err.message });
  }
});

//logout
router.post("/logout", async (req, res) => {
  try {
    const user = req.user;
    user.tokens = user.tokens.filter((token) => token != req.token);
    await user.save();
    res.send({status: 'success', message: 'logged out!'});
  } catch (err) {
    res.status(400).send({status: 'error', message: err.message });
  }
});

//delete account permenenty
router.post("/delete-account", async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    res.send({ msg: "Account deleted successfully" });
  } catch (err) {
    res.status(400).send({ err: err.message });
  }
});

router.post("/count-note", async (req, res) => {
  try {
    const { id } = req.query;
    const user = await User.findById(id);
    if (!user) throw new Error("user not found");

    user.note_count += 1;
    await user.save();
  } catch (err) {
    res.status(501).send({status: 'error', message: err.message });
  }
});

router.post("/reset-count-note", async (req, res) => {
  try {
    const user = await User.findById(req.body.id);
    if (!user) throw new Error("user not found");

    user.note_count = 0;
    await user.save();
  } catch (err) {
    res.status(500).send({status: 'error', message: err.message });
  }
});

router.post("/start-trial", async (req, res) => {
  try {
    const { userId } = req.body
    const user = await User.findById(userId)
    user.trial = true
    user.trial_started_at = new Date() 
    await user.save()
    res.status(200).send({ status: "success", message: "Trial has been activated" });
  } catch (err) {
    res.status(500).send({status: 'error', message: err.message });
  }
})

router.post('/add-subscriber', async (req, res) => {
  try {
    const subscriber = new Subscriber(req.body)
    await subscriber.save()
    res.status(200).send({ status: "success", message: "You have successfully subscribed" });
  } catch (err) {
    res.status(500).send({status: 'error', message: err.message });
  }
})

module.exports = router;
