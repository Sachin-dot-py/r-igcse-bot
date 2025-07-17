import { pipeline } from "@huggingface/transformers";

export const classifier = await pipeline(
	"text-classification",
	process.env.MODEL_PATH,
	{
		device: "cpu", // or 'cuda' for GPU but we're poor :(
	},
);
