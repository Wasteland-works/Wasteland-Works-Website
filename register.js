import {
    auth,
    createUserWithEmailAndPassword,
    updateProfile
} from "./firebase.js";

window.createAccount = async function () {

    const displayName =
        document.getElementById("displayName").value.trim();

    const email =
        document.getElementById("email").value.trim();

    const password =
        document.getElementById("password").value;

    const confirmPassword =
        document.getElementById("confirmPassword").value;

    const message =
        document.getElementById("message");

    const button =
        document.getElementById("registerButton");

    message.textContent = "";

    if (displayName === "") {
        message.textContent = "Please enter a display name.";
        return;
    }

    if (email === "") {
        message.textContent = "Please enter your email address.";
        return;
    }

    if (password.length < 6) {
        message.textContent = "Password must be at least 6 characters.";
        return;
    }

    if (password !== confirmPassword) {
        message.textContent = "Passwords do not match.";
        return;
    }

    try {

        button.disabled = true;
        button.textContent = "Creating Account...";

        const userCredential =
            await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );

        await updateProfile(
            userCredential.user,
            {
                displayName: displayName
            }
        );

        message.textContent =
            "Account created successfully! Redirecting...";

        setTimeout(() => {

            window.location.href = "login.html";

        }, 1500);

    }
    catch (error) {

        console.error(error);

        message.textContent = error.message;

        button.disabled = false;
        button.textContent = "Create Account";

    }

};        message.textContent =
            "Password must be at least 6 characters.";
        return;
    }

    if (password !== confirmPassword) {
        message.textContent =
            "Passwords do not match.";
        return;
    }

    try {

        const userCredential =
            await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );

        await updateProfile(
            userCredential.user,
            {
                displayName: displayName
            }
        );

        message.textContent =
            "Account created successfully! Redirecting...";

        setTimeout(() => {

            window.location.href = "login.html";

        }, 1500);

    }
    catch (error) {

        message.textContent = error.message;

    }

};
                data: {
                    display_name: displayName
                }

            }

        });

    if (error) {

        message.textContent = error.message;
        return;

    }

    message.textContent =
        "Account created! Please check your email to verify your account.";

}
