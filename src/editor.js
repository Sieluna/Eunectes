import { basicSetup, EditorView } from "codemirror";

export function setupEditor({ element, onUpdate } = {}) {
    let view = new EditorView({
        extensions: [
            basicSetup,
            EditorView.updateListener.of((update) => {
                if (update.docChanged) {
                    onUpdate(view.state.doc.toString());
                }
            })
        ],
        parent: element
    });

    const setView = (content) => {
        view.dispatch({
            changes: {
                from: 0,
                to: view.state.doc.length,
                insert: content
            }
        });
    };

    return [view, setView];
}
