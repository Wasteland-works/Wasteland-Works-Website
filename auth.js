async function checkAuth() {
    const { data } = await supabaseClient.auth.getSession();

    if (!data.session) {
        window.location.href = "login.html";
    }
}

checkAuth();
