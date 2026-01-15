/**
 * Firebase Admin SDK Initialization
 * Used for sending push notifications to Android, iOS, and Web
 */
import admin from 'firebase-admin';
import { config } from './index.js';

let firebaseApp: admin.app.App | null = null;

/**
 * Initialize Firebase Admin SDK
 * Returns the app instance or null if credentials are not configured
 */
export function initializeFirebase(): admin.app.App | null {
    // Check if already initialized
    if (firebaseApp) {
        return firebaseApp;
    }

    // Check if Firebase credentials are configured
    const { projectId, privateKey, clientEmail } = config.firebase;

    if (!projectId || !privateKey || !clientEmail) {
        console.warn('⚠️ Firebase not configured: Missing FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, or FIREBASE_CLIENT_EMAIL');
        console.warn('   Push notifications will not work until Firebase is configured.');
        return null;
    }

    try {
        firebaseApp = admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                privateKey,
                clientEmail,
            }),
        });

        console.log('🔥 Firebase Admin SDK initialized successfully');
        return firebaseApp;
    } catch (error) {
        console.error('❌ Firebase initialization failed:', error);
        return null;
    }
}

/**
 * Get the Firebase Messaging instance
 * Returns null if Firebase is not initialized
 */
export function getMessaging(): admin.messaging.Messaging | null {
    const app = initializeFirebase();
    if (!app) {
        return null;
    }
    return admin.messaging(app);
}

/**
 * Check if Firebase is properly configured and initialized
 */
export function isFirebaseConfigured(): boolean {
    return firebaseApp !== null;
}

// Export the admin instance for advanced usage
export { admin };
