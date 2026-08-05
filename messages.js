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
    serverTimestamp,
    setDoc,
    updateDoc,
    where
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { getUserProfile } from "./profile.js?v=20260805-team";

const accessStatus = document.getElementById("accessStatus");
const accessMessage = document.getElementById("accessMessage");
const teamBoard = document.getElementById("teamBoard");
const messageType = document.getElementById("messageType");
const messageRecipient = document.getElementById("messageRecipient");
const recipientHint = document.getElementById("recipientHint");
const messageBody = document.getElementById("messageBody");
const postButton = document.getElementById("postMessage");
const messageStatus = document.getElementById("messageStatus");
const messageList = document.getElementById("messageList");

let currentUser = null;
let currentProfile = null;
let updateMessages = [];
let privateMessages = [];
const listeners = [];

function isTeamMember(profile) {
    return profile && ["founder", "employee"].includes(profile.role);
}

function formatDate(timestamp) {
    if (!timestamp?.toDate) return "Just now";
    return timestamp.toDate().toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function signalClass(message) {
    if (!message.recipientId) return "notification-general";
    if (message.authorId === currentUser.uid || message.readAt) return "notification-clear";
    return "notification-unread";
}

function signalLabel(message) {
    if (!message.recipientId) return "General team update";
    if (message.authorId === currentUser.uid || message.readAt) return "Mention read";
    return "Unread mention";
}

function allVisibleMessages() {
    const byId = new Map([...updateMessages, ...privateMessages].map(item => [item.id, item]));
    return [...byId.values()].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
}

function renderMessages() {
    const messages = allVisibleMessages();
    messageList.replaceChildren();
    if (!messages.length) {
        const empty = document.createElement("p");
        empty.className = "muted";
        empty.textContent = "No team messages yet.";
        messageList.append(empty);
        return;
    }

    messages.forEach(message => {
        const article = document.createElement("article");
        article.className = "team-message";

        const header = document.createElement("div");
        header.className = "team-message-header";
        const authorGroup = document.createElement("div");
        const signal = document.createElement("span");
        signal.className = `notification-signal ${signalClass(message)}`;
        signal.title = signalLabel(message);
        signal.setAttribute("aria-label", signalLabel(message));
        const author = document.createElement("strong");
        author.textContent = message.authorName || "Team member";
        authorGroup.append(signal, author);
        const time = document.createElement("time");
        time.textContent = formatDate(message.createdAt);
        header.append(authorGroup, time);

        const body = document.createElement("p");
        body.textContent = message.body || "";
        article.append(header, body);

        if (message.recipientName) {
            const recipient = document.createElement("p");
            recipient.className = "team-message-recipient";
            recipient.textContent = `For ${message.recipientName}`;
            article.append(recipient);
        }

        const actions = document.createElement("div");
        actions.className = "form-actions";

        if (message.recipientId === currentUser.uid && !message.readAt && message.kind === "update") {
            const markRead = document.createElement("button");
            markRead.className = "button";
            markRead.type = "button";
            markRead.textContent = "Mark as read";
            markRead.addEventListener("click", () => updateDoc(doc(db, "teamMessages", message.id), { readAt: serverTimestamp() }));
            actions.append(markRead);
        }

        if (message.recipientId === currentUser.uid && message.kind === "gotIt") {
            const acknowledge = document.createElement("button");
            acknowledge.className = "button button-solid";
            acknowledge.type = "button";
            acknowledge.textContent = "Got it";
            acknowledge.addEventListener("click", () => deleteDoc(doc(db, "teamMessages", message.id)));
            actions.append(acknowledge);
        }

        if (message.authorId === currentUser.uid || currentProfile.role === "founder") {
            const remove = document.createElement("button");
            remove.className = "button";
            remove.type = "button";
            remove.textContent = "Delete";
            remove.addEventListener("click", async () => {
                if (!window.confirm("Delete this team message?")) return;
                await deleteDoc(doc(db, "teamMessages", message.id));
            });
            actions.append(remove);
        }

        if (actions.childElementCount) article.append(actions);
        messageList.append(article);
    });
}

function fillDirectory(snapshot) {
    const selected = messageRecipient.value;
    messageRecipient.length = 1;
    snapshot.forEach(memberSnapshot => {
        if (memberSnapshot.id === currentUser.uid) return;
        const member = memberSnapshot.data();
        const option = document.createElement("option");
        option.value = memberSnapshot.id;
        option.textContent = `${member.displayName} — ${member.role}`;
        option.dataset.name = member.displayName;
        option.dataset.email = member.email;
        messageRecipient.append(option);
    });
    messageRecipient.value = selected;
}

function updateMessageTypeHelp() {
    const directOnly = messageType.value === "gotIt";
    if (directOnly && !messageRecipient.value) {
        recipientHint.textContent = "A Got it message needs one named recipient and disappears when they acknowledge it.";
    } else if (directOnly) {
        recipientHint.textContent = "Only the selected person will see this message. It disappears when they press Got it.";
    } else if (messageRecipient.value) {
        recipientHint.textContent = "This permanent update stays on the board; the recipient’s red notification turns green when read.";
    } else {
        recipientHint.textContent = "General updates are shown to the whole team with a blue signal.";
    }
}

messageType.addEventListener("change", updateMessageTypeHelp);
messageRecipient.addEventListener("change", updateMessageTypeHelp);

postButton.addEventListener("click", async () => {
    const body = messageBody.value.trim();
    const recipientOption = messageRecipient.selectedOptions[0];
    const recipientId = messageRecipient.value || null;
    if (!body) {
        messageStatus.textContent = "Write a message before posting.";
        messageStatus.className = "form-message error";
        return;
    }
    if (messageType.value === "gotIt" && !recipientId) {
        messageStatus.textContent = "Choose who should receive this Got it message.";
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
            kind: messageType.value,
            recipientId,
            recipientName: recipientId ? recipientOption.dataset.name : null,
            recipientEmail: recipientId ? recipientOption.dataset.email : null,
            readAt: null,
            emailStatus: recipientId ? "pending" : "not-needed",
            createdAt: serverTimestamp()
        });
        messageBody.value = "";
        messageStatus.textContent = recipientId
            ? "Message posted and the recipient has been notified on the website."
            : "General update posted.";
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

function startMessageFeed() {
    const updatesQuery = query(collection(db, "teamMessages"), where("kind", "==", "update"), limit(100));
    const privateQuery = query(collection(db, "teamMessages"), where("recipientId", "==", currentUser.uid), limit(100));
    listeners.push(onSnapshot(updatesQuery, snapshot => {
        updateMessages = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
        renderMessages();
    }));
    listeners.push(onSnapshot(privateQuery, snapshot => {
        privateMessages = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
        renderMessages();
    }));
}

onAuthStateChanged(auth, async user => {
    listeners.splice(0).forEach(stop => stop());
    if (!user) {
        window.location.replace("login.html?return=messages");
        return;
    }

    try {
        currentUser = user;
        currentProfile = await getUserProfile(user.uid);
        if (!isTeamMember(currentProfile)) {
            accessMessage.textContent = "This private page is available only to Wasteland Works cofounders and employees.";
            return;
        }

        await setDoc(doc(db, "teamDirectory", user.uid), {
            uid: user.uid,
            displayName: currentProfile.displayName || currentProfile.username || user.email,
            email: user.email,
            role: currentProfile.role,
            updatedAt: serverTimestamp()
        });
        listeners.push(onSnapshot(query(collection(db, "teamDirectory"), orderBy("displayName")), fillDirectory));
        accessStatus.hidden = true;
        teamBoard.hidden = false;
        startMessageFeed();
        updateMessageTypeHelp();
    } catch (error) {
        console.error("Could not verify team access.", error);
        accessMessage.textContent = "Your team access could not be verified.";
    }
});
