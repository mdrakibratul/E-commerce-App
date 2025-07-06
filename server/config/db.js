import mongoose from "mongoose";
import 'dotenv/config'; // Ensure dotenv is configured for process.env.MONGODB_URI

// --- CRITICAL FIX: Import all your Mongoose models here ---
// This ensures they are registered with Mongoose when connectDB is called.
import '../models/User.js';
import '../models/Product.js';
import '../models/EmailVerification.js';
import '../models/Order.js'; // Assuming you have an Order model
import '../models/Address.js'; // Assuming you have an Address model
// --- END CRITICAL FIX ---

const connectDB = async () => {
    try {
        // Use the MONGODB_URI directly. If your URI doesn't include the database name,
        // you might need to append it like: `${process.env.MONGODB_URI}/greencart`
        await mongoose.connect(process.env.MONGODB_URI, {
            // These options are deprecated in newer Mongoose versions but might be needed for older ones
            // useNewUrlParser: true,
            // useUnifiedTopology: true,
        });
        console.log("Database connected");
    } catch (error) {
        console.error("Database connection failed:", error);
        process.exit(1); // Exit process with failure code
    }
};

export default connectDB;
