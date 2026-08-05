async function loadLayout() {
    const headerTarget = document.getElementById("site-header");
    const footerTarget = document.getElementById("site-footer");

    try {
        const [headerResponse, footerResponse] = await Promise.all([
            fetch("header.html"),
            fetch("footer.html")
        ]);
        if (!headerResponse.ok || !footerResponse.ok) throw new Error("Layout unavailable");

        headerTarget.innerHTML = await headerResponse.text();
        footerTarget.innerHTML = await footerResponse.text();

        const menuToggle = document.getElementById("menuToggle");
        const mainNav = document.getElementById("mainNav");
        menuToggle?.addEventListener("click", () => {
            const open = mainNav.classList.toggle("open");
            menuToggle.setAttribute("aria-expanded", String(open));
        });

        const [{ auth }, { onAuthStateChanged, signOut }] = await Promise.all([
            import("./firebase.js"),
            import("https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js")
        ]);

        onAuthStateChanged(auth, async (user) => {
            const userLinks = document.getElementById("userLinks");
            const teamMessagesLink = document.getElementById("teamMessagesLink");
            if (!userLinks) return;

            if (user) {
                const name = user.displayName || user.email?.split("@")[0] || "Account";
                userLinks.innerHTML = `
                    <a class="nav-account" href="account.html">${escapeText(name)}</a>
                    <button class="nav-logout" id="navLogout" type="button">Log out</button>
                `;
                document.getElementById("navLogout").addEventListener("click", async () => {
                    await signOut(auth);
                    window.location.href = "index.html";
                });

                try {
                    const { ensureUserProfile } = await import("./profile.js");
                    const profile = await ensureUserProfile(user);
                    if (teamMessagesLink && ["founder", "employee"].includes(profile.role)) {
                        teamMessagesLink.hidden = false;
                    }
                } catch (error) {
                    console.error("Could not check team access.", error);
                }
            } else {
                userLinks.innerHTML = '<a class="nav-account" href="login.html">Sign in</a>';
            }
        });
    } catch (error) {
        console.error("Could not load the site layout.", error);
    }
}

function escapeText(value) {
    const element = document.createElement("span");
    element.textContent = value;
    return element.innerHTML;
}

loadLayout();
