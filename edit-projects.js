import { auth, db } from "./firebase.js";
import {
    addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query,
    serverTimestamp, setDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
const DOWNLOAD_GATEWAY = "https://wasteland-works-downloads.wellslee903.workers.dev";

const projectId = new URLSearchParams(location.search).get("id");
const elements = Object.fromEntries([
    "editTitle", "editDescription", "editContent", "saveProjectButton", "deleteProjectButton",
    "newNote", "addNoteButton", "notesList", "githubAssetId", "fileName", "fileType", "fileSize",
    "resourceKey", "addFileButton", "fileList", "editorMessage"
].map(id => [id, document.getElementById(id)]));

function showMessage(text, type = "success") {
    elements.editorMessage.textContent = text;
    elements.editorMessage.className = `form-message account-message ${type}`;
}

async function loadProject() {
    if (!projectId) throw new Error("No project selected.");
    const snapshot = await getDoc(doc(db, "projects", projectId));
    if (!snapshot.exists()) throw new Error("Project not found.");
    const project = snapshot.data();
    elements.editTitle.value = project.title || "";
    elements.editDescription.value = project.description || "";
    elements.editContent.value = project.content || "";
}

async function loadNotes() {
    const snapshot = await getDocs(query(collection(db, "projects", projectId, "notes"), orderBy("createdAt", "desc")));
    elements.notesList.textContent = "";
    if (snapshot.empty) {
        elements.notesList.textContent = "No notes yet.";
        return;
    }
    snapshot.forEach(noteSnapshot => {
        const note = noteSnapshot.data();
        const entry = document.createElement("article");
        entry.className = "project-entry editable-entry";
        const text = document.createElement("p");
        text.textContent = note.text || "";
        const button = document.createElement("button");
        button.className = "danger-button";
        button.type = "button";
        button.textContent = "Delete note";
        button.addEventListener("click", async () => {
            if (!confirm("Delete this note?")) return;
            await deleteDoc(noteSnapshot.ref);
            await loadNotes();
        });
        entry.append(text, button);
        elements.notesList.append(entry);
    });
}

async function loadFiles() {
    const snapshot = await getDocs(query(collection(db, "projects", projectId, "files"), orderBy("createdAt", "desc")));
    elements.fileList.textContent = "";
    if (snapshot.empty) {
        elements.fileList.textContent = "No files uploaded yet.";
        return;
    }
    snapshot.forEach(fileSnapshot => {
        const file = fileSnapshot.data();
        const entry = document.createElement("article");
        entry.className = "project-entry editable-entry";
        const name = document.createElement("strong");
        name.textContent = file.name || "Protected download";
        const details = document.createElement("p");
        details.className = "muted";
        details.textContent = file.githubAssetId
            ? `Protected asset ${file.githubAssetId} · ${file.resourceKey || "admin-only until classified"}`
            : "Legacy file";
        const download = document.createElement("button");
        download.type = "button";
        download.textContent = "Test download";
        download.addEventListener("click", async () => {
            try {
                const token = await auth.currentUser.getIdToken();
                const response = await fetch(`${DOWNLOAD_GATEWAY}/ticket/${file.githubAssetId}`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` }
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || "Download denied.");
                window.location.assign(result.downloadUrl);
            } catch (error) {
                showMessage(error.message, "error");
            }
        });
        const button = document.createElement("button");
        button.className = "danger-button";
        button.type = "button";
        button.textContent = "Delete file";
        button.addEventListener("click", async () => {
            if (!confirm("Delete this file?")) return;
            await deleteDoc(fileSnapshot.ref);
            if (file.githubAssetId) await deleteDoc(doc(db, "downloadAssets", String(file.githubAssetId)));
            await loadFiles();
        });
        entry.append(name, details);
        if (file.githubAssetId) entry.append(download);
        entry.append(button);
        elements.fileList.append(entry);
    });
}

elements.saveProjectButton.addEventListener("click", async () => {
    const title = elements.editTitle.value.trim();
    if (!title) {
        showMessage("Project title is required.", "error");
        return;
    }
    elements.saveProjectButton.disabled = true;
    try {
        await updateDoc(doc(db, "projects", projectId), {
            title,
            description: elements.editDescription.value.trim(),
            content: elements.editContent.value.trim(),
            updatedAt: serverTimestamp()
        });
        showMessage("Project saved.");
    } catch (error) {
        console.error(error);
        showMessage("Couldn’t save this project.", "error");
    } finally {
        elements.saveProjectButton.disabled = false;
    }
});

elements.deleteProjectButton.addEventListener("click", async () => {
    if (!confirm("Delete this project and all of its notes and files? This cannot be undone.")) return;
    elements.deleteProjectButton.disabled = true;
    try {
        const notes = await getDocs(collection(db, "projects", projectId, "notes"));
        await Promise.all(notes.docs.map(item => deleteDoc(item.ref)));
        const files = await getDocs(collection(db, "projects", projectId, "files"));
        await Promise.all(files.docs.map(item => deleteDoc(item.ref)));
        await deleteDoc(doc(db, "projects", projectId));
        window.location.replace("admin.html");
    } catch (error) {
        console.error(error);
        elements.deleteProjectButton.disabled = false;
        showMessage("Couldn’t delete this project.", "error");
    }
});

elements.addNoteButton.addEventListener("click", async () => {
    const text = elements.newNote.value.trim();
    if (!text) return;
    elements.addNoteButton.disabled = true;
    try {
        await addDoc(collection(db, "projects", projectId, "notes"), { text, createdAt: serverTimestamp() });
        elements.newNote.value = "";
        await loadNotes();
        showMessage("Note added.");
    } catch (error) {
        console.error(error);
        showMessage("Couldn’t add the note.", "error");
    } finally {
        elements.addNoteButton.disabled = false;
    }
});

elements.addFileButton.addEventListener("click", async () => {
    const githubAssetId = elements.githubAssetId.value.trim();
    const name = elements.fileName.value.trim();
    if (!/^\d+$/.test(githubAssetId) || !name) {
        showMessage("Enter the GitHub release asset ID and a file name.", "error");
        return;
    }
    elements.addFileButton.disabled = true;
    try {
        const resourceKey = elements.resourceKey.value;
        await addDoc(collection(db, "projects", projectId, "files"), {
            name,
            type: elements.fileType.value.trim() || "application/octet-stream",
            size: Number(elements.fileSize.value) || 0,
            githubAssetId,
            resourceKey,
            createdAt: serverTimestamp()
        });
        await setDoc(doc(db, "downloadAssets", githubAssetId), {
            githubAssetId,
            projectId,
            name,
            resourceKey,
            updatedAt: serverTimestamp()
        });
        elements.githubAssetId.value = "";
        elements.fileName.value = "";
        elements.fileSize.value = "";
        await loadFiles();
        showMessage("Protected download added to this project.");
    } catch (error) {
        console.error(error);
        showMessage("Couldn’t add the protected download.", "error");
    } finally {
        elements.addFileButton.disabled = false;
    }
});

Promise.all([loadProject(), loadNotes(), loadFiles()]).catch(error => {
    console.error(error);
    showMessage(error.message, "error");
});
