import { LatexOCR } from "./latex-ocr.js";

async function loadImage(file) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = URL.createObjectURL(file);
    });
}

export function setupUploader({ element } = {}) {
    const subscribers = new Set();
    const ocr = new LatexOCR();
    ocr.initialize().then(() => ocrReady = true);
    let ocrReady = false;

    const setFile = async (assets) => {
        if (!ocrReady) return alert('Model loading...');

        const file = assets[0];
        if (file) {
            try {
                const image = await loadImage(file);
                const latex = await ocr.predict(image);
                subscribers.forEach(subscriber => subscriber(latex));
            } catch (error) {
                console.error("Error processing image:", error);
            }
        }
    };

    element.addEventListener("change", async (event) => setFile(event.target.files));

    return {
        subscribe: (callback) => {
            subscribers.add(callback);
            return () => subscribers.delete(callback);
        }
    };
}
