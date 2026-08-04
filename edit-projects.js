import { db, storage } from "./firebase.js";
import {
    addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query,
    serverTimestamp, updateDoc
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import {
    deleteObject, getDownloadURL, ref, uploadBytes
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-storage.js";

const projectId = new URLSearchParams(location.search).get("id");
const elements = Object.fromEntries([
    "editTitle", "editDescription", "editContent", "saveProjectButton", "deleteProjectButton",
    "newNote", "addNoteButton", "notesList", "fileInput", "uploadFileButton", "fileList", "editorMessage"
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
        const link = document.createElement("a");
        link.href = file.url;
        link.target = "_blank";
        link.rel = "noopener";
        link.textContent = file.name || "Open file";
        const button = document.createElement("button");
        button.className = "danger-button";
        button.type = "button";
        button.textContent = "Delete file";
        button.addEventListener("click", async () => {
            if (!confirm("Delete this file?")) return;
            if (file.storagePath) await deleteObject(ref(storage, file.storagePath));
            await deleteDoc(fileSnapshot.ref);
            await loadFiles();
        });
        entry.append(link, button);
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
        await Promise.all(files.docs.map(async item => {
            if (item.data().storagePath) await deleteObject(ref(storage, item.data().storagePath));
            await deleteDoc(item.ref);
        }));
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

elements.uploadFileButton.addEventListener("click", async () => {
    const file = elements.fileInput.files[0];
    if (!file) {
        showMessage("Choose a file first.", "error");
        return;
    }
    if (file.size > 25 * 1024 * 1024) {
        showMessage("Files must be smaller than 25 MB.", "error");
        return;
    }
    elements.uploadFileButton.disabled = true;
    elements.uploadFileButton.textContent = "Uploading…";
    try {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `project-files/${projectId}/${Date.now()}-${safeName}`;
        const storageReference = ref(storage, storagePath);
        await uploadBytes(storageReference, file, { contentType: file.type || "application/octet-stream" });
        const url = await getDownloadURL(storageReference);
        await addDoc(collection(db, "projects", projectId, "files"), {
            name: file.name,
            type: file.type || "application/octet-stream",
            size: file.size,
            url,
            storagePath,
            createdAt: serverTimestamp()
        });
        elements.fileInput.value = "";
        await loadFiles();
        showMessage("File uploaded.");
    } catch (error) {
        console.error(error);
        showMessage("Couldn’t upload the file. Check Firebase Storage setup.", "error");
    } finally {
        elements.uploadFileButton.disabled = false;
        elements.uploadFileButton.textContent = "Upload file";
    }
});

Promise.all([loadProject(), loadNotes(), loadFiles()]).catch(error => {
    console.error(error);
    showMessage(error.message, "error");
});
