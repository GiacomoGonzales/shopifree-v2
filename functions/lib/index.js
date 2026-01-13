"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminGetDashboardStats = exports.adminGetAllUsers = exports.adminUpdateStorePlan = exports.adminGetAllStores = exports.stripeWebhook = exports.createPortalSession = exports.createCheckoutSession = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const stripe_1 = __importDefault(require("stripe"));
const cors_1 = __importDefault(require("cors"));
// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();
// Lazy initialization for Stripe
let stripeInstance = null;
function getStripe() {
    if (!stripeInstance) {
        stripeInstance = new stripe_1.default(process.env.STRIPE_SECRET_KEY || '', {
            apiVersion: '2023-10-16'
        });
    }
    return stripeInstance;
}
// CORS middleware
const corsHandler = (0, cors_1.default)({ origin: true });
// Lazy getters for config
const getAdminEmail = () => process.env.ADMIN_EMAIL || 'admin@shopifree.app';
const getPrices = () => ({
    pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
    pro_yearly: process.env.STRIPE_PRICE_PRO_YEARLY || '',
    business_monthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY || '',
    business_yearly: process.env.STRIPE_PRICE_BUSINESS_YEARLY || ''
});
// ============================================
// CREATE CHECKOUT SESSION
// ============================================
exports.createCheckoutSession = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }
        try {
            const { storeId, plan, billing, userId, email } = req.body;
            if (!storeId || !plan || !billing || !userId || !email) {
                res.status(400).json({ error: 'Missing required parameters' });
                return;
            }
            // Get price ID based on plan and billing
            const priceKey = `${plan}_${billing}`;
            const priceId = getPrices()[priceKey];
            if (!priceId) {
                res.status(400).json({ error: 'Invalid plan or billing cycle' });
                return;
            }
            // Check if user already has a Stripe customer ID
            const userDoc = await db.collection('users').doc(userId).get();
            const userData = userDoc.data();
            let customerId = userData === null || userData === void 0 ? void 0 : userData.stripeCustomerId;
            // Create customer if doesn't exist
            if (!customerId) {
                const customer = await getStripe().customers.create({
                    email,
                    metadata: {
                        userId,
                        storeId
                    }
                });
                customerId = customer.id;
                // Save customer ID to user document
                await db.collection('users').doc(userId).update({
                    stripeCustomerId: customerId
                });
            }
            // Create checkout session
            const session = await getStripe().checkout.sessions.create({
                customer: customerId,
                payment_method_types: ['card'],
                line_items: [
                    {
                        price: priceId,
                        quantity: 1
                    }
                ],
                mode: 'subscription',
                success_url: `${req.headers.origin}/dashboard/plan?success=true`,
                cancel_url: `${req.headers.origin}/dashboard/plan?canceled=true`,
                metadata: {
                    storeId,
                    userId,
                    plan
                },
                subscription_data: {
                    metadata: {
                        storeId,
                        userId,
                        plan
                    }
                }
            });
            res.json({ sessionId: session.id, url: session.url });
        }
        catch (error) {
            console.error('Error creating checkout session:', error);
            res.status(500).json({ error: 'Failed to create checkout session' });
        }
    });
});
// ============================================
// CREATE CUSTOMER PORTAL SESSION
// ============================================
exports.createPortalSession = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }
        try {
            const { userId } = req.body;
            if (!userId) {
                res.status(400).json({ error: 'Missing userId' });
                return;
            }
            // Get user's Stripe customer ID
            const userDoc = await db.collection('users').doc(userId).get();
            const userData = userDoc.data();
            if (!(userData === null || userData === void 0 ? void 0 : userData.stripeCustomerId)) {
                res.status(400).json({ error: 'No subscription found' });
                return;
            }
            // Create portal session
            const session = await getStripe().billingPortal.sessions.create({
                customer: userData.stripeCustomerId,
                return_url: `${req.headers.origin}/dashboard/plan`
            });
            res.json({ url: session.url });
        }
        catch (error) {
            console.error('Error creating portal session:', error);
            res.status(500).json({ error: 'Failed to create portal session' });
        }
    });
});
// ============================================
// STRIPE WEBHOOK HANDLER
// ============================================
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
    let event;
    try {
        event = getStripe().webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    }
    catch (err) {
        console.error('Webhook signature verification failed:', err);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }
    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object;
            await handleCheckoutComplete(session);
            break;
        }
        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
            const subscription = event.data.object;
            await handleSubscriptionUpdate(subscription);
            break;
        }
        case 'customer.subscription.deleted': {
            const subscription = event.data.object;
            await handleSubscriptionCanceled(subscription);
            break;
        }
        case 'invoice.payment_succeeded': {
            const invoice = event.data.object;
            await handleInvoicePaid(invoice);
            break;
        }
        case 'invoice.payment_failed': {
            const invoice = event.data.object;
            await handleInvoiceFailed(invoice);
            break;
        }
        default:
            console.log(`Unhandled event type: ${event.type}`);
    }
    res.json({ received: true });
});
// ============================================
// WEBHOOK HANDLERS
// ============================================
async function handleCheckoutComplete(session) {
    const { storeId, plan } = session.metadata || {};
    if (!storeId || !plan) {
        console.error('Missing metadata in checkout session');
        return;
    }
    console.log(`Checkout complete for store ${storeId}, plan: ${plan}`);
}
async function handleSubscriptionUpdate(subscription) {
    var _a;
    const { storeId, plan } = subscription.metadata || {};
    if (!storeId) {
        console.error('Missing storeId in subscription metadata');
        return;
    }
    // Determine plan from price
    const priceId = (_a = subscription.items.data[0]) === null || _a === void 0 ? void 0 : _a.price.id;
    let determinedPlan = plan || 'pro';
    if (priceId === getPrices().business_monthly || priceId === getPrices().business_yearly) {
        determinedPlan = 'business';
    }
    else if (priceId === getPrices().pro_monthly || priceId === getPrices().pro_yearly) {
        determinedPlan = 'pro';
    }
    // Update store subscription
    await db.collection('stores').doc(storeId).update({
        plan: determinedPlan,
        planExpiresAt: new Date(subscription.current_period_end * 1000),
        subscription: {
            stripeCustomerId: subscription.customer,
            stripeSubscriptionId: subscription.id,
            stripePriceId: priceId,
            status: subscription.status,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`Store ${storeId} subscription updated to ${determinedPlan}`);
}
async function handleSubscriptionCanceled(subscription) {
    const { storeId } = subscription.metadata || {};
    if (!storeId) {
        console.error('Missing storeId in subscription metadata');
        return;
    }
    // Downgrade to free plan
    await db.collection('stores').doc(storeId).update({
        plan: 'free',
        planExpiresAt: null,
        'subscription.status': 'canceled',
        'subscription.cancelAtPeriodEnd': true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`Store ${storeId} subscription canceled, downgraded to free`);
}
async function handleInvoicePaid(invoice) {
    const subscriptionId = invoice.subscription;
    if (!subscriptionId)
        return;
    const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
    await handleSubscriptionUpdate(subscription);
}
async function handleInvoiceFailed(invoice) {
    const customerId = invoice.customer;
    // Find store by customer ID
    const storesSnapshot = await db.collection('stores')
        .where('subscription.stripeCustomerId', '==', customerId)
        .get();
    if (storesSnapshot.empty) {
        console.error('No store found for customer:', customerId);
        return;
    }
    const storeDoc = storesSnapshot.docs[0];
    await storeDoc.ref.update({
        'subscription.status': 'past_due',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`Store ${storeDoc.id} payment failed, marked as past_due`);
}
// ============================================
// ADMIN FUNCTIONS
// ============================================
// Get all stores (admin only)
exports.adminGetAllStores = functions.https.onCall(async (request) => {
    var _a;
    // Verify admin
    if (!((_a = request.auth) === null || _a === void 0 ? void 0 : _a.token.email) || request.auth.token.email !== getAdminEmail()) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }
    const { limit: limitNum = 50, startAfter } = request.data || {};
    let query = db.collection('stores')
        .orderBy('createdAt', 'desc')
        .limit(limitNum);
    if (startAfter) {
        const startDoc = await db.collection('stores').doc(startAfter).get();
        if (startDoc.exists) {
            query = query.startAfter(startDoc);
        }
    }
    const snapshot = await query.get();
    const stores = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    return { stores };
});
// Update store plan manually (admin only)
exports.adminUpdateStorePlan = functions.https.onCall(async (request) => {
    var _a;
    // Verify admin
    if (!((_a = request.auth) === null || _a === void 0 ? void 0 : _a.token.email) || request.auth.token.email !== getAdminEmail()) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }
    const { storeId, plan, expiresAt } = request.data;
    if (!storeId || !plan) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing storeId or plan');
    }
    await db.collection('stores').doc(storeId).update({
        plan,
        planExpiresAt: expiresAt ? new Date(expiresAt) : null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: true };
});
// Get all users (admin only)
exports.adminGetAllUsers = functions.https.onCall(async (request) => {
    var _a;
    // Verify admin
    if (!((_a = request.auth) === null || _a === void 0 ? void 0 : _a.token.email) || request.auth.token.email !== getAdminEmail()) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }
    const { limit: limitNum = 50, startAfter } = request.data || {};
    let query = db.collection('users')
        .orderBy('createdAt', 'desc')
        .limit(limitNum);
    if (startAfter) {
        const startDoc = await db.collection('users').doc(startAfter).get();
        if (startDoc.exists) {
            query = query.startAfter(startDoc);
        }
    }
    const snapshot = await query.get();
    const users = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    return { users };
});
// Dashboard stats (admin only)
exports.adminGetDashboardStats = functions.https.onCall(async (request) => {
    var _a;
    // Verify admin
    if (!((_a = request.auth) === null || _a === void 0 ? void 0 : _a.token.email) || request.auth.token.email !== getAdminEmail()) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }
    // Get counts
    const [storesSnapshot, usersSnapshot] = await Promise.all([
        db.collection('stores').count().get(),
        db.collection('users').count().get()
    ]);
    // Get plan distribution
    const planCounts = {
        free: 0,
        pro: 0,
        business: 0
    };
    const storesWithPlans = await db.collection('stores').get();
    storesWithPlans.docs.forEach(doc => {
        const plan = doc.data().plan;
        if (planCounts[plan] !== undefined) {
            planCounts[plan]++;
        }
    });
    return {
        totalStores: storesSnapshot.data().count,
        totalUsers: usersSnapshot.data().count,
        planDistribution: planCounts
    };
});
//# sourceMappingURL=index.js.map