import { AutoTokenizer } from "@huggingface/transformers";
import { InferenceSession, Tensor } from "onnxruntime-web";

export class LatexOCR {
    constructor() {
        this.model = null;
        this.tokenizer = null;
        this.maxDimensions = [800, 400];
        this.minDimensions = [100, 32];
    }

    async initialize({ modelPath = __MODEL_URL__, tokenizerPath = __TOKENIZER_URL__ } = {}) {
        this.model = await InferenceSession.create(modelPath);
        this.tokenizer = await AutoTokenizer.from_pretrained(tokenizerPath);
    }

    async predict(imageElement) {
        const processedImage = await this.preprocessImage(imageElement);
        const inputTensor = new Tensor("float32", processedImage.data, [1, 3, ...processedImage.shape]);

        const { output } = await this.model.run({ input: inputTensor });
        return this.postProcess(output);
    }

    async preprocessImage(img) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        const resized = await this.minmaxSize(img);
        canvas.width = resized.width;
        canvas.height = resized.height;
        ctx.drawImage(resized, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        return this.normalize(imageData);
    }

    async minmaxSize(img) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        const maxRatio = Math.max(width / this.maxDimensions[0], height / this.maxDimensions[1]);
        if (maxRatio > 1) {
            width /= maxRatio;
            height /= maxRatio;
        }

        canvas.width = Math.max(width, this.minDimensions[0]);
        canvas.height = Math.max(height, this.minDimensions[1]);
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, width, height);

        return canvas;
    }

    normalize(imageData) {
        const float32Data = new Float32Array(3 * imageData.width * imageData.height);
        const mean = [0.5, 0.5, 0.5];
        const std = [0.5, 0.5, 0.5];

        for (let i = 0; i < imageData.data.length; i += 4) {
            const r = (imageData.data[i] / 255 - mean[0]) / std[0];
            const g = (imageData.data[i + 1] / 255 - mean[1]) / std[1];
            const b = (imageData.data[i + 2] / 255 - mean[2]) / std[2];

            float32Data[i / 4 * 3] = r;
            float32Data[i / 4 * 3 + 1] = g;
            float32Data[i / 4 * 3 + 2] = b;
        }

        return {
            data: float32Data,
            shape: [imageData.height, imageData.width]
        };
    }

    postProcess(outputTensor) {
        const tokenIds = Array.from(outputTensor.data);
        let decoded = this.tokenizer.decode(tokenIds, { skip_special_tokens: true });

        return decoded
            .replace(/Ġ/g, ' ')
            .replace(/\[(PAD|BOS|EOS)\]/g, '');
    }
}
