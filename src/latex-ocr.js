import { PreTrainedTokenizer } from "@huggingface/transformers";
import { InferenceSession, Tensor, env } from "onnxruntime-web";

import ortWasmUrl from "onnx-web/ort-wasm-simd-threaded.jsep.wasm?url";

export class LatexOCR {
    /** @type {InferenceSession} */
    #model = null;
    /** @type {PreTrainedTokenizer} */
    #tokenizer = null;
    #args = {
        max_dimensions: [800, 800],
        min_dimensions: [32, 32],
        temperature: 0.25,
        bos_token: 0,
        eos_token: 1,
        pad_token: 2,
        max_seq_len: 256
    };

    async initialize({
        modelUrl = __MODEL_URL__,
        tokenizerUrl = __TOKENIZER_URL__,
        tokenizerConfigUrl = __TOKENIZER_CONFIG_URL__
    } = {}) {
        env.wasm.wasmBinary = await fetch(ortWasmUrl).then(res => res.arrayBuffer());

        const [model, [tokenizer, config]] = await Promise.all([
            fetch(modelUrl)
                .then(res => res.arrayBuffer())
                .then(buffer => {
                    return InferenceSession.create(buffer, {
                        executionProviders: ["webgpu"],
                    });
                }),
            Promise.all([
                fetch(tokenizerUrl).then(res => res.json()),
                fetch(tokenizerConfigUrl).then(res => res.json())
            ])
        ]);

        this.#model = model;
        this.#tokenizer = new PreTrainedTokenizer(tokenizer, config);
        this.#args = { ...this.#args, ...config };
    }

    async predict(element, { numCandidates = 1 } = {}) {
        const processed = await this.#preprocessImage(element);
        const outputs = await this.#inference(processed, numCandidates);
        return this.#postProcess(outputs, numCandidates);
    }

    async #preprocessImage(element) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = element.naturalWidth;
        canvas.height = element.naturalHeight;
        ctx.drawImage(element, 0, 0);

        const imgData = padImage(minmaxSize(canvas, this.#args.min_dimensions, this.#args.max_dimensions));

        // apply transformations
        const tensor = new ImageData(imgData.width, imgData.height);
        const mean = [0.485, 0.456, 0.406];
        const std = [0.229, 0.224, 0.225];

        for (let i = 0; i < imgData.data.length; i += 4) {
            tensor.data[i/4 * 3] = (imgData.data[i] / 255 - mean[0]) / std[0];
            tensor.data[i/4 * 3 + 1] = (imgData.data[i + 1] / 255 - mean[1]) / std[1];
            tensor.data[i/4 * 3 + 2] = (imgData.data[i + 2] / 255 - mean[2]) / std[2];
        }

        return {
            data: Float32Array.from(tensor.data),
            shape: [3, imgData.height, imgData.width]
        };

        function minmaxSize(canvas, min, max) {
            const [[minW, minH], [maxW, maxH]] = [min, max];

            let ratio = Math.min(maxW / canvas.width, maxH / canvas.height);
            if (ratio < 1) {
                canvas.width *= ratio;
                canvas.height *= ratio;
            }

            if (canvas.width < minW || canvas.height < minH) {
                const resizeCanvas = document.createElement("canvas");
                resizeCanvas.width = Math.max(canvas.width, minW);
                resizeCanvas.height = Math.max(canvas.height, minH);

                const ctx = resizeCanvas.getContext("2d");
                ctx.fillStyle = "white";
                ctx.fillRect(0, 0, resizeCanvas.width, resizeCanvas.height);
                ctx.drawImage(canvas, 0, 0);

                return ctx.getImageData(0, 0, resizeCanvas.width, resizeCanvas.height);
            }

            return ctx.getImageData(0, 0, canvas.width, canvas.height);
        }

        function padImage(imgData, padding = 20) {
            const canvas = document.createElement("canvas");
            canvas.width = imgData.width + padding * 2;
            canvas.height = imgData.height + padding * 2;

            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.putImageData(imgData, padding, padding);

            return ctx.getImageData(0, 0, canvas.width, canvas.height);
        }
    }

    async #inference(processed, numCandidates) {
        const inputTensor = new Tensor("float32", processed.data, [1, ...processed.shape]);
        const outputs = [];

        for (let i = 0; i < numCandidates; i++) {
            const { output } = await this.#model.run({ input: inputTensor });
            outputs.push(output.data);
        }

        return outputs;
    }

    #postProcess(outputs, numCandidates) {
        const results = outputs.map(output => {
            const tokens = Array.from(output)
                .map(Math.round)
                .filter(t => t !== this.#args.pad_token && t !== this.#args.eos_token);

            const decoded = this.#tokenizer.decode(tokens, { skip_special_tokens: true })
                .replace(/Ġ/g, ' ')
                .replace(/\[(PAD|BOS|EOS)\]/g, '')
                .replace(/\s+/g, ' ')
                .trim();

            return decoded.replace(/(\\[a-z]+)\s*{/g, "$1{")
                .replace(/(\D)(\d)/g, "$1 $2")
                .replace(/(\d)(\D)/g, "$1 $2");
        });

        return numCandidates === 1 ? results[0] : results;
    }
}
