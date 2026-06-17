async function loadAdminProjects() {
    const { data, error } = await supabaseClient
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    const container = document.getElementById("adminProjectList");
    container.innerHTML = "";

    data.forEach(project => {
        container.innerHTML += `
            <section class="card">
                <h2>${project.title}</h2>
                <p>${project.description || ""}</p>

                <a href="edit-project.html?id=${project.id}">
                    Edit Project
                </a>
            </section>
        `;
    });
}

loadAdminProjects();