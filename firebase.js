import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-storage.js";

// Public web configuration for the official Wasteland Works Firebase project.
const firebaseConfig = {
    apiKey: "AIzaSyCaW7AhM5J_3O0imK07-WoSqp7jJfcsdt8",
    authDomain: "wasteland-works-official.firebaseapp.com",
    projectId: "wasteland-works-official",
    storageBucket: "wasteland-works-official.firebasestorage.app",
    messagingSenderId: "446534625351",
    appId: "1:446534625351:web:945bd7583cc686edf26962"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

export { auth, db, storage, googleProvider };
