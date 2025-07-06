import React from 'react';
import { assets } from '../assets/assets'; // Assuming star icons are in your assets

const StarRating = ({ rating, setRating, editable = false }) => {
    const stars = [];
    // Ensure these asset paths are correct in your `assets.js`
    const fullStar = assets.star_icon; // Your full star icon (e.g., a filled star image)
    const emptyStar = assets.star_dull_icon; // Your empty star icon (e.g., an outline star image)

    for (let i = 1; i <= 5; i++) {
        stars.push(
            <img
                key={i}
                src={i <= rating ? fullStar : emptyStar}
                alt={i <= rating ? "filled star" : "empty star"}
                className="w-4 h-4 md:w-5 md:h-5 cursor-pointer" // Adjusted size for responsiveness
                onClick={() => editable && setRating(i)} // Only allow click if `editable` is true
            />
        );
    }

    return (
        <div className="flex items-center gap-0.5">
            {stars}
        </div>
    );
};

export default StarRating;
