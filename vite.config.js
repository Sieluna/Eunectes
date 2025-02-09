import { defineConfig, loadEnv } from "vite";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";

function downloadAssetsPlugin(options) {
    return {
        name: "vite-plugin-download-assets",
        apply: "build",
        async writeBundle() {
            const distPath = resolve(import.meta.dirname, "dist");

            await Promise.all(
                options.assets.map(async ({ url, out }) => {
                    const response = await fetch(url, { redirect: "follow" });

                    if (!response.ok) throw new Error(`Failed to fetch ${url}`);

                    const buffer = await response.arrayBuffer();
                    const outputPath = resolve(distPath, out);

                    await mkdir(dirname(outputPath), { recursive: true });
                    await writeFile(outputPath, Buffer.from(buffer));

                    console.log(`Download: ${url} -> ${outputPath}`);
                })
            );
        }
    };
}

export default defineConfig(({ mode }) => {
    const env = { ...process.env, ...loadEnv(mode, process.cwd(), '') };

    const requiredEnv = ["MODEL_URL", "TOKENIZER_URL", "TOKENIZER_CONFIG_URL"];
    if (requiredEnv.some(key => !env[key]))
        console.warn(`Please set up the ${requiredEnv.join(", ")} environment variables`);

    return {
        base: "/Eunectes/",
        plugins: [
            downloadAssetsPlugin({
                assets: [
                    {
                        url: env.MODEL_URL,
                        out: "assets/model.onnx"
                    },
                    {
                        url: env.TOKENIZER_URL,
                        out: "assets/tokenizer.json"
                    },
                    {
                        url: env.TOKENIZER_CONFIG_URL,
                        out: "assets/tokenizer-config.json"
                    }
                ]
            })
        ],
        resolve: {
            alias: {
                "onnx-web": resolve(import.meta.dirname, "node_modules/onnxruntime-web/dist"),
            }
        },
        server: {
            proxy: {
                "/vite-forward": {
                    target: "https://github.com",
                    changeOrigin: true,
                    followRedirects: true,
                    rewrite: path => path.replace(/^\/vite-forward/, ''),
                }
            }
        },
        define: {
            __MODEL_URL__: JSON.stringify(
                mode === "development"
                    ? env.MODEL_URL.replace("https://github.com", "/vite-forward")
                    : "/Eunectes/assets/model.onnx"
            ),
            __TOKENIZER_URL__: JSON.stringify(
                mode === "development"
                    ? env.TOKENIZER_URL.replace("https://github.com", "/vite-forward")
                    : "/Eunectes/assets/tokenizer.json"
            ),
            __TOKENIZER_CONFIG_URL__: JSON.stringify(
                mode === "development"
                    ? env.TOKENIZER_CONFIG_URL.replace("https://github.com", "/vite-forward")
                    : "/Eunectes/assets/tokenizer-config.json"
            )
        }
    };
});
