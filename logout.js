import { auth } from "./firebase.js";
import { signOut } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

window.logout = async function () {
    await signOut(auth);
    window.location.replace("login.html");
};
