const jwt = require('jsonwebtoken');
const User = require('../models/user');

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: "No token provided" });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({ message: "User doesn't exist" });
        }

        if (user.isBanned) {
            const isPermanent = user.banExpiresAt === null;
            const isStillBanned = isPermanent || user.banExpiresAt > new Date();

            if (isStillBanned) {
                return res.status(403).json({ message: "Your account has been banned" });
            }
        }

        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};

module.exports = authMiddleware;
    