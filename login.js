import {
    auth,
    signInWithEmailAndPassword
} from "./firebase.js";

window.login = async function () {

    const email =
        document.getElementById("email").value.trim();

    const password =
        document.getElementById("password").value;

    const message =
        document.getElementById("message");

    message.textContent = "";

    try {

        await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        window.location.href = "index.html";

    }
    catch (error) {

        message.textContent = error.message;

    }

};
