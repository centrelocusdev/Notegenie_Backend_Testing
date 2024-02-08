const router = require("express").Router();
const User = require("./userModal");
const User2F = require("./userModal2F");
const Subscriber = require("./SubscriberModal");
const bcrypt = require("bcrypt");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY_TEST);
const moment = require("moment");
const otpGenerator = require("otp-generator");
const nodemailer = require('nodemailer');

const OTP_CONFIG = {
  upperCaseAlphabets: false,
  specialChars: false,
};
const generateOTP = () => {
  const OTP = otpGenerator.generate(5, OTP_CONFIG);
  return OTP;
};

//get user by token
async function fetchUserByToken(token) {
  try {
    const user = await User.findOne({ token });
    return user;
  } catch (err) {
    throw new Error("Error fetching user by token: " + err.message);
  }
}

//get user by token
router.get("/user/:token", async (req, res) => {
  try {
    const token = req.params.token;
    const user = await User.findOne({ token });
    res.status(200).send({ status: "success", data: user });
  } catch (err) {
    res.status(400).send({ status: "error", message: err.message });
  }
});

//signup
router.post("/getOtp", async (req, res) => {
  try {
    const email = req.body.email;
    if (!email) {
      throw new Error("Email is required!");
    }
    const isUserExistInDb = await User.findOne({ email: req.body.email });
    if(isUserExistInDb){
      throw new Error("User is already Exists!");
    }
    const isUserExist = await User2F.findOne({ email: req.body.email });
    const otp = generateOTP();
    let user;
    if(isUserExist){
      isUserExist.otp = otp;
      user = isUserExist;
    }else{
      user = new User2F({
        email: email,
        otp: otp,
      });
    }
    
    await user.save();
    // console.log("user" , user);

    var transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });
    var mailOptions = {
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject:
        "Welcome to Notegenie - Your One-Time Password (OTP) for Sign Up",
      text: `Thank you for choosing Notegenie! Your One-Time Password (OTP) for signing up is: ${otp}. Please use this OTP to complete your registration process. \n\nIf you have any questions or need further assistance, feel free to contact our support team. \n\n\nBest regards, \nNotegenie Team`,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
        // User.findByIdAndDelete({_id: user._id}).then(() => {
          throw new Error("Invalid Email!");
        // })
      } else {
        // console.log("info" , info);
        res.status(200).send({status: "success", message: "Check email for otp!", data: user });
      }
    });
  } catch (err) {
    res.status(500).send({ status: "error", message: err.message });
  }
});
router.post("/verifyOtp", async (req, res) => {
  try{
    
  const otp = req.body.otp;
  const email = req.body.email;
  // console.log(token);
  if (!otp) {
    throw new Error("OTP is required!");
  }
  const user = await User2F.findOne({email: email});

  // console.log(user);
  if (!user) {
    throw new Error("Otp has been expired! Try Again");
  }

  // validate otp
  if (otp != user.otp) {
    // console.log(1);
    await User2F.findByIdAndDelete({_id: user._id});
    // console.log(2);
    throw new Error("OTP verification failed!");
  }

  await User2F.findByIdAndDelete({_id: user._id});

  res.status(200).send({status: "success", message: "otp verification successful!", data: user });
  }catch(err){
    res.status(500).send({ status: "error", message: err.message });
  }
});


router.post("/register", async (req, res) => {
  try {
    const { name, password, profession, terms, email } = req.body;
    if(!name || !email || !password || !profession || !terms){
      throw new Error("All the fields are required!");

    }

    const user = new User (req.body);
    await user.generateAuthToken();
    await user.save();

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
      res.status(200).send({ status: "success", data: user });
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
    res.send({ status: "success", message: "profile updated successfully" });
  } catch (err) {
    res.status(400).send({ status: "error", message: err.message });
  }
});

//logout
router.post("/logout", async (req, res) => {
  try {
    const user = req.user;
    user.tokens = user.tokens.filter((token) => token != req.token);
    await user.save();
    res.send({ status: "success", message: "logged out!" });
  } catch (err) {
    res.status(400).send({ status: "error", message: err.message });
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
    res.status(501).send({ status: "error", message: err.message });
  }
});

router.post("/reset-count-note", async (req, res) => {
  try {
    const user = await User.findById(req.body.id);
    if (!user) throw new Error("user not found");

    user.note_count = 0;
    await user.save();
  } catch (err) {
    res.status(500).send({ status: "error", message: err.message });
  }
});

router.post("/start-trial", async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    user.trial = true;
    user.trial_started_at = new Date();
    await user.save();
    res
      .status(200)
      .send({ status: "success", message: "Trial has been activated" });
  } catch (err) {
    res.status(500).send({ status: "error", message: err.message });
  }
});

router.post("/add-subscriber", async (req, res) => {
  try {
    const subscriber = new Subscriber(req.body);
    await subscriber.save();
    res
      .status(200)
      .send({ status: "success", message: "You have successfully subscribed" });
  } catch (err) {
    res.status(500).send({ status: "error", message: err.message });
  }
});


module.exports = router;
