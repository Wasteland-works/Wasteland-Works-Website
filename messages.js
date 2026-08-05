import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    limit,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { ensureUserProfile } from "./profile.js";

const accessStatus = document.getElementById("accessStatus");
const accessMessage = document.getElementById("accessMessage");
const teamBoard = document.getElementById("teamBoard");
const messageBody = document.getElementById("messageBody");
const postButton = document.getElementById("postMessage");
const messageStatus = document.getElementById("messageStatus");
const messageList = document.getElementById("messageList");

let currentUser = null;
let currentProfile = null;
let stopListening = null;

function isTeamMember(profile) {
    return profile && ["founder", "employee"].includes(profile.role);
}

function formatDate(timestamp) {
    if (!timestamp?.toDate) return "Just now";
    return timestamp.toDate().toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function renderMessages(snapshot) {
    messageList.replaceChildren();
    if (snapshot.empty) {
        const empty = document.createElement("p");
        empty.className = "muted";
        empty.textContent = "No team messages yet.";
        messageList.append(empty);
        return;
    }

    snapshot.forEach(messageSnapshot => {
        const message = messageSnapshot.data();
        const article = document.createElement("article");
        article.className = "team-message";

        const header = document.createElement("div");
        header.className = "team-message-header";
        const author = document.createElement("strong");
        author.textContent = message.authorName || "Team member";
        const time = document.createElement("time");
        time.textContent = formatDate(message.createdAt);
        header.append(author, time);

        const body = document.createElement("p");
        body.textContent = message.body || "";
        article.append(header, body);

        if (message.authorId === currentUser.uid || currentProfile.role === "founder") {
            const actions = document.createElement("div");
            actions.className = "form-actions";
            const remove = document.createElement("button");
            remove.className = "button";
            remove.type = "button";
            remove.textContent = "Delete";
            remove.addEventListener("click", async () => {
                if (!window.confirm("Delete this team message?")) return;
                await deleteDoc(doc(db, "teamMessages", messageSnapshot.id));
            });
            actions.append(remove);
            article.append(actions);
        }

        messageList.append(article);
    });
}

function startMessageFeed() {
    const messagesQuery = query(collection(db, "teamMessages"), orderBy("createdAt", "desc"), limit(100));
    stopListening = onSnapshot(messagesQuery, renderMessages, error => {
        console.error("Could not load team messages.", error);
        messageList.innerHTML = '<p class="form-message error">Team messages could not be loaded.</p>';
    });
}

postButton.addEventListener("click", async () => {
    const body = messageBody.value.trim();
    if (!body) {
        messageStatus.textContent = "Write a message before posting.";
        messageStatus.className = "form-message error";
        return;
    }

    postButton.disabled = true;
    postButton.textContent = "Posting…";
    try {
        await addDoc(collection(db, "teamMessages"), {
            authorId: currentUser.uid,
            authorName: currentProfile.displayName || currentProfile.username || currentUser.email || "Team member",
            body,
            createdAt: serverTimestamp()
        });
        messageBody.value = "";
        messageStatus.textContent = "Message posted.";
        messageStatus.className = "form-message success";
    } catch (error) {
        console.error("Could not post team message.", error);
        messageStatus.textContent = "The message could not be posted.";
        messageStatus.className = "form-message error";
    } finally {
        postButton.disabled = false;
        postButton.textContent = "Post message";
    }
});

onAuthStateChanged(auth, async user => {
    stopListening?.();
    if (!user) {
        window.location.replace("login.html?return=messages");
        return;
    }

    try {
        currentUser = user;
        currentProfile = await ensureUserProfile(user);
        if (!isTeamMember(currentProfile)) {
            accessMessage.textContent = "This private page is available only to Wasteland Works cofounders and employees.";
            return;
        }

        accessStatus.hidden = true;
        teamBoard.hidden = false;
        startMessageFeed();
    } catch (error) {
        console.error("Could not verify team access.", error);
        accessMessage.textContent = "Your team access could not be verified.";
    }
});
