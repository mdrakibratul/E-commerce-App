import Order from "../models/Order.js";
import User from "../models/User.js" // Added User import for clearing cart
import Product from "../models/Product.js";
import stripe from "stripe"

// Initialize Stripe with your secret key outside the function
// Make sure process.env.STRIPE_SECRET_KEY is correctly set in your .env file
const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);


export const placeOrderCOD = async (req, res) => {
    try {
        const userId = req.user._id;
        const { items, address } = req.body;

        if (!address || items.length === 0) {
            return res.json({ success: false, message: "Invalid data" });
        }

        let amount = 0;

        for (let item of items) {
            const product = await Product.findById(item.product);
            if (!product) {
                console.error(`Backend placeOrderCOD: Product with ID ${item.product} not found.`);
                return res.json({ success: false, message: `Product with ID ${item.product} not found.` });
            }
            amount += product.offerPrice * item.quantity;
        }

        amount += Math.floor(amount * 0.02); // Adding 2% tax

        const newOrder = await Order.create({
            userId,
            items,
            amount,
            address,
            paymentType: "COD",
            isPaid: false, // Explicitly set for COD
        });

        console.log("Backend placeOrderCOD: New order placed successfully:", newOrder._id);
        return res.json({ success: true, message: "Order Placed Successfully" });
    } catch (error) {
        console.error("Backend placeOrderCOD: Error placing order:", error); // Use console.error for errors
        return res.json({ success: false, message: error.message });
    }
};


//Get Order By User Id:/api/order/user
export const getUserOrders = async (req, res) => {
    try {
        const userId = req.user._id;
        console.log("Backend getUserOrders: Fetching orders for userId:", userId); // <-- NEW LOG

        const orders = await Order.find({
            userId,
            $or: [{ paymentType: "COD" }, { isPaid: true }],
        })
            .populate("items.product") // Populate product details for each item
            .populate("address")       // Populate address details
            .sort({ createdAt: -1 }); // Sort by creation date, newest first

        console.log("Backend getUserOrders: Query results - Number of orders found:", orders.length); // <-- NEW LOG
        if (orders.length > 0) {
            console.log("Backend getUserOrders: First order details (if any):", JSON.stringify(orders[0], null, 2)); // <-- NEW LOG: Log first order for detailed inspection
        }

        res.json({ success: true, orders });
    } catch (error) {
        console.error("Backend getUserOrders: Error fetching user orders:", error); // Use console.error for errors
        res.json({ success: false, message: error.message });
    }
};


//get All orders (for seller/admin): /api/order/seller
export const getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find({
            $or: [{ paymentType: "COD" }, { isPaid: true }],
        })
            .populate("items.product")
            .populate("address")
            .sort({ createdAt: -1 });

        res.json({ success: true, orders });
    } catch (error) {
        console.error("Backend getAllOrders: Error fetching all orders:", error);
        res.json({ success: false, message: error.message });
    }
};


//place Order Stripe :/api/order/stripe
export const placeOrderStripe = async (req, res) => {
    try {
        const userId = req.user._id; // This is a Mongoose ObjectId
        const { items, address } = req.body;
        const { origin } = req.headers;

        if (!address || items.length === 0) {
            return res.json({ success: false, message: "Invalid data" });
        }

        let productData = [];
        let amount = 0;

        for (let item of items) {
            const product = await Product.findById(item.product);
            productData.push({
                name: product.name,
                price: product.offerPrice,
                quantity: item.quantity
            })

            if (!product) {
                console.error(`Backend placeOrderStripe: Product with ID ${item.product} not found.`);
                return res.json({ success: false, message: `Product with ID ${item.product} not found.` });
            }
            amount += product.offerPrice * item.quantity;
        }

        amount += Math.floor(amount * 0.02); // Adding 2% tax

        const order = await Order.create({
            userId,
            items,
            amount,
            address,
            paymentType: "Online",

        });

        const line_items = productData.map((item) => {
            return {
                price_data: {
                    currency: "usd",
                    product_data: {
                        name: item.name,
                    },
                    unit_amount: (item.price + item.price * 0.02) * 100
                },
                quantity: item.quantity,
            }
        })

        const session = await stripeInstance.checkout.sessions.create({
            line_items,
            mode: "payment",
            success_url: `${origin}/loader?next=/my-orders`,
            cancel_url: `${origin}/cart`,
            metadata: {
                orderId: order._id.toString(),
                userId: userId.toString(),
            }

        })

        return res.json({ success: true, url: session.url });
    } catch (error) {
        console.error("Backend Online: Error placing order:", error);
        return res.json({ success: false, message: error.message });

    }
};

//Stripe Webhooks to verify Payments Action :/stripe

export const stripeWebhooks = async (req, res) => { // <-- FIX: Changed requestAnimationFrame to req
    console.log("Backend Stripe Webhook: Webhook received."); // NEW LOG
    //Stripe Gateway Initialize
    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);

    const sig = req.headers["stripe-signature"] // <-- FIX: Used req.headers
    let event;
    try {
        event = stripeInstance.webhooks.constructEvent(
            req.body, // <-- FIX: Used req.body
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        )
        console.log(`Backend Stripe Webhook: Event type: ${event.type}`); // NEW LOG

    } catch (error) {
        console.error(`Backend Stripe Webhook: Webhook Error: ${error.message}`); // NEW LOG
        return res.status(400).send(`Webhook Error: ${error.message}`) // Added return
    }

    //handle the event

    switch (event.type) {
        case "checkout.session.completed": { // <-- FIX: Changed from payment_intent.succeeded to checkout.session.completed
            const session = event.data.object;
            console.log("Backend Stripe Webhook: Checkout session completed event received."); // NEW LOG

            const { orderId, userId } = session.metadata; // Metadata is directly on session for checkout.session.completed

            if (!orderId || !userId) {
                console.error("Backend Stripe Webhook: Missing orderId or userId in session metadata."); // NEW LOG
                return res.status(400).send("Missing metadata");
            }

            // Mark Payment as Paid
            try {
                await Order.findByIdAndUpdate(orderId, { isPaid: true });
                console.log(`Backend Stripe Webhook: Order ${orderId} marked as paid.`); // NEW LOG
            } catch (err) {
                console.error(`Backend Stripe Webhook: Error updating order ${orderId} to paid:`, err.message); // NEW LOG
                return res.status(500).send(`Error updating order: ${err.message}`);
            }

            // clear user cart
            try {
                await User.findByIdAndUpdate(userId, { cartItems: {} });
                console.log(`Backend Stripe Webhook: User ${userId} cart cleared.`); // NEW LOG
            } catch (err) {
                console.error(`Backend Stripe Webhook: Error clearing user ${userId} cart:`, err.message); // NEW LOG
                return res.status(500).send(`Error clearing cart: ${err.message}`);
            }
            break;
        }
        case "payment_intent.payment_failed": {
            const paymentIntent = event.data.object;
            console.log("Backend Stripe Webhook: Payment intent failed event received."); // NEW LOG

            // For payment_intent.payment_failed, you need to retrieve the session
            // by payment_intent ID to get the metadata.
            const sessions = await stripeInstance.checkout.sessions.list({
                payment_intent: paymentIntent.id,
            });
            const session = sessions.data[0];

            if (!session || !session.metadata || !session.metadata.orderId) {
                console.error("Backend Stripe Webhook: Missing session or orderId in metadata for failed payment."); // NEW LOG
                return res.status(400).send("Missing metadata for failed payment");
            }
            const { orderId } = session.metadata;

            try {
                await Order.findByIdAndDelete(orderId);
                console.log(`Backend Stripe Webhook: Order ${orderId} deleted due to failed payment.`); // NEW LOG
            } catch (err) {
                console.error(`Backend Stripe Webhook: Error deleting order ${orderId} after failed payment:`, err.message); // NEW LOG
                return res.status(500).send(`Error deleting order: ${err.message}`);
            }
            break;
        }
        default:
            console.warn(`Backend Stripe Webhook: Unhandled event type ${event.type}`); // NEW LOG
            break;
    }
    res.json({ received: true });
};
