// ============================================
// AMISTY POS - FIREBASE CONFIGURATION
// Replace with your Firebase project credentials
// Go to: https://console.firebase.google.com/
// ============================================

// Your Firebase configuration
// Get these from Firebase Console > Project Settings > General > Your apps > Web app
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDi3n9eFgPuGMOtY-0WSHoIW3TyDGwtvnA",
  authDomain: "amisty-pos.firebaseapp.com",
  projectId: "amisty-pos",
  storageBucket: "amisty-pos.firebasestorage.app",
  messagingSenderId: "129988160572",
  appId: "1:129988160572:web:7eeed38145f0e4e80e6739"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Firebase service references
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Enable offline persistence (important for shops with poor internet)
db.enablePersistence()
    .then(() => {
        console.log('✅ Offline persistence enabled - App works without internet!');
    })
    .catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn('⚠️ Multiple tabs open - persistence limited');
        } else if (err.code === 'unimplemented') {
            console.warn('⚠️ Browser doesn\'t support offline persistence');
        }
    });

// Firestore Settings
db.settings({
    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
});

// Collection References
const usersCollection = db.collection('users');
const productsCollection = db.collection('products');
const transactionsCollection = db.collection('transactions');
const categoriesCollection = db.collection('categories');
const settingsCollection = db.collection('settings');
const stockHistoryCollection = db.collection('stockHistory');


// Firebase ready flag
let firebaseReady = false;

// Test connection
async function testFirebaseConnection() {
    try {
        const testDoc = await settingsCollection.doc('shop').get();
        firebaseReady = true;
        console.log('🔥 Firebase connected successfully!');
        console.log('📊 Collections ready:', {
            users: usersCollection.path,
            products: productsCollection.path,
            transactions: transactionsCollection.path,
            categories: categoriesCollection.path,
            settings: settingsCollection.path,
            stockHistory: stockHistoryCollection.path
        });
        return true;
    } catch (error) {
        console.error('❌ Firebase connection error:', error.message);
        console.log('💡 Make sure:');
        console.log('  1. Firebase project is created');
        console.log('  2. Firestore database is created in Firebase Console');
        console.log('  3. Storage is enabled in Firebase Console');
        console.log('  4. Authentication (Email/Password) is enabled');
        return false;
    }
}

// Run connection test
testFirebaseConnection().then(isConnected => {
    if (!isConnected) {
        console.warn('⚠️ Using offline mode until connection is restored');
    }
});

// Security Rules Reminder
console.log(`
📋 FIREBASE SETUP CHECKLIST:
✅ 1. Create Firebase project at https://console.firebase.google.com/
✅ 2. Enable Firestore Database (in test mode initially)
✅ 3. Enable Storage
✅ 4. Enable Email/Password Authentication
✅ 5. Replace firebaseConfig above with your credentials
✅ 6. Deploy Firestore Security Rules (see below)

🔒 RECOMMENDED FIRESTORE SECURITY RULES:
------------------------------------------------
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users can read/write their own data
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        (request.auth.uid == userId || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'manager');
    }
    
    // Products - managers write, all authenticated read
    match /products/{productId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'manager';
    }
    
    // Transactions - authenticated can write, all can read own
    match /transactions/{transactionId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
    }
    
    // Categories - managers manage, all read
    match /categories/{categoryId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'manager';
    }
    
    // Settings - managers only
    match /settings/{settingId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'manager';
    }
    
    // Stock History - managers write, all read
    match /stockHistory/{historyId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
    }
  }
}

🔒 RECOMMENDED STORAGE SECURITY RULES:
------------------------------------------------
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /logos/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    match /backups/{allPaths=**} {
      allow read, write: if request.auth != null && 
        firebase.get(/databases/(default)/documents/users/$(request.auth.uid)).data.role == 'manager';
    }
  }
}
`);

// Export for use in other files
console.log('🚀 Amisty POS Firebase initialized');
