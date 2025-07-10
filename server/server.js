import cookieParser from 'cookie-parser';
import express from 'express';
import cors from 'cors';
import connectDB from './config/db.js';
import 'dotenv/config';
import userRouter from './routes/userRoute.js';
import sellerRouter from './routes/sellerRoute.js';
import connectCloudinary from './config/cloudinary.js';
import productRouter from './routes/productRoute.js';
import cartRouter from './routes/cartRoute.js';
import addressRouter from './routes/addressRoute.js';
import orderRouter from './routes/orderRoute.js';
import { stripeWebhooks } from './controllers/orderController.js';

// --- ENSURE THESE LINES ARE NOT HERE ---
// import User from './models/User.js';
// import './models/index.js';
// --- END ENSURE ---

const app = express();
const port = process.env.PORT || 4000;

// Call connectDB, which now handles Mongoose model registration
await connectDB();
await connectCloudinary();

// --- UPDATED: Add Capacitor origins to allowedOrigins ---
const allowedOrigins = [
    'http://localhost:5173',  // Your React development server
    'https://e-commerce-app-2rsc.vercel.app', // Your deployed web frontend (if applicable)
    'http://localhost',               // **Capacitor on Android (and some emulators)**
    'capacitor://localhost'           // **Capacitor on iOS**
];
// --- END UPDATED ---

// Stripe webhook must come *before* express.json() because it needs the raw body
app.post("/stripe", express.raw({ type: "application/json" }), stripeWebhooks);

app.use(express.json()); // Parses JSON bodies
app.use(cookieParser()); // Parses cookies

// --- UPDATED: Use the allowedOrigins array in CORS middleware ---
// The `origin` option in cors can also be a function if you need more dynamic control,
// but for a fixed list, passing the array is clean.
app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));
// --- END UPDATED ---

app.get('/', (req, res) => {
    res.send("Api is working ...");
});

// API Routes
app.use('/api/user', userRouter);
app.use('/api/seller', sellerRouter);
app.use('/api/product', productRouter);
app.use('/api/cart', cartRouter);
app.use('/api/address', addressRouter);
app.use('/api/order', orderRouter);

app.listen(port, () => {
    console.log(`server is running on http://localhost:${port}`);
});
