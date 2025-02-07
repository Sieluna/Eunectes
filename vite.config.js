import { defineConfig } from "vite";

export default defineConfig({
    base: "/Eunectes/",
    define: {
        __MODEL_URL__: JSON.stringify("https://sieluna.github.io/Eunectes"),
        __TOKENIZER_URL__: JSON.stringify("https://sieluna.github.io/Eunectes/packages/train/model/dataset/tokenizer.json")
    }
});
