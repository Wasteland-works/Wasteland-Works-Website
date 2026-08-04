import { db } from "./firebase.js";
import { collection, getDocs, orderBy, query } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const container = document.getElementById("adminProjectList");

function projectCard(project) {
    const card = document.createElement("article");
    card.className = "card nested-card";
    const title = document.createElement("h3");
    title.textContent = project.title || "Untitled project";
    const description = document.createElement("p");
    description.textContent = project.description || "No description yet.";
    const link = document.createElement("a");
    link.className = "button";
    link.href = `edit-project.html?id=${encodeURIComponent(project.id)}`;
    link.textContent = "Edit project";
    card.append(title, description, link);
    return card;
}

async function loadAdminProjects() {
    container.textContent = "Loading projects…";
    try {
        const snapshot = await getDocs(query(collection(db, "projects"), orderBy("createdAt", "desc")));
        container.textContent = "";
        if (snapshot.empty) {
            container.textContent = "No projects yet.";
            return;
        }
        snapshot.forEach(documentSnapshot => {
            container.append(projectCard({ id: documentSnapshot.id, ...documentSnapshot.data() }));
        });
    } catch (error) {
        console.error(error);
        container.textContent = "Couldn’t load projects.";
    }
}

window.addEventListener("projects-changed", loadAdminProjects);
loadAdminProjects();
