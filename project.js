let currentProjectId = null;

async function loadProject() {
    const params = new URLSearchParams(window.location.search);
    currentProjectId = params.get("id");

    if (!currentProjectId) {
        document.getElementById("projectTitle").textContent =
            "No Project Selected";
        return;
    }

    const { data, error } = await supabaseClient
        .from("projects")
        .select("*")
        .eq("id", Number(currentProjectId))
        .single();

    if (error) {
        document.getElementById("projectTitle").textContent =
            "Project Not Found";
        return;
    }

    document.getElementById("projectTitle").textContent = data.title;
    document.getElementById("projectDescription").textContent = data.description || "";
    document.getElementById("projectContent").textContent = data.content || "";
}

async function loadNotes() {
    const { data, error } = await supabaseClient
        .from("project_notes")
        .select("*")
        .eq("project_id", Number(currentProjectId))
        .order("created_at", { ascending: false });

    const notesList = document.getElementById("notesList");

    if (error) {
        notesList.innerHTML = "Error loading notes.";
        return;
    }

    if (!data || data.length === 0) {
        notesList.innerHTML = "<p>No notes yet.</p>";
        return;
    }

    notesList.innerHTML = "";

    data.forEach(note => {
        const date = new Date(note.created_at).toLocaleString();

        notesList.innerHTML += `
            <div class="card">
                <strong>${date}</strong>
                <p>${note.note_text}</p>
            </div>
        `;
    });
}

async function loadFiles() {
    const { data, error } = await supabaseClient
        .from("project_files")
        .select("*")
        .eq("project_id", Number(currentProjectId))
        .order("created_at", { ascending: false });

    const fileList = document.getElementById("fileList");

    if (error) {
        fileList.innerHTML = "Error loading files.";
        return;
    }

    if (!data || data.length === 0) {
        fileList.innerHTML = "<p>No files uploaded yet.</p>";
        return;
    }

    fileList.innerHTML = "";

    data.forEach(file => {
        if (file.file_type && file.file_type.startsWith("image/")) {
            fileList.innerHTML += `
                <div>
                    <p>${file.file_name}</p>

                    <img src="${file.file_url}"
                         style="max-width: 250px; border: 1px solid #00ff66;">

                    <br><br>

                    <a href="${file.file_url}" target="_blank">Open File</a>
                </div>
                <br>
            `;
        } else {
            fileList.innerHTML += `
                <p>
                    <a href="${file.file_url}" target="_blank">
                        ${file.file_name}
                    </a>
                </p>
            `;
        }
    });
}

loadProject().then(() => {
    loadNotes();
    loadFiles();
});