import "./style.css";
import { setupPreview } from "./canvas.js";
import { setupEditor } from "./editor.js";
import { setupHistory } from "./history.js";
import { setupUploader } from "./uploader.js";

export function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("Eunectes");

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains("records")) {
                db.createObjectStore("records", {
                    keyPath: "id",
                    autoIncrement: true
                });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function getHistory(id) {
    const db = await initDB();
    const transaction = db.transaction("records", "readonly");
    const store = transaction.objectStore("records");

    return new Promise((resolve, reject) => {
        const request = id ? store.get(id) : store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function saveHistory(data) {
    const db = await initDB();
    const transaction = db.transaction("records", "readwrite");
    const store = transaction.objectStore("records");

    return new Promise((resolve, reject) => {
        const request = store.add(data);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function app() {
    document.querySelector("#app").innerHTML = `
        <nav>
            <header>
                <h1>LaTeX Editor</h1>
                <button>
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor">
                        <path d="M2 4h12M2 8h12M2 12h12"/>
                    </svg>
                </button>
            </header>
            <div id="history"></div>
        </nav>
        <main>
            <div id="upload"></div>
            <div class="editor-section">
                <div id="editor"></div>
                <div id="preview"></div>
            </div>
        </main>
    `;

    const sideBar = document.querySelector("nav");
    const toggle = document.querySelector("nav > header > button");
    toggle.addEventListener("click", () => {
        const isCollapsed = sideBar.classList.contains("collapsed");
        sideBar.classList.toggle("collapsed");
        if (!isCollapsed) {
            setTimeout(() => {
                toggle.style.left = "0.83rem"
                toggle.style.position = "fixed"
            }, 150);
        } else {
            toggle.style.left = "0"
            toggle.style.position = "relative";
        }
    });

    const filePipeline = setupUploader({ element: document.querySelector("#upload") });
    const editorPipeline = setupEditor({ element: document.querySelector("#editor") });
    const previewPipeline = setupPreview({ element: document.querySelector("#preview") });
    const historyPipeline = setupHistory({ element: document.querySelector("#history") });

    filePipeline.subscribe(data => {
        editorPipeline.next(data);
        historyPipeline.next(data);
    });
    editorPipeline.subscribe(previewPipeline.next);
}

document.addEventListener("DOMContentLoaded", app);
