'use strict'
const User = require("../models/userModel");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const upload = require("../multerConfig/multerConfig"); // import multer configuration
require('dotenv').config();
/**
 * @api {post} /api/register  Register new user
 * @apiName Register
 * @apiGroup User
 * @apiParam {String} username  Username
 * @apiParam {String} password  Password
 * @apiParam {String} email Email
 * @apiParam {String} first_name First name
 * @apiParam {String} last_name Last name
 * @apiParam {Date} birthdate Birthdate
 * @apiSuccess {String} message  Registration successful
 * @apiSuccess {String} token User token
 * @apiError {String} message Registration failed
 */
exports.register = async (req, res) => {
    console.log(req.body);
    const { username, password, email, first_name, last_name, birthdate, } = req.body;
    // field treatment, sample of treatment
    if (!username || !password || !email || !first_name || !last_name || !birthdate) {
        return res.status(400).send("you must provide all fields");
    }
    if (!password || password.length < 8) {
        return res.status(400).send("password must be at least 8 characters");
    }
    const passwordHash = await bcryptjs.hash(password, 10); // 10 salt rounds
    console.log("password hash", passwordHash);

    try {
        // enable unique index
        await User.collection.createIndex({username: 1}, {unique: true});
        // create new user on mongoDB
        const response = await User.create({
            username,
            password: passwordHash,
            email,
            first_name,
            last_name,
            birthdate
        });
        console.log("response", response);
    } catch (error) {
        console.log(error);
        if(error.code === 11000) {
            return res.status(400).send("user already exists");
        }
        throw error;
    }


    res.status(200).send("user registered");
}

/**
 * @api {post} /api/login  Login
 * @apiName Login
 * @apiGroup User
 * @apiParam {String} username  Username
 * @apiParam {String} password  Password
 * @apiSuccess {String} message  Login successful
 * @apiSuccess {String} token User token
 * @apiError {String} message Login failed
 */
exports.login = async (req, res) => {
    const { username, password } = req.body;
    //console.log("username", username, password);
    const user = await User.findOne({username}).lean(); //return a simple document json
    if (!user) {
        //user not found
        return res.status(400).send("user not found");

    }
    if( await bcryptjs.compare(password, user.password)) {
        //password match
        const token = jwt.sign({username: user.username}, process.env.SECRET_KEY, {expiresIn: '1d'});
        return res.status(200).send({token: token});
    }else{
        //password not match
        return res.status(400).send("user/password not match");
    }
}

/**
 * @api {put} /api/change-password  Change password
 * @apiName ChangePassword
 * @apiGroup User
 * @apiHeader {String} token User token
 * @apiParam {String} oldPassword  Old password
 * @apiParam {String} newPassword  New password
 * @apiSuccess {String} message  Password changed
 * @apiError {String} message Password not match
 */
exports.changePassword = async (req, res) => {
    const token = req.headers['token'];
    //const { oldPassword, newPassword} = req.body;
    console.log("token", token, oldPassword);
    if (!token || !oldPassword || !newPassword) {
        return res.status(400).send("token, old password and new password are required");
    }
    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const user = await User.findOne({username: decoded.username}).lean();
        if (!user) {
            return res.status(400).send("user not found");
        }
        if (await bcryptjs.compare(oldPassword, user.password)) {
            const passwordHash = await bcryptjs.hash(newPassword, 10);
            await User.updateOne({username: user.username}, {password: passwordHash});
            return res.status(200).send("password changed");
        } else {
            return res.status(400).send("old password not match");
        }
    } catch (error) {
        console.log(error);
        return res.status(400).send("invalid token");
    }
}


/**
 * @api {put} /api/user/:id/photo  Update profile picture
 * @apiName UpdateProfilePicture
 * @apiGroup User
 * @apiHeader {String} token User token
 * @apiParam {number} id User ID
 * @apiParam {File} photo Profile picture
 * @apiSuccess {String} message  Profile picture updated
 * @apiError {String} message Error updating profile picture
 */
exports.updateProfilePicture = async (req, res) => {
    const token = req.headers['token'];
    if (!token) {
        return res.status(400).send("token is required");
    }
    const { id } = req.params;
  
    try {
      // Verify if a file was uploaded
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded." });
      }
  
      const imagePath = req.file.path; // file path to save the image in the server
  
      // update the path in the database with the new image path
      const user = await User.findByIdAndUpdate(
        id,
        { profilePicture: imagePath },
        { new: true }
      );
  
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }
  
      res.status(200).json({
        message: "Profile picture updated.",
        user,
      });
    } catch (err) {
      res.status(500).json({ message: "Error updating profile picture.", error: err.message });
    }
  };


/**
 * @api {delete} /api/user/:id  Delete user
 * @apiName DeleteUser
 * @apiGroup User
 * @apiParam {String} id  User ID
 * @apiHeader {String} token  User token
 * @apiSuccess {String} message  User deleted
 * @apiError {String} message Error deleting user
 */
exports.deleteUser = async (req, res) => {
    const token = req.headers['token'];
    if (!token) {
        return res.status(400).send("token is required");
    }
    const { id } = req.params;
  
    try {
      // Verify if the user is deleting the own account
      if (req.user._id !== id) {
        return res.status(403).json({ message: "Acess denied." });
      }
  
      const user = await User.findByIdAndDelete(id);
  
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }
  
      res.status(200).json({ message: "User deleted successfully." });
    } catch (err) {
      res.status(500).json({ message: "Error deleting user.", error: err.message, "id": id,});
    }
  };

/**
 * @api {put} /api/user/:id  Update user
 * @apiName UpdateUser
 * @apiGroup User
 * @apiParam {String} id  User ID
 * @apiHeader {String} token  User token
 * @apiParam {String} [first_name]  First name
 * @apiParam {String} [last_name]  Last name
 * @apiParam {String} [email]  Email
 * @apiSuccess {String} message  User updated
 * @apiError {String} message Error updating user
 */
exports.updateUser = async (req, res) => {
  const token = req.headers['token'];
  if (!token) {
      return res.status(400).send("token is required");
  }
  const { id } = req.params;
  const updates = req.body;

  try {
    // Verify if the authenticated user is updating their own profile
    if (req.user.id !== id) {
      return res.status(403).json({ message: "Acess denied." });
    }

    const user = await User.findByIdAndUpdate(id, updates, {
      new: true, // Return the updated document
      runValidators: true, // validate the update
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json({
      message: "Users updated successfully.",
      user,
    });
  } catch (err) {
    res.status(500).json({ message: "Error updating user.", error: err.message });
  }
};
