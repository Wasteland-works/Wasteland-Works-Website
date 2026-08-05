import { auth } from "./firebase.js";
import { ensureUserProfile } from "./profile.js";
import {
    onAuthStateChanged,
    sendPasswordResetEmail,
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

const form = document.getElementById("loginForm");
const email = document.getElementById("email");
const password = document.getElementById("password");
const button = document.getElementById("loginButton");
const reset = document.getElementById("resetPassword");
const message = document.getElementById("message");
let signingIn = false;
const requestedPage = new URLSearchParams(window.location.search).get("return");
const safeDestinations = {
    admin: "admin.html",
    messages: "messages.html"
};
const destination = safeDestinations[requestedPage] || "account.html";

const errors = {
    "auth/invalid-credential": "That email or password doesn’t look right.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/too-many-requests": "Too many attempts. Please wait and try again.",
    "auth/network-request-failed": "Couldn’t connect. Check your internet connection."
};

function showMessage(text, type = "") {
    message.textContent = text;
    message.className = `form-message ${type}`;
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    signingIn = true;
    button.disabled = true;
    button.textContent = "Signing in…";
    showMessage("Checking your account…");

    try {
        const credential = await signInWithEmailAndPassword(auth, email.value.trim(), password.value);
        await ensureUserProfile(credential.user);
        window.location.replace(destination);
    } catch (error) {
        console.error(error);
        signingIn = false;
        button.disabled = false;
        button.textContent = "Sign in";
        showMessage(errors[error.code] || "Sign-in failed. Please try again.", "error");
    }
});

reset.addEventListener("click", async () => {
    if (!email.validity.valid) {
        showMessage("Enter your email address first.", "error");
        email.focus();
        return;
    }
    try {
        await sendPasswordResetEmail(auth, email.value.trim());
        showMessage("Password reset email sent.", "success");
    } catch (error) {
        showMessage(errors[error.code] || "Couldn’t send the reset email.", "error");
    }
});

onAuthStateChanged(auth, (user) => {
    if (user && !signingIn) window.location.replace(destination);
});
