const express = require("express");
const path = require("path");
require('dotenv').config();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./public/swagger/swagger.json');


const app = express();
let port=process.env.PORT || 9000;
//let uri=process.env.MONGO_URI;

//database connection
const uri = process.env.URI;
mongoose.Promise= global.Promise;
mongoose.connect(uri).//, {useNewUrlParser: true, useUnifiedTopology: true}).
then(() => {
    console.log("Connected to MongoDB");
}).catch(err => {
    console.log('error connecting to MongoDB',err);
});

//middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));


//routes
app.use('/', express.static(path.join(__dirname, 'public')));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/api-docjs', express.static('./public/api-docjs'));
app.use("/api", require("./routes/userRoutes"));


app.listen(port, () => {
    console.log("Server running por:"+port);
})

