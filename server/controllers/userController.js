import bcrypt from 'bcryptjs'
import User from "../models/User.js";
import jwt from 'jsonwebtoken'
import EmailVerification from "../models/EmailVerification.js";
import sendEmail from "../utils/sendEmail.js";
import crypto from 'crypto';

// Helper function to generate a random 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // Ensures 6 digits
};

export const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.json({ success: false, message: "Missing Details" });
        }

        let user = await User.findOne({ email });
        let isNewUser = false; // Flag to track if a new user was created

        // If user already exists
        if (user) {
            if (user.isVerified) {
                // If user exists and is already verified, prevent re-registration
                return res.json({ success: false, message: "User already exists and is verified. Please log in." });
            } else {
                // If user exists but is NOT verified, we can reuse the existing user
                // and resend a new OTP to allow them to complete verification.
                console.log(`User ${email} exists but not verified. Proceeding to resend OTP.`);
                // Clean up any old OTPs for this user
                await EmailVerification.deleteOne({ userId: user._id });
            }
        } else {
            // If user does not exist, create a new one
            const hashedPassword = await bcrypt.hash(password, 10);
            user = await User.create({ name, email, password: hashedPassword, isVerified: false }); // New user, mark as unverified
            isNewUser = true; // Mark as new user
        }

        // Generate and save (or update) OTP
        const otp = generateOTP();
        await EmailVerification.create({ userId: user._id, otp });

        const emailSubject = "Verify your GreenCart Email";
        const emailHtmlContent = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2 style="color: #4CAF50;">GreenCart Email Verification</h2>
                <p>Thank you for registering with GreenCart!</p>
                <p>Your One-Time Password (OTP) for email verification is:</p>
                <h3 style="color: #007bff; font-size: 24px; text-align: center; background-color: #f0f0f0; padding: 15px; border-radius: 5px;">
                    ${otp}
                </h3>
                <p>This OTP is valid for 1 hour. Please enter it on the verification page to complete your registration.</p>
                <p>If you did not request this, please ignore this email.</p>
                <p>Best regards,<br/>The GreenCart Team</p>
            </div>
        `;

        const emailSent = await sendEmail(email, emailSubject, emailHtmlContent);

        if (emailSent) {
            // DO NOT automatically log in or send token after initial registration
            // The user must verify their email first.
            return res.json({ success: true, message: "Registration successful! OTP sent to your email. Please verify." });
        } else {
            // If email failed and it was a brand new user, delete the user.
            // If it was an existing but unverified user, we don't delete them.
            if (isNewUser) { // Use the isNewUser flag
                await User.deleteOne({ _id: user._id });
            }
            return res.json({ success: false, message: "Registration failed: Could not send verification email. Please try again." });
        }

    } catch (error) {
        console.error("User Register Error:", error.message);
        res.json({ success: false, message: error.message });
    }
};

// Keep other functions (login, verifyEmailOTP, resendEmailOTP, isAuth, logout) as they are from previous immersives.
// They are not included here for brevity but should remain in your userController.js file.
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.json({ success: false, message: "Email and password are required" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.json({ success: false, message: "Invalid email or password" });
        }

        if (!user.isVerified) {
            return res.json({ success: false, message: "Please verify your email address to log in. An OTP has been sent to your email.", redirectToVerify: true });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.json({ success: false, message: "Invalid email or password" });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.json({ success: true, user: { email: user.email, name: user.name, _id: user._id, isVerified: user.isVerified }, token });

    } catch (error) {
        console.error("User Login Error:", error.message);
        res.json({ success: false, message: error.message });
    }
};

export const verifyEmailOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.json({ success: false, message: "Email and OTP are required." });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.json({ success: false, message: "User not found." });
        }

        if (user.isVerified) {
            return res.json({ success: false, message: "Email already verified." });
        }

        const emailVerificationRecord = await EmailVerification.findOne({ userId: user._id, otp });

        if (!emailVerificationRecord) {
            return res.json({ success: false, message: "Invalid or expired OTP." });
        }

        user.isVerified = true;
        await user.save();

        await EmailVerification.deleteOne({ _id: emailVerificationRecord._id });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.json({ success: true, message: "Email verified successfully! You are now logged in.", user: { email: user.email, name: user.name, _id: user._id, isVerified: user.isVerified }, token });

    } catch (error) {
        console.error("Backend verifyEmailOTP Error:", error.message);
        res.json({ success: false, message: error.message });
    }
};

export const resendEmailOTP = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.json({ success: false, message: "Email is required." });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.json({ success: false, message: "User not found." });
        }

        if (user.isVerified) {
            return res.json({ success: false, message: "Email already verified." });
        }

        await EmailVerification.deleteOne({ userId: user._id });

        const otp = generateOTP();
        await EmailVerification.create({ userId: user._id, otp });

        const emailSubject = "GreenCart: Resend Email Verification OTP";
        const emailHtmlContent = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2 style="color: #4CAF50;">GreenCart Email Verification (Resend)</h2>
                <p>Your new One-Time Password (OTP) for email verification is:</p>
                <h3 style="color: #007bff; font-size: 24px; text-align: center; background-color: #f0f0f0; padding: 15px; border-radius: 5px;">
                    ${otp}
                </h3>
                <p>This OTP is valid for 1 hour. Please enter it on the verification page to complete your registration.</p>
                <p>If you did not request this, please ignore this email.</p>
                <p>Best regards,<br/>The GreenCart Team</p>
            </div>
        `;

        const emailSent = await sendEmail(email, emailSubject, emailHtmlContent);

        if (emailSent) {
            return res.json({ success: true, message: "New OTP sent to your email. Please check your inbox." });
        } else {
            return res.json({ success: false, message: "Failed to resend OTP. Please try again." });
        }

    } catch (error) {
        console.error("Backend resendEmailOTP Error:", error.message);
        res.json({ success: false, message: error.message });
    }
};

export const isAuth = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const user = {
            email: req.user.email,
            name: req.user.name,
            _id: req.user._id,
            isVerified: req.user.isVerified
        };

        res.status(200).json({ success: true, user });
    } catch (error) {
        console.error("isAuth Error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const logout = async (req, res) => {
    try {
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        });

        return res.status(200).json({ success: true, message: "Logged out" });
    } catch (error) {
        console.error("Logout Error:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};
