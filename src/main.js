import "./style.css";
import { setupPreview } from "./canvas.js";
import { setupEditor } from "./editor.js";
import { setupUploader } from "./uploader.js";

function app() {
    document.querySelector("#app").innerHTML = `
    <header>
        <h1>LaTeX Editor</h1>
    </header>
    <main>
        <div class="upload-section">
            <input type="file" id="upload" accept="image/*">
            <label for="upload" class="upload-label">Upload Image</label>
        </div>
        <div class="editor-section">
            <div id="editor"></div>
            <div id="preview"></div>
        </div>
    </main>
    `;

    const filePipeline = setupUploader({ element: document.querySelector("#upload") });
    const editorPipeline = setupEditor({ element: document.querySelector("#editor") });
    const previewPipeline = setupPreview({ element: document.querySelector("#preview") });

    filePipeline.subscribe(editorPipeline.next);
    editorPipeline.subscribe(previewPipeline.next);
}

document.addEventListener("DOMContentLoaded", app);
