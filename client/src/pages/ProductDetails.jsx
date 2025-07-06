import React, { useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";
import { Link, useParams } from "react-router-dom";
import { assets } from "../assets/assets";
import ProductCart from "../components/ProductCart";
import StarRating from "../components/StarRating"; // NEW: Import StarRating component
import toast from "react-hot-toast"; // NEW: Import toast for notifications

const ProductDetails = () => {
    const { products, navigate, currency, AddToCart, user, axios } = useAppContext();
    const { id } = useParams(); // Product ID from URL parameter

    const [relatedProducts, setRelatedProducts] = useState([]);
    const [thumbnail, setThumbnail] = useState(null);
    const [productDetails, setProductDetails] = useState(null); // State to store detailed product data
    const [userReview, setUserReview] = useState({ rating: 0, comment: "" }); // State for current user's review input
    const [allReviews, setAllReviews] = useState([]); // State to store all reviews for the product
    const [isSubmittingReview, setIsSubmittingReview] = useState(false); // Loading state for review submission

    // Function to fetch full product details (including averageRating, numReviews)
    // and then fetch its specific reviews
    const fetchProductAndReviews = async () => {
        try {
            // First, try to find the product from the context's products list
            // This list usually comes from /api/product/list which excludes the full reviews array
            let foundProduct = products.find((item) => item._id === id);

            if (!foundProduct) {
                // If not found in context (e.g., direct URL access or initial load),
                // fetch the specific product from the backend.
                // Assuming your backend has a /api/product/id endpoint that returns full product data.
                const { data } = await axios.get(`/api/product/id?id=${id}`); // Adjust this endpoint if yours is different (e.g., /api/product/${id})
                if (data.success && data.product) {
                    foundProduct = data.product;
                } else {
                    toast.error(data.message || "Product details not found.");
                    navigate('/products'); // Redirect if product not found
                    return;
                }
            }

            setProductDetails(foundProduct);
            setThumbnail(foundProduct.image?.[0] || null);

            // Now fetch the detailed reviews for this product
            fetchProductReviews(foundProduct._id);

        } catch (error) {
            console.error("Error fetching product details or reviews:", error);
            toast.error("Failed to load product details or reviews.");
            navigate('/products'); // Redirect on error
        }
    };

    // Function to fetch reviews for the current product
    const fetchProductReviews = async (productId) => {
        try {
            const { data } = await axios.get(`/api/product/${productId}/reviews`);
            if (data.success) {
                setAllReviews(data.reviews);
                // Check if the current logged-in user has already reviewed this product
                if (user && user._id) {
                    const existingReview = data.reviews.find(
                        (review) => review.userId._id === user._id
                    );
                    if (existingReview) {
                        setUserReview({ rating: existingReview.rating, comment: existingReview.comment });
                    } else {
                        setUserReview({ rating: 0, comment: "" }); // Reset for new review
                    }
                }
            } else {
                toast.error(data.message || "Failed to load reviews.");
            }
        } catch (error) {
            console.error("Error fetching product reviews:", error);
            toast.error("Failed to load reviews.");
        }
    };

    // Handle review submission
    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            toast.error("Please log in to submit a review.");
            return;
        }
        if (userReview.rating === 0) {
            toast.error("Please provide a star rating.");
            return;
        }
        if (userReview.comment.trim() === "") {
            toast.error("Please provide a comment for your review.");
            return;
        }

        setIsSubmittingReview(true);
        try {
            const token = localStorage.getItem("token");
            const { data } = await axios.post(
                `/api/product/${id}/review`, // Use product ID from params
                userReview, // Send rating and comment
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (data.success) {
                toast.success(data.message);
                // Re-fetch product details and reviews to update the UI
                fetchProductAndReviews();
                setUserReview({ rating: 0, comment: "" }); // Clear form after submission
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error("Error submitting review:", error);
            toast.error(error.response?.data?.message || "Failed to submit review.");
        } finally {
            setIsSubmittingReview(false);
        }
    };

    useEffect(() => {
        // Fetch product details and reviews when component mounts or product ID changes
        fetchProductAndReviews();
    }, [id, products, user]); // Re-run if product ID, products list, or user changes

    useEffect(() => {
        if (productDetails) {
            // Filter related products by category, excluding the current product
            let productsCopy = products.slice();
            productsCopy = productsCopy.filter(
                (item) => productDetails.category === item.category && item._id !== productDetails._id
            );
            setRelatedProducts(productsCopy.slice(0, 5)); // Take up to 5 related products
        }
    }, [products, productDetails]); // Re-run if products list or productDetails change

    // Only render if productDetails data is available
    return productDetails ? (
        <div className="mt-12">
            <p>
                <Link to={"/"}>Home</Link> /
                <Link to={"/products"}> Products</Link> /
                <Link to={`/products/${productDetails.category?.toLowerCase()}`}> {productDetails.category}</Link> /
                <span className="text-primary"> {productDetails.name}</span>
            </p>

            <div className="flex flex-col md:flex-row gap-16 mt-4">
                <div className="flex gap-3">
                    <div className="flex flex-col gap-3">
                        {productDetails.image && productDetails.image.map((image, index) => (
                            <div key={index} onClick={() => setThumbnail(image)} className="border max-w-24 border-gray-500/30 rounded overflow-hidden cursor-pointer" >
                                <img src={image} alt={`Thumbnail ${index + 1}`} />
                            </div>
                        ))}
                    </div>

                    <div className="border border-gray-500/30 max-w-100 rounded overflow-hidden">
                        <img src={thumbnail || 'https://placehold.co/400x400?text=No+Image'} alt="Selected product" />
                    </div>
                </div>

                <div className="text-sm w-full md:w-1/2">
                    <h1 className="text-3xl font-medium">{productDetails.name}</h1>

                    <div className="flex items-center gap-0.5 mt-1">
                        {/* Display average rating using StarRating component */}
                        <StarRating rating={productDetails.averageRating} editable={false} />
                        <p className="text-base ml-2">({productDetails.numReviews} Reviews)</p>
                    </div>

                    <div className="mt-6">
                        <p className="text-gray-500/70 line-through">MRP:{currency} {productDetails.price}</p>
                        <p className="text-2xl font-medium">MRP:{currency} {productDetails.offerPrice}</p>
                        <span className="text-gray-500/70">(inclusive of all taxes)</span>
                    </div>

                    <p className="text-base font-medium mt-6">About Product</p>
                    <ul className="list-disc ml-4 text-gray-500/70">
                        {productDetails.description && productDetails.description.map((desc, index) => (
                            <li key={index}>{desc}</li>
                        ))}
                    </ul>

                    <div className="flex items-center mt-10 gap-4 text-base">
                        <button
                            onClick={() => AddToCart(productDetails._id)}
                            className="w-full py-3.5 cursor-pointer font-medium bg-gray-100 text-gray-800/80 hover:bg-gray-200 transition"
                        >
                            Add to Cart
                        </button>
                        <button
                            onClick={() => { AddToCart(productDetails._id); navigate("/cart"); }}
                            className="w-full py-3.5 cursor-pointer font-medium bg-primary text-white hover:bg-indigo-600 transition"
                        >
                            Buy now
                        </button>
                    </div>
                </div>
            </div>

            {/* --- NEW: Review Section --- */}
            <div className="mt-16 p-6 border border-gray-300 rounded-lg">
                <h2 className="text-2xl font-medium mb-6">Customer Reviews</h2>

                {/* Review Submission Form */}
                {user ? ( // Only show form if user is logged in
                    <div className="mb-8 p-4 border border-gray-200 rounded-md">
                        <h3 className="text-xl font-medium mb-4">
                            {allReviews.some(review => review.userId?._id === user._id) ? "Edit Your Review" : "Write a Review"}
                        </h3>
                        <form onSubmit={handleReviewSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Your Rating</label>
                                <StarRating
                                    rating={userReview.rating}
                                    setRating={(newRating) => setUserReview({ ...userReview, rating: newRating })}
                                    editable={true}
                                />
                            </div>
                            <div>
                                <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">Your Comment</label>
                                <textarea
                                    id="comment"
                                    rows="4"
                                    value={userReview.comment}
                                    onChange={(e) => setUserReview({ ...userReview, comment: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="Share your thoughts about this product..."
                                    required
                                ></textarea>
                            </div>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-primary text-white rounded-md hover:bg-indigo-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={isSubmittingReview}
                            >
                                {isSubmittingReview ? "Submitting..." : "Submit Review"}
                            </button>
                        </form>
                    </div>
                ) : (
                    <p className="text-center text-gray-600 mb-8">
                        <button onClick={() => navigate('/login')} className="text-primary hover:underline">Log in</button> to write a review.
                    </p>
                )}


                {/* Display Existing Reviews */}
                {allReviews.length === 0 ? (
                    <p className="text-center text-gray-600">No reviews yet. Be the first to review!</p>
                ) : (
                    <div className="space-y-6">
                        {allReviews.map((review) => (
                            <div key={review._id} className="border-b border-gray-200 pb-4 last:border-b-0">
                                <div className="flex items-center gap-2 mb-2">
                                    <p className="font-semibold text-gray-800">{review.userId?.name || "Anonymous User"}</p>
                                    <StarRating rating={review.rating} editable={false} />
                                    <span className="text-gray-500 text-xs">
                                        {new Date(review.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-gray-700">{review.comment}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {/* --- END NEW: Review Section --- */}


            <div className=" flex flex-col items-center mt-20">
                <div className=" flex flex-col items-center w-max">
                    <p className=" text-3xl font-medium">Related Products</p>
                    <div className=" w-20 h-0.5 bg-primary rounded-full mt-2"></div>
                </div>
                <div className=" grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-6 lg:grid-cols-5 mt-6 w-full">
                    {Array.isArray(relatedProducts) && relatedProducts.filter((p) => p.inStock).map((p) => (
                        <ProductCart key={p._id} product={p} />
                    ))}
                </div>
                <button onClick={() => { navigate("/products"); window.scrollTo(0, 0); }} className=" mx-auto cursor-pointer px-12 my-16 py-2.5 border rounded text-primary hover:bg-primary/10 transition">See more</button>
            </div>
        </div>
    ) : (
        <div className="mt-12 text-center text-gray-500">
            Loading product details or product not found...
        </div>
    );
};

export default ProductDetails;
