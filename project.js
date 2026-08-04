import { db } from "./firebase.js";
import { collection, doc, getDoc, getDocs, orderBy, query } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const projectId = new URLSearchParams(location.search).get("id");
const titleElement = document.getElementById("projectTitle");
const descriptionElement = document.getElementById("projectDescription");
const contentElement = document.getElementById("projectContent");
const notesList = document.getElementById("notesList");
const fileList = document.getElementById("fileList");

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
        if (file.type?.startsWith("image/")) {
            const image = document.createElement("img");
            image.className = "project-image";
            image.src = file.url;
            image.alt = file.name || "Project image";
            entry.append(image);
        }
        const link = document.createElement("a");
        link.href = file.url;
        link.target = "_blank";
        link.rel = "noopener";
        link.textContent = file.name || "Open file";
        entry.append(link);
        fileList.append(entry);
    });
}

Promise.all([loadProject(), loadNotes(), loadFiles()]).catch(error => {
    console.error(error);
    titleElement.textContent = error.message;
});
