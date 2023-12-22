const mongoose = require('mongoose')
mongoose.set('strictQuery', true)

mongoose.connect(process.env.MONGODB_URI, 
    {
    useNewUrlParser: true,
    useUnifiedTopology: true}
    )
    .then(res => console.log("connected to db"))
    .catch(err => console.log("couldn't connect to db, err: ", err.message))