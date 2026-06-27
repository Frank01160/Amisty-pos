// ============================================
// AMISTY POS - FIREBASE CONFIGURATION
// ============================================

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDi3n9eFgPuGMOtY-0WSHoIW3TyDGwtvnA",
  authDomain: "amisty-pos.firebaseapp.com",
  projectId: "amisty-pos",
  storageBucket: "amisty-pos.firebasestorage.app",
  messagingSenderId: "129988160572",
  appId: "1:129988160572:web:7eeed38145f0e4e80e6739"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firebase service references
const auth = firebase.auth();
const db = firebase.firestore();

// Enable offline persistence
db.enablePersistence()
    .then(() => console.log('✅ Offline mode enabled'))
    .catch((err) => console.warn('⚠️ Offline:', err.message));

// Collection references
const usersCollection = db.collection('users');
const productsCollection = db.collection('products');
const transactionsCollection = db.collection('transactions');
const categoriesCollection = db.collection('categories');
const settingsCollection = db.collection('settings');
const stockHistoryCollection = db.collection('stockHistory');

console.log('🔥 Amisty POS Firebase Ready');
