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
 * @api {post} /login Login user
 * @apiName Login
 * @apiGroup User
 * @apiParam {String} username username
 * @apiParam {String} password password
 * @apiSuccess {String} token JSON Web Token
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InVzZXIiLCJpYXQiOjE2Mjg5MjUxMDMsImV4cCI6MTYyODkzNjcwM30.l0uF7V0JZ0nQj7X9j9rJhQ"
 *     }
 * @apiError UserNotFound The <code>username</code> was not found.
 * @apiErrorExample {json} Error-Response:
 *     HTTP/1.1 404 Not Found
 *     {
 *       "error": "User not found"
 *     }
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
 * @api {put} /change-password Change user password
 * @apiName ChangePassword
 * @apiGroup User
 * @apiParam {String} token JSON Web Token
 * @apiParam {String} oldPassword Current password of the user
 * @apiParam {String} newPassword New password to be set for the user
 * @apiSuccess {String} message Password changed successfully
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "message": "Password changed successfully"
 *     }
 * @apiError InvalidToken The <code>token</code> was not valid.
 * @apiErrorExample {json} Error-Response:
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "error": "Invalid token"
 *     }
 * @apiError UserNotFound The <code>username</code> was not found.
 * @apiErrorExample {json} Error-Response:
 *     HTTP/1.1 404 Not Found
 *     {
 *       "error": "User not found"
 *     }
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
 * @api {put} /profile-picture Update user profile picture
 * @apiName UpdateProfilePicture
 * @apiGroup User
 * @apiParam {String} token JSON Web Token
 * @apiParam {File} image Profile picture of the user
 * @apiSuccess {String} message Profile picture updated.
 * @apiSuccess {Object} user User with the profile picture
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "message": "Profile picture updated.",
 *       "user": {
 *         "username": "user",
 *         "profilePicture": "uploads/1654956511158-123456789.jpg"
 *       }
 *     }
 * @apiError InvalidToken The <code>token</code> was not valid.
 * @apiErrorExample {json} Error-Response:
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "error": "Invalid token"
 *     }
 * @apiError UserNotFound The <code>username</code> was not found.
 * @apiErrorExample {json} Error-Response:
 *     HTTP/1.1 404 Not Found
 *     {
 *       "error": "User not found"
 *     }
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
 * @api {delete} /users/:id  Delete user
 * @apiName DeleteUser
 * @apiGroup User
 * @apiParam {String} token JSON Web Token
 * @apiParam {Number} id User ID
 * @apiSuccess {String} message User deleted successfully
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "message": "User deleted successfully"
 *     }
 * @apiError InvalidToken The <code>token</code> was not valid.
 * @apiErrorExample {json} Error-Response:
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "error": "Invalid token"
 *     }
 * @apiError UserNotFound The <code>username</code> was not found.
 * @apiErrorExample {json} Error-Response:
 *     HTTP/1.1 404 Not Found
 *     {
 *       "error": "User not found"
 *     }
 */
exports.deleteUser = async (req, res) => {
    const token = req.headers['token'];
    if (!token) {
        return res.status(400).send("token is required");
    }
    const { id } = req.params;
  
    try {
      // Verifica se o utilizador autenticado está apagando o próprio perfil
      if (req.user.id !== id) {
        return res.status(403).json({ message: "Acess denied." });
      }
  
      const user = await User.findByIdAndDelete(id);
  
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }
  
      res.status(200).json({ message: "User deleted successfully." });
    } catch (err) {
      res.status(500).json({ message: "Error deleting user.", error: err.message });
    }
  };





/**
 * @api {put} /user/:id Update user
 * @apiName UpdateUser
 * @apiGroup User
 * @apiParam {String} token JSON Web Token
 * @apiParam {String} id User id
 * @apiParam {String} first_name First name
 * @apiParam {String} last_name Last name
 * @apiParam {String} birthdate Birthdate
 * @apiParam {String} email Email
 * @apiSuccess {String} message User updated successfully
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "message": "User updated successfully"
 *     }
 * @apiError InvalidToken The <code>token</code> was not valid.
 * @apiErrorExample {json} Error-Response:
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "error": "Invalid token"
 *     }
 * @apiError UserNotFound The <code>username</code> was not found.
 * @apiErrorExample {json} Error-Response:
 *     HTTP/1.1 404 Not Found
 *     {
 *       "error": "User not found"
 *     }
 */
exports.updateUser = async (req, res) => {
  const token = req.headers['token'];
  if (!token) {
      return res.status(400).send("token is required");
  }
  const { id } = req.params;
  const updates = req.body;

  try {
    // Verifica se o utilizador autenticado está editando o próprio perfil
    if (req.user.id !== id) {
      return res.status(403).json({ message: "Acess denied." });
    }

    const user = await User.findByIdAndUpdate(id, updates, {
      new: true, // Retorna o documento atualizado
      runValidators: true, // Valida os dados enviados
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
