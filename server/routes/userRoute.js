import express from 'express';
import { login, register, isAuth, logout, verifyEmailOTP, resendEmailOTP } from '../controllers/userController.js'; 
import authUser from '../middlewares/authUser.js'; // Ensure this is correctly imported

const userRouter = express.Router();
userRouter.post('/register', register);
userRouter.post('/login', login);
userRouter.get('/logout', logout);
userRouter.get('/is-auth', authUser, isAuth);
userRouter.post('/verify-email-otp', verifyEmailOTP);
userRouter.post('/resend-email-otp', resendEmailOTP);

export default userRouter;
