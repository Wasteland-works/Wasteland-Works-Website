import { auth, db } from "./firebase.js";
import { ensureUserProfile } from "./profile.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const tools = document.getElementById("projectAdminTools");
const titleInput = document.getElementById("adminProjectTitle");
const descriptionInput = document.getElementById("adminProjectDescription");
const contentInput = document.getElementById("adminProjectContent");
const createButton = document.getElementById("adminCreateProject");
const message = document.getElementById("projectAdminMessage");

function showMessage(text, type = "success") {
    message.textContent = text;
    message.className = `form-message ${type}`;
}

onAuthStateChanged(auth, async user => {
    let isFounder = false;
    if (user) {
        try {
            const profile = await ensureUserProfile(user);
            isFounder = profile.role === "founder";
        } catch (error) {
            console.error(error);
        }
    }
    tools.hidden = !isFounder;
    window.dispatchEvent(new CustomEvent("admin-status-changed", { detail: { isFounder } }));
});

createButton.addEventListener("click", async () => {
    const title = titleInput.value.trim();
    if (!title) {
        showMessage("Enter a project title first.", "error");
        titleInput.focus();
        return;
    }

    createButton.disabled = true;
    createButton.textContent = "Adding project…";
    try {
        const project = await addDoc(collection(db, "projects"), {
            title,
            description: descriptionInput.value.trim(),
            content: contentInput.value.trim(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        titleInput.value = "";
        descriptionInput.value = "";
        contentInput.value = "";
        showMessage("Project added. You can now edit its notes and files.");
        window.dispatchEvent(new Event("projects-changed"));

        const editLink = document.createElement("a");
        editLink.className = "button";
        editLink.href = `edit-project.html?id=${encodeURIComponent(project.id)}`;
        editLink.textContent = "Continue editing this project";
        message.append(" ", editLink);
    } catch (error) {
        console.error(error);
        showMessage("The project couldn’t be added. Please try again.", "error");
    } finally {
        createButton.disabled = false;
        createButton.textContent = "Add project to website";
    }
});
