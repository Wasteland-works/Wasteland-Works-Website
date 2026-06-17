let currentProjectId = null;

async function loadProjectForEditing() {
    const params = new URLSearchParams(window.location.search);
    currentProjectId = params.get("id");

    if (!currentProjectId) {
        alert("No project selected.");
        return;
    }

    const { data, error } = await supabaseClient
        .from("projects")
        .select("*")
        .eq("id", currentProjectId)
        .single();

    if (error) {
        alert("Project not found.");
        console.error(error);
        return;
    }

    document.getElementById("editTitle").value = data.title || "";
    document.getElementById("editDescription").value = data.description || "";
    document.getElementById("editContent").value = data.content || "";
}

async function updateProject() {
    const title = document.getElementById("editTitle").value;
    const description = document.getElementById("editDescription").value;
    const content = document.getElementById("editContent").value;

    const { error } = await supabaseClient
        .from("projects")
        .update({
            title: title,
            description: description,
            content: content
        })
        .eq("id", currentProjectId);

    if (error) {
        alert("Error updating project: " + error.message);
    } else {
        alert("Project updated!");
        window.location.href = "admin.html";
    }
}

async function deleteProject() {
    const confirmDelete = confirm(
        "Are you sure you want to delete this project? This cannot be undone."
    );

    if (!confirmDelete) return;

    const { data, error } = await supabaseClient
        .from("projects")
        .delete()
        .eq("id", currentProjectId)
        .select();

    if (error) {
        alert("Error deleting project: " + error.message);
        return;
    }

    if (!data || data.length === 0) {
        alert("Nothing was deleted.");
        return;
    }

    alert("Project deleted.");
    window.location.href = "admin.html";
}

loadProjectForEditing();