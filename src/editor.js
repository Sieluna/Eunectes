import { basicSetup, EditorView } from "codemirror";

export function setupEditor({ element } = {}) {
    const subscribers = new Set();

    let view = new EditorView({
        extensions: [
            basicSetup,
            EditorView.updateListener.of(update => {
                if (update.docChanged) {
                    subscribers.forEach(subscriber => {
                        subscriber(view.state.doc.toString());
                    });
                }
            })
        ],
        parent: element
    });

    const setView = content => {
        view.dispatch({
            changes: {
                from: 0,
                to: view.state.doc.length,
                insert: content.latex
            }
        });
    };

    return {
        next: setView,
        subscribe: callback => {
            subscribers.add(callback);
            return () => subscribers.delete(callback);
        }
    };
}
