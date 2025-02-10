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
        max_seq_len: 256,
        temperature: 0.25,
        channels: 1,
        pad_token: 0,
        bos_token: 1,
        eos_token: 2
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
                .then(buffer => InferenceSession.create(buffer, {
                    executionProviders: ["webgpu"]
                })),
            Promise.all([
                fetch(tokenizerUrl).then(res => res.json()),
                fetch(tokenizerConfigUrl).then(res => res.json())
            ])
        ]);

        this.#model = model;
        this.#tokenizer = new PreTrainedTokenizer(tokenizer, config);
        this.#args = { ...this.#args, ...config };
    }

    async predict(element) {
        const processed = await this.#preprocess(element);
        const outputs = await this.#inference(processed);
        return this.#postProcess(outputs);
    }

    async #preprocess(element) {
        const canvas = document.createElement("canvas");
        canvas.width = element.naturalWidth;
        canvas.height = element.naturalHeight;
        canvas.getContext("2d").drawImage(element, 0, 0);

        const resizedCanvas = minmaxSize(canvas, this.#args.min_dimensions, this.#args.max_dimensions);
        const paddedCanvas = padImage(resizedCanvas, this.#args.max_dimensions);
        const { width, height } = paddedCanvas;

        const imageData = paddedCanvas.getContext("2d").getImageData(0, 0, width, height);

        const float32Data = new Float32Array(this.#args.channels * width * height);
        const mean = [0.7931, 0.7931, 0.7931];
        const std = [0.1738, 0.1738, 0.1738];

        for (let i = 0; i < imageData.data.length; i += 4) {
            switch (this.#args.channels) {
                case 1: {
                    const gray = imageData.data[i] * 0.2989 + imageData.data[i + 1] * 0.5870 + imageData.data[i + 2] * 0.1140;
                    float32Data[i / 4] = (gray / 255 - mean[0]) / std[0];
                    break;
                }
                default: {
                    console.warn("rgb mode wip, using grayscale conversion as fallback.");
                    const gray = imageData.data[i] * 0.2989 + imageData.data[i + 1] * 0.5870 + imageData.data[i + 2] * 0.1140;
                    float32Data[i / 4] = (gray / 255 - mean[0]) / std[0];
                    break;
                }
            }
        }

        return {
            data: float32Data,
            shape: [1, this.#args.channels, height, width]
        };

        function minmaxSize(canvas, min, max) {
            const [[minWidth, minHeight], [maxWidth, maxHeight]] = [min, max];

            const scale = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
            const [scaledWidth, scaledHeight] = [
                Math.max(minWidth, Math.min(maxWidth, canvas.width * scale)),
                Math.max(minHeight, Math.min(maxHeight, canvas.height * scale))
            ];

            const scaledCanvas = document.createElement("canvas");
            scaledCanvas.width = scaledWidth;
            scaledCanvas.height = scaledHeight;

            const ctx = scaledCanvas.getContext("2d");
            ctx.drawImage(canvas, 0, 0, scaledWidth, scaledHeight);

            return scaledCanvas;
        }

        function padImage(canvas, maxDimensions) {
            const [maxWidth, maxHeight] = maxDimensions;
            const { width, height } = canvas;

            const paddedCanvas = document.createElement("canvas");
            paddedCanvas.width = maxWidth;
            paddedCanvas.height = maxHeight;
            const paddedCtx = paddedCanvas.getContext("2d");
            paddedCtx.fillStyle = "white";
            paddedCtx.fillRect(0, 0, maxWidth, maxHeight);

            const xOffset = (maxWidth - width) / 2;
            const yOffset = (maxHeight - height) / 2;

            paddedCtx.drawImage(canvas, xOffset, yOffset, width, height);

            return paddedCanvas;
        }
    }

    async #inference(processed) {
        const inputTensor = new Tensor("float32", processed.data, processed.shape);
        const tokenBuffer = new BigInt64Array(this.#args.max_seq_len).fill(BigInt(this.#args.pad_token));
        tokenBuffer[0] = BigInt(this.#args.bos_token);

        for (let i = 1; i < this.#args.max_seq_len; i++) {
            const tgtSeqTensor = new Tensor("int64", new BigInt64Array(tokenBuffer), [1, this.#args.max_seq_len]);

            const { output } = await this.#model.run({ input: inputTensor, tgt_seq: tgtSeqTensor });
            const nextToken = sampleFromLogits(output.data, this.#args.temperature);
            if (nextToken === this.#args.eos_token) break;

            tokenBuffer[i] = BigInt(nextToken);
        }

        return tokenBuffer;

        function sampleFromLogits(logits, temperature) {
            const scaled = Array.from(logits).map(x => x / temperature);

            const maxLogit = Math.max(...scaled);
            const exps = scaled.map(x => Math.exp(x - maxLogit));
            const sumExps = exps.reduce((a, b) => a + b, 0);
            const probs = exps.map(x => x / sumExps);

            let r = Math.random();
            for (let i = 0, accum = 0; i < probs.length; i++) {
                accum += probs[i];
                if (r < accum) return i;
            }
            return probs.length - 1;
        }
    }

    #postProcess(tokens) {
        const decoded = this.#tokenizer.decode(tokens, { skip_special_tokens: true })

        let processed = decoded
            .split(/\s+/).join('')
            .replace(/Ġ/g, ' ')
            .replace(/\[(PAD|BOS|EOS)]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        const textReg = /(\\(operatorname|mathrm|text|mathbf)\s?\*? {.*?})/g;
        let matches = processed.match(textReg);
        if (matches) {
            let namesList = matches.map(match => match.replace(/\s/g, ''));
            processed = processed.replace(textReg, () => namesList.shift() ?? '');
        }

        let temp = processed;
        while (true) {
            processed = temp;
            temp = processed
                .replace(/(?!\\)(\W)_?\s+?(\w)/g, "$1 $2")
                .replace(/(\w)\s+?(?!([\\_]))(\W)/g, "$1 $2");
            if (temp === processed) break;
        }
        return temp;
    }
}
