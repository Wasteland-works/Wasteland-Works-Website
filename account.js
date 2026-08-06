import { auth, db } from "./firebase.js";
import { ensureUserProfile } from "./profile.js?v=20260806-tiers";
import {
    onAuthStateChanged,
    sendEmailVerification,
    sendPasswordResetEmail,
    signOut,
    updateProfile
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const elements = Object.fromEntries([
    "welcomeMessage", "accountAvatar", "membershipDisplay", "roleDisplay", "verificationDisplay",
    "profileForm", "displayName", "username", "currentEmail", "formsId", "editProfileButton",
    "profileActions", "saveProfileButton", "cancelEditButton", "verifyEmailButton",
    "resetPasswordButton", "logoutButton", "message"
].map(id => [id, document.getElementById(id)]));

let originalProfile = null;

function showMessage(text, type = "success") {
    elements.message.textContent = text;
    elements.message.className = `form-message account-message ${type}`;
}

function setEditing(editing) {
    elements.displayName.disabled = !editing;
    elements.username.disabled = !editing;
    elements.profileActions.hidden = !editing;
    elements.editProfileButton.hidden = editing;
    if (editing) elements.displayName.focus();
}

function fillProfile(user, profile) {
    const name = profile.displayName || profile.username || "Member";
    originalProfile = { displayName: name, username: profile.username || name };
    elements.welcomeMessage.textContent = `Welcome, ${name}`;
    elements.accountAvatar.textContent = name.slice(0, 2).toUpperCase();
    elements.membershipDisplay.textContent = profile.membership === "guest" ? "Visitor" : (profile.membership || "Visitor");
    elements.roleDisplay.textContent = profile.role || "User";
    elements.verificationDisplay.textContent = user.emailVerified ? "Verified" : "Not verified";
    elements.displayName.value = name;
    elements.username.value = profile.username || "";
    elements.currentEmail.value = user.email || "";
    elements.formsId.value = profile.formsId || "Not assigned";
    elements.verifyEmailButton.disabled = user.emailVerified;
    if (user.emailVerified) elements.verifyEmailButton.textContent = "Email verified";
}

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.replace("login.html?return=account");
        return;
    }
    try {
        const profile = await ensureUserProfile(user);
        fillProfile(user, profile);
        if (new URLSearchParams(location.search).has("welcome")) {
            showMessage("Account created. Check your inbox to verify your email.");
        }
    } catch (error) {
        console.error(error);
        showMessage("We couldn’t load your profile. Refresh to try again.", "error");
    }
});

elements.editProfileButton.addEventListener("click", () => setEditing(true));
elements.cancelEditButton.addEventListener("click", () => {
    elements.displayName.value = originalProfile.displayName;
    elements.username.value = originalProfile.username;
    setEditing(false);
});

elements.profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const displayName = elements.displayName.value.trim();
    const username = elements.username.value.trim();
    if (!displayName || username.length < 3) {
        showMessage("Add a display name and a username of at least 3 characters.", "error");
        return;
    }
    elements.saveProfileButton.disabled = true;
    elements.saveProfileButton.textContent = "Saving…";
    try {
        await updateProfile(auth.currentUser, { displayName });
        await setDoc(doc(db, "users", auth.currentUser.uid), { displayName, username }, { merge: true });
        originalProfile = { displayName, username };
        elements.welcomeMessage.textContent = `Welcome, ${displayName}`;
        elements.accountAvatar.textContent = displayName.slice(0, 2).toUpperCase();
        setEditing(false);
        showMessage("Profile saved.");
    } catch (error) {
        console.error(error);
        showMessage("We couldn’t save your profile. Please try again.", "error");
    } finally {
        elements.saveProfileButton.disabled = false;
        elements.saveProfileButton.textContent = "Save changes";
    }
});

elements.verifyEmailButton.addEventListener("click", async () => {
    try {
        await sendEmailVerification(auth.currentUser);
        showMessage("Verification email sent. Check your inbox.");
    } catch (error) {
        showMessage("Couldn’t send verification email. Please try again.", "error");
    }
});

elements.resetPasswordButton.addEventListener("click", async () => {
    try {
        await sendPasswordResetEmail(auth, auth.currentUser.email);
        showMessage("Password reset email sent. Check your inbox.");
    } catch (error) {
        showMessage("Couldn’t send password reset email. Please try again.", "error");
    }
});

elements.logoutButton.addEventListener("click", async () => {
    await signOut(auth);
    window.location.replace("index.html");
});
