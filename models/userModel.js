'use strict';
//database schema
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    username: {type: String, required: true, unique: true},
    password: {type: String, required: true},
    email: {type: String, required: true, unique: true},
    first_name: {type: String, required: true},
    last_name: {type: String, required: true},
    birthdate: {type: Date, required: true},
    register_date: {type: Date, default: Date.now},
    last_login_date: {type: Date, default: Date.now},
    status: {type: String, default: 'active'},
    profilePicture: {type: String}, // photo path in the server

},{collection:'users'});

const User= mongoose.model("User", userSchema);
module.exports = User;