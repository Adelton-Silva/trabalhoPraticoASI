const router = require("express").Router();
const userController = require("../controllers/userController");
const upload = require("../multerConfig/multerConfig");



router.post("/register", userController.register);
router.post("/login", userController.login);
router.put("/change-password", userController.changePassword);
router.put("/user/:id/photo", upload.single("profilePicture"), userController.updateProfilePicture);
router.put("/user/:username/", userController.updateUser);
router.delete("/user/:id/", userController.deleteUser);
module.exports = router;