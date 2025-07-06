import Product from "../models/Product.js";
import cloudinary from "cloudinary";
import fs from "fs";
import User from "../models/User.js"; // Import User model for review population

// Helper function to calculate average rating
const calculateAverageRating = (reviews) => {
    if (reviews.length === 0) return 0;
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    return parseFloat((totalRating / reviews.length).toFixed(1));
};

// Add Product Controller
export const addProduct = async (req, res) => {
    try {
        const { name, description, category, price, offerPrice, inStock, weight } = req.body;
        const images = req.files;

        if (!images || images.length === 0) {
            return res.json({ success: false, message: "No images provided" });
        }

        const imageUploadPromises = images.map(file => {
            return cloudinary.v2.uploader.upload(file.path, {
                folder: "products"
            });
        });

        const uploadedImages = await Promise.all(imageUploadPromises);
        const imageUrls = uploadedImages.map(result => result.secure_url);

        images.forEach(file => fs.unlinkSync(file.path));

        let parsedDescription;
        // --- FIX: Robustly handle description parsing ---
        if (typeof description === 'string') {
            try {
                parsedDescription = JSON.parse(description);
                if (!Array.isArray(parsedDescription)) {
                    // If it's a string, but not a JSON array, treat it as a single description item
                    parsedDescription = [description];
                }
            } catch (e) {
                // If parsing fails, treat the string as a single description item
                parsedDescription = [description];
            }
        } else if (Array.isArray(description)) {
            parsedDescription = description;
        } else {
            // Default to an empty array if description is undefined or unexpected type
            parsedDescription = [];
        }
        // --- END FIX ---

        const newProduct = await Product.create({
            name,
            description: parsedDescription,
            category,
            price,
            offerPrice,
            inStock: inStock === 'true',
            weight,
            image: imageUrls,
        });

        res.json({ success: true, message: "Product Added Successfully", product: newProduct });
    } catch (error) {
        console.error("Error adding product:", error);
        res.json({ success: false, message: error.message });
    }
};

// Get Product List Controller
export const productList = async (req, res) => {
    try {
        const products = await Product.find({}).select('-reviews');
        res.json({ success: true, products });
    } catch (error) {
        console.error("Error fetching product list:", error);
        res.json({ success: false, message: error.message });
    }
};

// Get Product By ID Controller
export const productById = async (req, res) => {
    try {
        const { id } = req.query;
        const product = await Product.findById(id);
        
        if (!product) {
            return res.json({ success: false, message: "Product not found" });
        }
        
        res.json({ success: true, product });
    } catch (error) {
        console.error("Error fetching product by ID:", error);
        res.json({ success: false, message: error.message });
    }
};

// Change Stock Controller
export const changeStock = async (req, res) => {
    try {
        const { id, inStock } = req.body;
        await Product.findByIdAndUpdate(id, { inStock });
        res.json({ success: true, message: "Stock updated successfully" });
    } catch (error) {
        console.error("Error changing product stock:", error);
        res.json({ success: false, message: error.message });
    }
};

// Add Review Controller
export const addReview = async (req, res) => {
    try {
        const { productId } = req.params;
        const { rating, comment } = req.body;
        const userId = req.user._id;

        if (!rating || !comment) {
            return res.json({ success: false, message: "Rating and comment are required." });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.json({ success: false, message: "Product not found." });
        }

        const alreadyReviewedIndex = product.reviews.findIndex(
            (r) => r.userId.toString() === userId.toString()
        );

        if (alreadyReviewedIndex > -1) {
            product.reviews[alreadyReviewedIndex].rating = rating;
            product.reviews[alreadyReviewedIndex].comment = comment;
            product.reviews[alreadyReviewedIndex].createdAt = Date.now();
            console.log(`Backend addReview: User ${userId} updated review for product ${productId}`);
        } else {
            const newReview = { userId, rating, comment };
            product.reviews.push(newReview);
            console.log(`Backend addReview: User ${userId} added new review for product ${productId}`);
        }

        product.numReviews = product.reviews.length;
        product.averageRating = calculateAverageRating(product.reviews);

        await product.save();
        res.json({ success: true, message: "Review added/updated successfully." });

    } catch (error) {
        console.error("Backend addReview: Error adding/updating review:", error);
        res.json({ success: false, message: error.message });
    }
};

// Get Product Reviews Controller
export const getProductReviews = async (req, res) => {
    try {
        const { productId } = req.params;
        // --- FIX: Change 'User' to 'user' to match registered model name ---
        const product = await Product.findById(productId).populate('reviews.userId', 'name email');
        // --- END FIX ---

        if (!product) {
            return res.json({ success: false, message: "Product not found." });
        }

        res.json({ success: true, reviews: product.reviews });
    } catch (error) {
        console.error("Backend getProductReviews: Error fetching product reviews:", error);
        res.json({ success: false, message: error.message });
    }
};
