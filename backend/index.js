require('dotenv/config');
const express = require("express");
const mongoose = require("mongoose");
const app = express();
const cors = require('cors');
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



const port = process.env.PORT || 4000;

app.listen(port, function () {
    console.log(`Server started on port ${port}.`);
});