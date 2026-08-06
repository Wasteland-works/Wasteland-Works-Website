import { auth, db } from "./firebase.js";
import { collection, doc, getDoc, getDocs, orderBy, query } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const projectId = new URLSearchParams(location.search).get("id");
const titleElement = document.getElementById("projectTitle");
const descriptionElement = document.getElementById("projectDescription");
const contentElement = document.getElementById("projectContent");
const notesList = document.getElementById("notesList");
const fileList = document.getElementById("fileList");
const DOWNLOAD_GATEWAY = "https://wasteland-works-downloads.wellslee903.workers.dev";

async function startProtectedDownload(assetId) {
    const user = auth.currentUser;
    if (!user) throw new Error("Sign in with an authorised membership to download this file.");
    const token = await user.getIdToken();
    const response = await fetch(`${DOWNLOAD_GATEWAY}/ticket/${assetId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.downloadUrl) {
        throw new Error(result.error || "Your membership does not include this download.");
    }
    window.location.assign(result.downloadUrl);
}

async function loadProject() {
    if (!projectId) throw new Error("No project selected.");
    const snapshot = await getDoc(doc(db, "projects", projectId));
    if (!snapshot.exists()) throw new Error("Project not found.");
    const project = snapshot.data();
    document.title = `${project.title || "Project"} - Wasteland Works`;
    titleElement.textContent = project.title || "Untitled project";
    descriptionElement.textContent = project.description || "No description yet.";
    contentElement.textContent = project.content || "No overview yet.";
}

async function loadNotes() {
    const snapshot = await getDocs(query(collection(db, "projects", projectId, "notes"), orderBy("createdAt", "desc")));
    notesList.textContent = "";
    if (snapshot.empty) {
        notesList.textContent = "No notes yet.";
        return;
    }
    snapshot.forEach(noteSnapshot => {
        const note = noteSnapshot.data();
        const entry = document.createElement("article");
        entry.className = "project-entry";
        const date = document.createElement("strong");
        date.textContent = note.createdAt?.toDate?.().toLocaleString() || "Recent update";
        const text = document.createElement("p");
        text.textContent = note.text || "";
        entry.append(date, text);
        notesList.append(entry);
    });
}

async function loadFiles() {
    const catalogSnapshot = await getDocs(collection(db, "resourceCatalog"));
    const catalog = new Map(catalogSnapshot.docs.map(item => [item.id, item.data()]));
    const snapshot = await getDocs(query(collection(db, "projects", projectId, "files"), orderBy("createdAt", "desc")));
    fileList.textContent = "";
    if (snapshot.empty) {
        fileList.textContent = "No files uploaded yet.";
        return;
    }
    snapshot.forEach(fileSnapshot => {
        const file = fileSnapshot.data();
        const entry = document.createElement("article");
        entry.className = "project-entry";
        if (file.type?.startsWith("image/") && file.url) {
            const image = document.createElement("img");
            image.className = "project-image";
            image.src = file.url;
            image.alt = file.name || "Project image";
            entry.append(image);
        }
        if (file.githubAssetId) {
            const access = document.createElement("p");
            access.className = "muted";
            const resource = catalog.get(file.resourceKey);
            access.textContent = resource
                ? `Download access: ${resource.minimumTier === "visitor" ? "Visitors" : resource.minimumTier} and above`
                : "Download access: administrators until classified";
            entry.append(access);
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = file.name || "Download file";
            button.addEventListener("click", async () => {
                button.disabled = true;
                const originalText = button.textContent;
                button.textContent = "Preparing download…";
                try {
                    await startProtectedDownload(String(file.githubAssetId));
                } catch (error) {
                    console.error(error);
                    button.disabled = false;
                    button.textContent = originalText;
                    alert(error.message);
                }
            });
            entry.append(button);
        } else if (file.url) {
            const link = document.createElement("a");
            link.href = file.url;
            link.target = "_blank";
            link.rel = "noopener";
            link.textContent = file.name || "Open file";
            entry.append(link);
        }
        fileList.append(entry);
    });
}

Promise.all([
    loadProject(),
    loadNotes(),
    loadFiles().catch(error => {
        if (error.code === "permission-denied") {
            fileList.textContent = "Downloads are restricted to authorised members.";
            return;
        }
        throw error;
    })
]).catch(error => {
    console.error(error);
    titleElement.textContent = error.message;
});
