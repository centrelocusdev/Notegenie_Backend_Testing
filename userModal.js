const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const userSchema = mongoose.Schema({
  name: String,
  email: {
    type: String,
    unique: true,
  },
  password: String,
  profession: String,
  terms: Boolean,
  note_count: {
    type: Number,
    default: 0
  },
  customer_id: String,
  token: String,
  trial: Boolean,
  trial_started_at: Date,
  subs_id: String,
  subs_plan: String,
  subs_status: String,
  subs_started_at: Date,
})

// generating tokens for user
userSchema.methods.generateAuthToken = async function() {
	const token = jwt.sign({_id: this._id.toString()}, process.env.JWT_SECRET) //generating token
	this.token = token 
	await this.save()
	return token
}

userSchema.pre('save', async function (next) {
    try {
      if(this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 9)
    }
    next()
    } catch (err) {
        console.log(err)
    }
})

module.exports = mongoose.model('User', userSchema)