import { LatexOCR } from "./latex-ocr.js";

async function loadImage(file) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = URL.createObjectURL(file);
    });
}

export function setupUploader({ element, onUpdate } = {}) {
    const ocr = new LatexOCR();
    ocr.initialize().then(() => ocrReady = true);
    let ocrReady = false;
    let file = null;

    const setFile = async (assets) => {
        if (!ocrReady) return alert('Model loading...');

        file = assets[0];
        if (file) {
            try {
                const image = await loadImage(file);
                const latex = await ocr.predict(image);
                onUpdate(latex);
            } catch (error) {
                console.error("Error processing image:", error);
            }
        }
    };

    element.addEventListener("change", async (event) => setFile(event.target.files));

    return [file, setFile];
}
