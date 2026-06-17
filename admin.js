async function addProject() {
    const title = document.getElementById("title").value;
    const description = document.getElementById("description").value;
    const content = document.getElementById("content").value;

    if (title.trim() === "") {
        alert("Project title is required.");
        return;
    }

    const { error } = await supabaseClient
        .from("projects")
        .insert([
            {
                title: title,
                description: description,
                content: content
            }
        ]);

    if (error) {
        alert("Error: " + error.message);
    } else {
        alert("Project created!");
        document.getElementById("title").value = "";
        document.getElementById("description").value = "";
        document.getElementById("content").value = "";
    }
}