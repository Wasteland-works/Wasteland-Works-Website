import { auth } from "./firebase.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

const email = document.getElementById("email");
const password = document.getElementById("password");
const status = document.getElementById("status");

document.getElementById("signupBtn").addEventListener("click", async () => {

    try {

        await createUserWithEmailAndPassword(
            auth,
            email.value,
            password.value
        );

        status.textContent = "Account created successfully.";

    }

    catch(error){

        status.textContent = error.message;

    }

});

document.getElementById("loginBtn").addEventListener("click", async () => {

    try{
