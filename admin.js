import { db } from "./firebase.js";
import { addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const titleInput = document.getElementById("title");
const descriptionInput = document.getElementById("description");
const contentInput = document.getElementById("content");
const createButton = document.getElementById("createProjectButton");
const adminMessage = document.getElementById("adminMessage");

window.addProject = async function () {
    const title = titleInput.value.trim();
    if (!title) {
        adminMessage.textContent = "Project title is required.";
        adminMessage.className = "form-message error";
        return;
    }

    createButton.disabled = true;
    createButton.textContent = "Creating…";
    try {
        await addDoc(collection(db, "projects"), {
            title,
            description: descriptionInput.value.trim(),
            content: contentInput.value.trim(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        titleInput.value = "";
        descriptionInput.value = "";
        contentInput.value = "";
        adminMessage.textContent = "Project created.";
        adminMessage.className = "form-message success";
        window.dispatchEvent(new Event("projects-changed"));
    } catch (error) {
        console.error(error);
        adminMessage.textContent = "Couldn’t create the project. Check your Firebase permissions.";
        adminMessage.className = "form-message error";
    } finally {
        createButton.disabled = false;
        createButton.textContent = "Create project";
    }
};
