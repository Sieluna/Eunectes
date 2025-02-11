import { LatexOCR } from "./latex-ocr.js";

export function setupUploader({ element } = {}) {
    const uploadInput = document.createElement("input");
    const uploadLabel = document.createElement("label");

    Object.assign(uploadInput, { id: "upload-input", type: "file", accept: "image/*" });

    uploadLabel.htmlFor = uploadInput.id;
    uploadLabel.innerHTML = `
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor">
            <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"/>
            <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708z"/>
        </svg>
        <span>Click or drag to upload</span>
    `;

    element.append(uploadInput, uploadLabel);

    const subscribers = new Set();
    const ocr = new LatexOCR();
    let ocrReady = false;

    ocr.initialize().then(() => ocrReady = true);

    const loadImage = async file => new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = URL.createObjectURL(file);
    });

    const analyseOcr = async file => {
        if (!ocrReady) return alert("Model loading...");

        if (file) {
            try {
                const image = await loadImage(file);
                const data = await ocr.predict(image);
                subscribers.forEach(subscriber => {
                    const { latex, meta } = data;

                    subscriber({
                        latex,
                        meta: {
                            original: image.src,
                            ...meta,
                        }
                    })
                });
            } catch (error) {
                console.error("Error processing image:", error);
            }
        }
    }

    element.addEventListener("dragover", event => {
        event.preventDefault();
        element.classList.add("is-dragover");
    });
    element.addEventListener("dragleave", event => {
        event.preventDefault();
        element.classList.remove("is-dragover");
    });
    element.addEventListener("drop", async event => {
        event.preventDefault();
        event.stopPropagation();
        element.classList.remove("is-dragover");

        await analyseOcr(event.dataTransfer.files[0])
    });
    uploadInput.addEventListener("change", async event => analyseOcr(event.target.files[0]));

    return {
        subscribe: callback => {
            subscribers.add(callback);
            return () => subscribers.delete(callback);
        }
    };
}
