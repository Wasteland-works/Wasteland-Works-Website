import { auth } from "./firebase.js";
import { ensureUserProfile } from "./profile.js";
import {
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    sendEmailVerification,
    updateProfile
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

const form = document.getElementById("registerForm");
const displayName = document.getElementById("displayName");
const email = document.getElementById("email");
const password = document.getElementById("password");
const confirmation = document.getElementById("confirmPassword");
const button = document.getElementById("registerButton");
const message = document.getElementById("message");
let creating = false;

function showMessage(text, type = "") {
    message.textContent = text;
    message.className = `form-message ${type}`;
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (displayName.value.trim().length < 3) {
        showMessage("Display name must be at least 3 characters.", "error");
        return;
    }
    if (password.value !== confirmation.value) {
        showMessage("The passwords do not match.", "error");
        return;
    }

    creating = true;
    button.disabled = true;
    button.textContent = "Creating account…";
    showMessage("Building your member profile…");

    try {
        const credential = await createUserWithEmailAndPassword(auth, email.value.trim(), password.value);
        await updateProfile(credential.user, { displayName: displayName.value.trim() });
        await ensureUserProfile(credential.user);
        await sendEmailVerification(credential.user);
        window.location.replace("account.html?welcome=1");
    } catch (error) {
        console.error(error);
        const errors = {
            "auth/email-already-in-use": "An account already exists for that email.",
            "auth/invalid-email": "Enter a valid email address.",
            "auth/weak-password": "Use a password with at least 6 characters."
        };
        creating = false;
        button.disabled = false;
        button.textContent = "Create account";
        showMessage(errors[error.code] || "Couldn’t create the account. Please try again.", "error");
    }
});

onAuthStateChanged(auth, (user) => {
    if (user && !creating) window.location.replace("account.html");
});
