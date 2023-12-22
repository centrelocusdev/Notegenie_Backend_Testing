const mongoose = require('mongoose')

const templateModal = mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectID,
  name: String,
  description: String,
  profession: String,
  type: {
    type: String,
    default: 'predefined'
  }
})

module.exports = mongoose.model('Template', templateModal)