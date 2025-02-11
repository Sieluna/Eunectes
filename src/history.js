import { getHistory, saveHistory } from "./main.js";

export function setupHistory({ element }) {
    const updateHistory = async data => {
        try {
            if (data) {
                data.timestamp ??= Date.now();
                await saveHistory(data);
            }

            const history = await getHistory();
            const records = Array.isArray(history) ? history : [];
            records.sort((a, b) => b.timestamp - a.timestamp);

            element.innerHTML = records
                .map(record => `
                    <div class="history-item" data-id="${record.id}">
                        <img src="${record.preprocessedImage}" alt="Preprocessed Image">
                        <p>${new Date(record.timestamp).toLocaleString()}</p>
                    </div>
                `)
                .join("");
        } catch (error) {
            console.error("Failed to load history:", error);
            element.innerHTML = `<p class="error">Failed to load history</p>`;
        }
    };

    updateHistory();

    element.addEventListener("click", (event) => {
        const item = event.target.closest(".history-item");
        if (item) {
            const event = new CustomEvent("select-history", {
                detail: {
                    id: Number(item.dataset.id)
                }
            });
            element.dispatchEvent(event);

            Array.from(element.querySelectorAll(".history-item")).forEach(element => {
                element.classList.remove("selected");
            });
            item.classList.add("selected");
        }
    });

    return {
        next: updateHistory
    };
}
