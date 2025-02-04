import "./style.css";
import { setupPreview } from "./canvas.js";
import { setupEditor } from "./editor.js";
import { setupUploader } from "./uploader.js";

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

const [preview, setPreview] = setupPreview({
    element: document.querySelector("#preview"),
});

const [view, setView] = setupEditor({
    element: document.querySelector("#editor"),
    onUpdate: setPreview
});

const [file, setFile] = setupUploader({
    element: document.querySelector("#upload"),
    onUpdate: setView
});


