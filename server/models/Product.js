import mongoose from "mongoose";

// Define the schema for individual reviews
const reviewSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user', // This is already correctly lowercase from previous fixes
        required: true,
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
    },
    comment: {
        type: String,
        required: true,
        trim: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: [String],
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    offerPrice: {
        type: Number,
        required: true,
    },
    image: {
        type: [String],
        required: true,
    },
    inStock: {
        type: Boolean,
        default: true,
    },
    weight: {
        type: String,
        required: false,
    },
    reviews: [reviewSchema],
    averageRating: {
        type: Number,
        default: 0,
    },
    numReviews: {
        type: Number,
        default: 0,
    },
}, { timestamps: true });

// --- CRUCIAL FIX: Change model name from "Product" to "product" (lowercase) ---
// This ensures consistency with how it's likely referenced in other schemas (e.g., Order model)
const Product = mongoose.models.product || mongoose.model("product", productSchema);
// --- END CRUCIAL FIX ---

export default Product;
