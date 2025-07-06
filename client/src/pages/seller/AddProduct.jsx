import React, { useState } from "react";
import { assets, categories } from "../../assets/assets";
import { useAppContext } from "../../context/AppContext";
import toast from "react-hot-toast";

const AddProduct = () => {
    const [files, setFiles] = useState([]);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [price, setPrice] = useState('');
    const [offerPrice, setOfferPrice] = useState('');
    const [inStock, setInStock] = useState(true); // Added state for inStock
    const [weight, setWeight] = useState(''); // Added state for weight
    const { axios } = useAppContext();

    const onSubmitHandler = async (event) => {
        try {
            event.preventDefault();

            // Basic client-side validation
            if (!name || !description || !category || !price || !offerPrice || files.length === 0) {
                toast.error("Please fill in all required fields and select at least one image.");
                return;
            }
            if (isNaN(price) || isNaN(offerPrice) || parseFloat(price) <= 0 || parseFloat(offerPrice) <= 0) {
                toast.error("Price and Offer Price must be valid positive numbers.");
                return;
            }

            const formData = new FormData();
            // --- CRUCIAL FIX: Append each field individually to FormData ---
            formData.append('name', name);
            // Backend expects description as an array of strings, so split by newline
            formData.append('description', JSON.stringify(description.split('\n')));
            formData.append('category', category);
            formData.append('price', price);
            formData.append('offerPrice', offerPrice);
            formData.append('inStock', inStock); // Append boolean as string
            formData.append('weight', weight); // Append weight (can be empty string if optional)

            for (let i = 0; i < files.length; i++) {
                if (files[i]) { // Only append if a file exists at this index
                    formData.append('images', files[i]);
                }
            }
            // --- END CRUCIAL FIX ---

            const { data } = await axios.post("/api/product/add", formData);

            if (data.success) {
                toast.success(data.message);
                // Clear form fields after successful submission
                setName('');
                setDescription('');
                setCategory('');
                setPrice('');
                setOfferPrice('');
                setFiles([]);
                setInStock(true); // Reset to default
                setWeight(''); // Reset to default
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error("Frontend AddProduct: Error adding product:", error); // More detailed error log
            toast.error(error.response?.data?.message || "Failed to add product. Please check console for details.");
        }
    };

    return (
        <div className=" no-scrollbar flex-1 h-[95vh] overflow-y-scroll flex flex-col justify-between">
            <form onSubmit={onSubmitHandler} className="md:p-10 p-4 space-y-5 max-w-lg">
                <div>
                    <p className="text-base font-medium">Product Image</p>
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                        {Array(4).fill('').map((_, index) => (
                            <label key={index} htmlFor={`image${index}`}>
                                <input
                                    onChange={(e) => {
                                        const updatedFiles = [...files];
                                        updatedFiles[index] = e.target.files[0];
                                        setFiles(updatedFiles);
                                    }}
                                    accept="image/*"
                                    type="file"
                                    id={`image${index}`}
                                    hidden
                                />
                                <img
                                    className="max-w-24 cursor-pointer"
                                    src={files[index] ? URL.createObjectURL(files[index]) : assets.upload_area}
                                    alt="uploadArea"
                                    width={100}
                                    height={100}
                                />
                            </label>
                        ))}
                    </div>
                </div>
                <div className="flex flex-col gap-1 max-w-md">
                    <label className="text-base font-medium" htmlFor="product-name">Product Name</label>
                    <input
                        onChange={(e) => setName(e.target.value)}
                        value={name}
                        id="product-name"
                        type="text"
                        placeholder="Type here"
                        className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40"
                        required
                    />
                </div>
                <div className="flex flex-col gap-1 max-w-md">
                    <label className="text-base font-medium" htmlFor="product-description">Product Description</label>
                    <textarea
                        onChange={(e) => setDescription(e.target.value)}
                        value={description}
                        id="product-description"
                        rows={4}
                        className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40 resize-none"
                        placeholder="Type here"
                        required // Make description required as per schema
                    ></textarea>
                </div>
                <div className="w-full flex flex-col gap-1">
                    <label className="text-base font-medium" htmlFor="category">Category</label>
                    <select
                        onChange={(e) => setCategory(e.target.value)}
                        value={category}
                        id="category"
                        className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40"
                        required // Make category required
                    >
                        <option value="">Select Category</option>
                        {categories.map((item, index) => (
                            <option key={index} value={item.path}>{item.path}</option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center gap-5 flex-wrap">
                    <div className="flex-1 flex flex-col gap-1 w-32">
                        <label className="text-base font-medium" htmlFor="product-price">Product Price</label>
                        <input
                            onChange={(e) => setPrice(e.target.value)}
                            value={price}
                            id="product-price"
                            type="number"
                            placeholder="0"
                            className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40"
                            required
                            min="0" // Ensure positive price
                        />
                    </div>
                    <div className="flex-1 flex flex-col gap-1 w-32">
                        <label className="text-base font-medium" htmlFor="offer-price">Offer Price</label>
                        <input
                            onChange={(e) => setOfferPrice(e.target.value)}
                            value={offerPrice}
                            id="offer-price"
                            type="number"
                            placeholder="0"
                            className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40"
                            required
                            min="0" // Ensure positive offer price
                        />
                    </div>
                </div>
                {/* In Stock Checkbox */}
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="inStock"
                        checked={inStock}
                        onChange={(e) => setInStock(e.target.checked)}
                        className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <label htmlFor="inStock" className="text-base font-medium">In Stock</label>
                </div>
                {/* Weight (Optional) */}
                <div className="flex flex-col gap-1 max-w-md">
                    <label className="text-base font-medium" htmlFor="weight">Weight (Optional)</label>
                    <input
                        onChange={(e) => setWeight(e.target.value)}
                        value={weight}
                        id="weight"
                        type="text"
                        placeholder="e.g., 500g, 1kg"
                        className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40"
                    />
                </div>
                <button type="submit" className="px-8 cursor-pointer py-2.5 bg-primary text-white font-medium rounded">ADD</button>
            </form>
        </div>
    );
};

export default AddProduct;
