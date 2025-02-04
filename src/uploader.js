function simulatePix2Tex(imageFile) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const simulatedLatex = "\\frac{1}{2} \\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{4}";
            resolve(simulatedLatex);
        }, 10);
    });
}

export function setupUploader({ element, onUpdate } = {}) {
    let file = null;

    const setFile = async (assets) => {
        file = assets[0];
        if (file) {
            try {
                const latex = await simulatePix2Tex(file);
                onUpdate(latex);
            } catch (error) {
                console.error("Error processing image:", error);
            }
        }
    };

    element.addEventListener("change", async (event) => setFile(event.target.files));

    return [file, setFile];
}
