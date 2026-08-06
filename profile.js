import { db } from "./firebase.js";
import { deleteField, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { reload } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

function generateFormsId() {
    return `WW-${Math.floor(10000000 + Math.random() * 90000000)}`;
}

function fallbackUsername(user) {
    return user.displayName?.trim() || user.email?.split("@")[0]?.trim() || "NewUser";
}

const cofounderEmails = new Set([
    "lee@wasteland-works.com",
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

async function syncTeamDirectory(user, profile) {
    if (!["founder", "employee"].includes(profile.role)) return;
    const username = profile.username || profile.displayName || user.email?.split("@")[0] || "team-member";
    await setDoc(doc(db, "teamDirectory", user.uid), {
        uid: user.uid,
        username,
        usernameLower: username.toLowerCase(),
        displayName: profile.displayName || username,
        email: user.email || "",
        role: profile.role,
        updatedAt: serverTimestamp()
    }, { merge: true });
}

export async function ensureUserProfile(user) {
    if (!user) throw new Error("A signed-in user is required.");

    if ((user.email || "").toLowerCase().endsWith("@wasteland-works.com") && !user.emailVerified) {
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
    if (Object.prototype.hasOwnProperty.call(currentProfile, "specialAccess")) {
        updates.specialAccess = deleteField();
    }

    if (staffAccess.isCompanyEmail) {
        updates.membership = "admin";
        updates.accountState = "admin";
    }
    if (staffAccess.isCofounder) {
        updates.role = "founder";
    } else if (staffAccess.isCompanyEmail) {
        updates.role = "employee";
    }

    await setDoc(reference, updates, { merge: true });
    const savedProfile = (await getDoc(reference)).data();
    await syncTeamDirectory(user, savedProfile);
    return savedProfile;
}

export async function getUserProfile(uid) {
    if (!uid) throw new Error("A user ID is required.");
    const snapshot = await getDoc(doc(db, "users", uid));
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}
