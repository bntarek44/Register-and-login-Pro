const router = require("express").Router();
const UserController = require("./controller");
const authentication = require("./auth")



router.post('/api/users/register', UserController.register)
router.post('/api/users/login', UserController.login)
router.get('/api/users/getusers',authentication, UserController.getUsers)
router.put('/api/users/update/:id',authentication, UserController.update)
router.delete('/api/users/delete/:id',authentication, UserController.delete)




module.exports = router;