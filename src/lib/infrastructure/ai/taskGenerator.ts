import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";
import type { NodeEntity } from "$lib/domain/entities";

const schema = z.object({
    tasks: z.array(
        z.object({
            name: z.string(),
            effortHours: z.number().optional().default(8),
        })
    ),
});

const parser = StructuredOutputParser.fromZodSchema(schema as any);
const formatInstructions = parser.getFormatInstructions();

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY as string | undefined;
if (!API_KEY) {
    throw new Error("VITE_GOOGLE_API_KEY is not set. Check your .env files.");
}

const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash",
    temperature: 0,
    apiKey: API_KEY,
});

async function callChain(promptText: string, input: Record<string, string>): Promise<NodeEntity[]> {
    const prompt = new PromptTemplate({
        template: `${promptText}\n{format}`,
        inputVariables: Object.keys(input),
        partialVariables: { format: formatInstructions },
    });
    const chain = prompt.pipe(model).pipe(parser);
    const result = await chain.invoke(input);
    return result.tasks.map((t) => ({
        id: "",
        name: t.name,
        effortHours: t.effortHours ?? 8,
    }));
}

export async function decomposeTaskWithAI(task: string): Promise<NodeEntity[]> {
    const text = "Break down the given task into smaller tasks. Return JSON.";
    return callChain(text, { task });
}

export async function generateFinalDeliverableWithAI(goal: string): Promise<NodeEntity[]> {
    const text = "Create a sequence of tasks leading to the final deliverable described. Return JSON.";
    return callChain(text, { goal });
}
