import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-storage.js";

// This is the Firebase project from the working authentication example.
const firebaseConfig = {
    apiKey: "AIzaSyDkmoyIV57i7Zr7o5VA41y4wl9koiz510",
    authDomain: "test-auth-6b1c6.firebaseapp.com",
    projectId: "test-auth-6b1c6",
    storageBucket: "test-auth-6b1c6.firebasestorage.app",
    messagingSenderId: "117669694143",
    appId: "1:117669694143:web:263ab22991e90fe49e140a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

export { auth, db, storage, googleProvider };
