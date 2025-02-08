import { defineConfig, loadEnv } from "vite";
import path from "node:path";

export default defineConfig(({ mode }) => {
    const env = { ...process.env, ...loadEnv(mode, process.cwd(), "") };

    if (mode === "development") {
        ["MODEL_URL", "TOKENIZER_URL", "TOKENIZER_CONFIG_URL"].forEach(key => {
            env[key] = env[key]?.replace("https://github.com", "/github");
        });
    }

    return {
        base: "/Eunectes/",
        resolve: {
            alias: {
                "onnx-web": path.resolve(import.meta.dirname, "node_modules/onnxruntime-web/dist"),
            }
        },
        server: {
            proxy: {
                "/github": {
                    target: "https://github.com",
                    changeOrigin: true,
                    followRedirects: true,
                    rewrite: (path) => path.replace(/^\/github/, "")
                }
            }
        },
        define: {
            __MODEL_URL__: JSON.stringify(env.MODEL_URL),
            __TOKENIZER_URL__: JSON.stringify(env.TOKENIZER_URL),
            __TOKENIZER_CONFIG_URL__: JSON.stringify(env.TOKENIZER_CONFIG_URL)
        }
    };
});
