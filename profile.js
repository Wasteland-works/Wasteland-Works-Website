import { db } from "./firebase.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

function generateFormsId() {
    return `WW-${Math.floor(10000000 + Math.random() * 90000000)}`;
}

function fallbackUsername(user) {
    return user.displayName?.trim() || user.email?.split("@")[0]?.trim() || "NewUser";
}

export async function ensureUserProfile(user) {
    if (!user) throw new Error("A signed-in user is required.");

    const reference = doc(db, "users", user.uid);
    const snapshot = await getDoc(reference);

    if (!snapshot.exists()) {
        const username = fallbackUsername(user);
        const profile = {
            uid: user.uid,
            username,
            displayName: username,
            email: user.email || "",
            emailVerified: user.emailVerified,
            profilePicture: user.photoURL || "",
            formsId: generateFormsId(),
            membership: "guest",
            role: "user",
            specialAccess: {
                enabled: false,
                resources: {
                    pipboy3000: false,
                    vaultOS: false,
                    authenticationTemplate: true,
                    espBoy: false
                }
            },
            accountState: "guest",
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp()
        };
        await setDoc(reference, profile);
        return profile;
    }

    await setDoc(reference, {
        email: user.email || "",
        emailVerified: user.emailVerified,
        profilePicture: user.photoURL || snapshot.data().profilePicture || "",
        lastLoginAt: serverTimestamp()
    }, { merge: true });

    return (await getDoc(reference)).data();
}

export async function getUserProfile(uid) {
    if (!uid) throw new Error("A user ID is required.");
    const snapshot = await getDoc(doc(db, "users", uid));
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}
