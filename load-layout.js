async function loadLayout() {
    const headerTarget = document.getElementById("site-header");
    const footerTarget = document.getElementById("site-footer");

    try {
        const [headerResponse, footerResponse] = await Promise.all([
            fetch("header.html?v=20260805-notifications"),
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

        const [{ auth, db }, { onAuthStateChanged, signOut }] = await Promise.all([
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
                    const { getUserProfile } = await import("./profile.js?v=20260805-team");
                    const profile = await getUserProfile(user.uid);
                    if (teamMessagesLink && ["founder", "employee"].includes(profile.role)) {
                        teamMessagesLink.hidden = false;
                        const { collection, limit, onSnapshot, query, where } = await import("https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js");
                        const unreadQuery = query(collection(db, "teamMessages"), where("recipientId", "==", user.uid), limit(50));
                        onSnapshot(unreadQuery, snapshot => {
                            const hasUnread = snapshot.docs.some(item => !item.data().readAt && item.data().authorId !== user.uid);
                            const signal = document.getElementById("teamNotificationSignal");
                            if (!signal) return;
                            signal.className = `notification-signal ${hasUnread ? "notification-unread" : "notification-clear"}`;
                            signal.title = hasUnread ? "You have an unread team mention" : "No unread mentions";
                            signal.setAttribute("aria-label", signal.title);
                        });
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
