import express from "express";
import { upload } from "../config/multer.js";


import { addProduct, productList, productById, changeStock, addReview, getProductReviews } from "../controllers/productController.js";

import authSeller from "../middlewares/authSeller.js"; 
import authUser from "../middlewares/authUser.js"; 

const productRouter = express.Router();


productRouter.post('/add', upload.array("images"), authSeller, addProduct);

productRouter.post('/stock', authSeller, changeStock); 


productRouter.get('/list', productList);

productRouter.get('/id', productById); 


productRouter.post("/:productId/review", authUser, addReview);

productRouter.get("/:productId/reviews", getProductReviews);


export default productRouter;
