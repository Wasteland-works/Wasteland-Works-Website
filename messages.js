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
const recipientHint = document.getElementById("recipientHint");
const messageBody = document.getElementById("messageBody");
const postButton = document.getElementById("postMessage");
const replyContext = document.getElementById("replyContext");
const replyContextTitle = document.getElementById("replyContextTitle");
const replyContextPreview = document.getElementById("replyContextPreview");
const cancelReply = document.getElementById("cancelReply");
const messageStatus = document.getElementById("messageStatus");
const messageList = document.getElementById("messageList");

let currentUser = null;
let currentProfile = null;
let updateMessages = [];
let privateMessages = [];
let directoryMembers = [];
let replyingTo = null;
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

function messageExcerpt(body) {
    const text = parseReplyBody(body).body.replace(/\s+/g, " ").trim();
    return text.length > 140 ? `${text.slice(0, 137)}…` : text;
}

function parseReplyBody(body) {
    const text = String(body || "");
    const match = text.match(/^\[Reply to: ([^\]]+)\]\n\[Original: ([^\]]*)\]\n\n([\s\S]*)$/);
    return match
        ? { authorName: match[1], excerpt: match[2], body: match[3] }
        : { authorName: null, excerpt: null, body: text };
}

function replyBody(body) {
    if (!replyingTo) return body;
    const authorName = replyingTo.authorName.replace(/[\[\]\n\r]/g, "").trim() || "Team member";
    const excerpt = replyingTo.excerpt.replace(/[\[\]\n\r]/g, " ").trim();
    return `[Reply to: ${authorName}]\n[Original: ${excerpt}]\n\n${body}`;
}

function updatePostButtonLabel() {
    postButton.textContent = replyingTo ? "Post reply" : "Post message";
}

function clearReply() {
    replyingTo = null;
    replyContext.hidden = true;
    replyContextTitle.textContent = "Replying to a message";
    replyContextPreview.textContent = "";
    updatePostButtonLabel();
}

function beginReply(message) {
    const targetId = message.authorId === currentUser.uid ? message.recipientId : message.authorId;
    replyingTo = {
        id: message.id,
        authorName: message.authorName || "Team member",
        excerpt: messageExcerpt(message.body),
        targetId: targetId || null,
        kind: message.kind === "gotIt" ? "gotIt" : "update"
    };
    messageType.value = replyingTo.kind;
    updateMessageTypeHelp();
    replyContextTitle.textContent = `Replying to ${replyingTo.authorName}`;
    replyContextPreview.textContent = replyingTo.excerpt;
    replyContext.hidden = false;
    updatePostButtonLabel();
    messageBody.focus();
    messageBody.scrollIntoView({ behavior: "smooth", block: "center" });
}

cancelReply.addEventListener("click", clearReply);

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
        article.id = `team-message-${message.id}`;

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

        const parsedBody = parseReplyBody(message.body);
        const body = document.createElement("p");
        body.textContent = parsedBody.body;
        article.append(header);

        if (parsedBody.authorName) {
            const replyReference = document.createElement("div");
            replyReference.className = "team-message-reply-reference";
            const replyLabel = document.createElement("strong");
            replyLabel.textContent = `Reply to ${parsedBody.authorName}`;
            const replyPreview = document.createElement("p");
            replyPreview.textContent = parsedBody.excerpt || "Previous message";
            replyReference.append(replyLabel, replyPreview);
            article.append(replyReference);
        }

        article.append(body);

        if (message.recipientName) {
            const recipient = document.createElement("p");
            recipient.className = "team-message-recipient";
            recipient.textContent = `For ${message.recipientName}`;
            article.append(recipient);
        }

        const actions = document.createElement("div");
        actions.className = "form-actions";

        const reply = document.createElement("button");
        reply.className = "button";
        reply.type = "button";
        reply.textContent = "Reply";
        reply.addEventListener("click", () => beginReply(message));
        actions.append(reply);

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
    directoryMembers = snapshot.docs.map(memberSnapshot => ({ id: memberSnapshot.id, ...memberSnapshot.data() }));
}

function updateMessageTypeHelp() {
    const directOnly = messageType.value === "gotIt";
    recipientHint.textContent = directOnly
        ? "A Got it message needs an @username. Only that person sees it, and it disappears when acknowledged."
        : "Type @username to notify someone, or leave out the mention for a blue general update.";
}

messageType.addEventListener("change", updateMessageTypeHelp);

function resolveMention(body) {
    const matches = [...body.matchAll(/(?:^|\s)@([a-z0-9._-]+)/gi)];
    if (!matches.length) return { member: null, mentionFound: false };
    const requested = matches[0][1].toLowerCase();
    const member = directoryMembers.find(item =>
        item.usernameLower === requested
        || String(item.username || "").toLowerCase() === requested
        || String(item.displayName || "").toLowerCase().replace(/\s+/g, "") === requested.replace(/\s+/g, "")
    );
    return { member: member || null, mentionFound: true };
}

postButton.addEventListener("click", async () => {
    const body = messageBody.value.trim();
    const mention = resolveMention(body);
    const replyMember = replyingTo?.targetId
        ? directoryMembers.find(item => item.id === replyingTo.targetId)
        : null;
    const recipient = mention.member || replyMember || null;
    const recipientId = recipient?.id || null;
    if (!body) {
        messageStatus.textContent = "Write a message before posting.";
        messageStatus.className = "form-message error";
        return;
    }
    if (mention.mentionFound && !recipientId) {
        messageStatus.textContent = "That @username is not registered as a Wasteland Works team account.";
        messageStatus.className = "form-message error";
        return;
    }
    if (messageType.value === "gotIt" && !recipientId) {
        messageStatus.textContent = "Add the recipient’s @username to this Got it message.";
        messageStatus.className = "form-message error";
        return;
    }

    postButton.disabled = true;
    postButton.textContent = "Posting…";
    try {
        await addDoc(collection(db, "teamMessages"), {
            authorId: currentUser.uid,
            authorName: currentProfile.displayName || currentProfile.username || currentUser.email || "Team member",
            body: replyBody(body),
            kind: messageType.value,
            recipientId,
            recipientName: recipientId ? recipient.displayName : null,
            recipientEmail: recipientId ? recipient.email : null,
            readAt: null,
            emailStatus: recipientId ? "pending" : "not-needed",
            createdAt: serverTimestamp()
        });
        messageBody.value = "";
        clearReply();
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
        updatePostButtonLabel();
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
            username: currentProfile.username || currentProfile.displayName || user.email.split("@")[0],
            usernameLower: (currentProfile.username || currentProfile.displayName || user.email.split("@")[0]).toLowerCase(),
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
