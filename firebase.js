import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getAuth
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCfngAhk7v_L94p2L88voW67vM9yDn9XnI",
    authDomain: "wasteland-works-auth.firebaseapp.com",
    projectId: "wasteland-works-auth",
    storageBucket: "wasteland-works-auth.firebasestorage.app",
    messagingSenderId: "702409339029",
    appId: "1:702409339029:web:bbf4a65cb05980a7d2eb9c"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

export { auth };
