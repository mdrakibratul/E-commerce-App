import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const authUser = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.token) {
        token = req.cookies.token;
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'Not Authorized, no token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Select name and email along with _id for review display
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }

        const isVerificationRoute = req.originalUrl.includes('/api/user/is-auth') ||
                                    req.originalUrl.includes('/api/user/verify-email-otp') ||
                                    req.originalUrl.includes('/api/user/resend-email-otp');

        if (!user.isVerified && !isVerificationRoute) {
            return res.status(403).json({ success: false, message: 'Please verify your email address to access this resource.', redirectToVerify: true });
        }

        req.user = user; // Attach user object to the request
        next();
    } catch (error) {
        console.error("authUser error:", error.message);
        res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
};

export default authUser;
