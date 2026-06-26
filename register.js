async function createAccount() {

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

    message.textContent = "";

    if (!displayName) {
        message.textContent = "Please enter a display name.";
        return;
    }

    if (password !== confirmPassword) {
        message.textContent = "Passwords do not match.";
        return;
    }

    const { data, error } =
        await supabaseClient.auth.signUp({

            email,
            password,

            options: {

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
