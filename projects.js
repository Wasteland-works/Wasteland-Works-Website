async function loadProjects() {

    const { data, error } =
        await supabaseClient
            .from("projects")
            .select("*")
            .order("created_at", {
                ascending: false
            });

    if (error) {
        console.error(error);
        return;
    }

    const container =
        document.getElementById("projectContainer");

    container.innerHTML = "";

    data.forEach(project => {

        container.innerHTML += `
            <section class="card">
                <h2>
                    <a href="project.html?id=${project.id}">
                        ${project.title}
                    </a>
                </h2>

                <p>
                    ${project.description || ""}
                </p>
            </section>
        `;
    });
}

loadProjects();