import { db } from "./firebase.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { reload } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

function generateFormsId() {
    return `WW-${Math.floor(10000000 + Math.random() * 90000000)}`;
}

function fallbackUsername(user) {
    return user.displayName?.trim() || user.email?.split("@")[0]?.trim() || "NewUser";
}

const cofounderEmails = new Set([
    "ethan@wasteland-works.com",
    "ren@wasteland-works.com",
    "yodhivah@wasteland-works.com"
]);

function verifiedStaffAccess(user) {
    const email = (user.email || "").trim().toLowerCase();
    const isCompanyEmail = user.emailVerified && email.endsWith("@wasteland-works.com");
    return {
        isCompanyEmail,
        isCofounder: isCompanyEmail && cofounderEmails.has(email)
    };
}

export async function ensureUserProfile(user) {
    if (!user) throw new Error("A signed-in user is required.");

    if ((user.email || "").toLowerCase().endsWith("@wasteland-works.com")) {
        await reload(user);
        await user.getIdToken(true);
    }

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

    const currentProfile = snapshot.data();
    const staffAccess = verifiedStaffAccess(user);
    const updates = {
        email: user.email || "",
        emailVerified: user.emailVerified,
        profilePicture: user.photoURL || currentProfile.profilePicture || "",
        lastLoginAt: serverTimestamp()
    };

    if (staffAccess.isCompanyEmail) {
        updates.membership = "admin";
        updates.accountState = "admin";
    }
    if (staffAccess.isCofounder) {
        updates.role = "founder";
    }

    await setDoc(reference, updates, { merge: true });

    return (await getDoc(reference)).data();
}

export async function getUserProfile(uid) {
    if (!uid) throw new Error("A user ID is required.");
    const snapshot = await getDoc(doc(db, "users", uid));
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}
