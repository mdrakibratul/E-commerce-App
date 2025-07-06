// backend/models/index.js

// Import all your Mongoose models here to ensure they are registered
// with Mongoose when this file is imported.
import './User.js';
import './Product.js';
import './EmailVerification.js';
import './Order.js'; // Assuming you have an Order model
import './Address.js'; // Assuming you have an Address model

// You can export them if you need to access them directly from this file,
// but for the purpose of ensuring registration, simply importing them is enough.
// For example:
// export { default as User } from './User.js';
// export { default as Product } from './Product.js';
// ... and so on.

// For now, we just need the imports to trigger schema registration.
console.log("Mongoose models initialized and registered.");
