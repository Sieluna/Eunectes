import katex from "katex";

export function setupPreview({ element } = {}) {

    const setPreview = (content) => {
        try {
            katex.render(content, element, {
                throwOnError: false,
                output: "mathml"
            });
        } catch (error) {
            element.textContent = error.message;
        }
    };

    return [{}, setPreview];
}
