import { db } from "./firebase.js";
import { collection, getDocs, orderBy, query } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const container = document.getElementById("projectContainer");
let founderMode = false;

function renderProject(project) {
    const card = document.createElement("article");
    card.className = "card";
    const heading = document.createElement("h2");
    const link = document.createElement("a");
    link.href = `project.html?id=${encodeURIComponent(project.id)}`;
    link.textContent = project.title || "Untitled project";
    heading.append(link);
    const description = document.createElement("p");
    description.textContent = project.description || "No description yet.";
    card.append(heading, description);
    if (founderMode) {
        const editLink = document.createElement("a");
        editLink.className = "button admin-edit-link";
        editLink.href = `edit-project.html?id=${encodeURIComponent(project.id)}`;
        editLink.textContent = "Edit project";
        card.append(editLink);
    }
    return card;
}

async function loadProjects() {
    try {
        const snapshot = await getDocs(query(collection(db, "projects"), orderBy("createdAt", "desc")));
        container.textContent = "";
        if (snapshot.empty) {
            container.innerHTML = '<section class="card"><h2>No projects yet</h2><p>New workshop projects will appear here.</p></section>';
            return;
        }
        snapshot.forEach(documentSnapshot => {
            container.append(renderProject({ id: documentSnapshot.id, ...documentSnapshot.data() }));
        });
    } catch (error) {
        console.error(error);
        container.innerHTML = '<section class="card"><h2>Projects unavailable</h2><p>Please try again later.</p></section>';
    }
}

loadProjects();

window.addEventListener("admin-status-changed", event => {
    founderMode = Boolean(event.detail?.isFounder);
    loadProjects();
});

window.addEventListener("projects-changed", loadProjects);
