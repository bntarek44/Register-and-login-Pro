const router = require("express").Router();
const UserController = require("./controller");
const authentication = require("./auth");

// الآن كله تحت /api/users
router.post('/register', UserController.register);
router.get('/verify-email/:userId/:token', UserController.verifyEmail);
router.post('/login', UserController.login);
router.get('/getusers', authentication, UserController.getUsers);
router.put('/update/:id', authentication, UserController.update);
router.delete('/delete/:id', authentication, UserController.delete);

module.exports = router;
