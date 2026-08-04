import { auth } from "./firebase.js";
import { ensureUserProfile } from "./profile.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

document.body.classList.add("auth-pending");

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.replace("login.html?return=admin");
        return;
    }

    try {
        const profile = await ensureUserProfile(user);
        if (profile.role !== "founder" && profile.membership !== "admin") {
            window.location.replace("account.html?access=denied");
            return;
        }
        document.body.classList.remove("auth-pending");
    } catch (error) {
        console.error(error);
        window.location.replace("account.html?access=error");
    }
});
