import React from 'react'
import { useAppContext } from '../context/AppContext'
import { assets } from '../assets/assets'
import { Link } from 'react-router-dom'
import StarRating from './StarRating' // NEW: Import StarRating component

const ProductCart = ({ product }) => {
    const { currency, AddToCart } = useAppContext()

    return (
        <div className='flex flex-col gap-2 p-3 rounded-md shadow-md border border-gray-100 group hover:shadow-xl transition-all'>
            <Link to={`/products/${product.category.toLowerCase()}/${product._id}`}>
                <div className='relative flex items-center justify-center bg-gray-100/70 rounded-md overflow-hidden'>
                    {/* Fallback for image if product.image[0] is undefined */}
                    <img className='w-full h-40 object-contain' src={product.image?.[0] || 'https://placehold.co/160x160/E2E8F0/A0AEC0?text=No+Img'} alt={product.name} />
                    <img onClick={(e) => { e.preventDefault(); AddToCart(product._id); }} className='w-8 h-8 absolute right-2 bottom-2 cursor-pointer opacity-0 group-hover:opacity-100 transition-all' src={assets.add_icon_white} alt="add to cart" />
                </div>
            </Link>
            <div className='flex flex-col gap-1'>
                <h2 className='text-base font-medium'>{product.name}</h2>
                <p className='text-xs text-gray-500'>{product.category}</p>
                {/* NEW: Display average rating using StarRating component */}
                <div className="flex items-center gap-0.5">
                    <StarRating rating={product.averageRating} editable={false} />
                    <span className="text-xs text-gray-500">({product.numReviews})</span>
                </div>
                <div className='flex items-center gap-2'>
                    <p className='text-sm font-medium'>{currency}{product.offerPrice}</p>
                    <p className='text-xs text-gray-500 line-through'>{currency}{product.price}</p>
                </div>
            </div>
        </div>
    )
}

export default ProductCart
