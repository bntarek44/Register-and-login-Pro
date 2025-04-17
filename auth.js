const jwt = require('jsonwebtoken');



const authenticateJWT = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access Denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.secretKey);
        req.user = {userId : decoded.id , userRole : decoded.role}; // حفظ البيانات المفككة في الطلب
        next();
    } catch (err) {
        res.status(403).json({ message: 'Invalid Token'});
    }
};
module.exports = authenticateJWT;