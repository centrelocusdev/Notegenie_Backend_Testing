require('dotenv').config() 
require('./connection')
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const app = express()
const userRouter = require('./userRoutes')
const templateRoutes = require('./templateRoutes')
const chatgptRoutes = require('./chatgptRoutes')
const stripeRoutes = require('./stripeRoutes')
const stripeController =require('./stripeController');

app.use(cors())
app.post('/webhook', express.raw({ type: 'application/json' }),stripeController.handleWebhook);
app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json()) 
app.use(userRouter)
app.use(templateRoutes)
app.use(chatgptRoutes)
app.use(stripeRoutes)

app.listen(process.env.PORT, () => {
  console.log(`server running at http://127.0.0.1:${process.env.PORT}`)
})