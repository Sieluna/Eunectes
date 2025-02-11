import katex from "katex";

export function setupPreview({ element } = {}) {
    const originalImgElement = Object.assign(document.createElement("img"), { className: "preview" });
    const prepareImgElement = Object.assign(document.createElement("img"), { className: "preview" });
    const paramsElement = Object.assign(document.createElement("div"), { className: "params" });
    const latexElement = Object.assign(document.createElement("div"), { className: "latex" });

    element.prepend(originalImgElement, prepareImgElement, paramsElement, latexElement);

    const setPreview = ({ latex, meta: { original, processed, shape, tokens } }) => {
        try {
            originalImgElement.src = original;
            prepareImgElement.src = processed;
            paramsElement.textContent = `
                <p>${shape}</p>
                <p>${tokens}</p>
            `;
        } catch (error) {
        }

        try {
            katex.render(latex, latexElement, {
                throwOnError: false,
                output: "mathml"
            });
        } catch (error) {
            latexElement.textContent = error.message;
        }
    };

    return {
        next: setPreview
    };
}
