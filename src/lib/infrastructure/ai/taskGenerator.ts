import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "langchain/output_parsers";
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

const parser = StructuredOutputParser.fromZodSchema(schema);
const formatInstructions = parser.getFormatInstructions();

const model = new ChatOpenAI({ temperature: 0 });

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

