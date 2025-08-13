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
    model: "gemini-2.5-flash",
    temperature: 0,
    apiKey: API_KEY,
});

async function callChain(
    promptText: string,
    input: Record<string, string>
): Promise<NodeEntity[]> {
    // 入力を汎用ブロック化（どのキーでも対応）
    const inputBlock = Object.entries(input)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n");

    const JA_RULES =
        "出力は必ず日本語で。名前などの文字列はすべて日本語で記述し、英語を混在させないこと。";

    const prompt = new PromptTemplate({
        template: [
            JA_RULES,
            // ユーザー意図
            "{promptText}",
            // 入力を明示
            "入力:",
            "{inputBlock}",
            // 構造化出力の指示
            "{format}",
        ].join("\n\n"),
        inputVariables: ["promptText", "inputBlock"],
        partialVariables: { format: formatInstructions },
    });

    const formattedPrompt = await prompt.format({
        promptText,
        inputBlock,
    });
    console.log("[LLM REQUEST]", formattedPrompt);

    const rawResponse = await model.invoke(formattedPrompt);
    const responseText =
        typeof rawResponse === "string" ? rawResponse : rawResponse.content;
    console.log("[LLM RESPONSE]", responseText);

    const result = (await parser.parse(responseText)) as z.infer<typeof schema>;

    return result.tasks.map((t: any) => ({
        id: "",
        name: t.name,
        effortHours: t.effortHours ?? 8,
    }));
}

// タスク分解（日本語で返す）
export async function decomposeTaskWithAI(goal: string, task: string): Promise<NodeEntity[]> {
    const text =
        "入力として goal（最終成果物の目的）と タスク（goal達成のためのタスクの一部）が与えられる。与えられたタスクは、goalに至る工程の中で特定の作業を示すものであり、そのタスクをさらに細かい作業単位に分解する。分解後のタスクは 1つにつき1つの作業内容 とし、複数の作業をまとめないこと。タスクは具体的かつ簡潔に記述し、分解したタスクだけでその元のタスクの内容が完全に実行できる状態にする。";
    return callChain(text, { "goal": goal, "task": task });
}


// 最終成果物へ至るシーケンス生成（日本語で返す）
export async function generateFinalDeliverableWithAI(
    goal: string
): Promise<NodeEntity[]> {
    const text =
        "入力として与えられる goal を分析し、その最終成果物を実現するために最も適した エキスパート像（専門分野・役割） を具体的かつ明確に定義する。その定義したエキスパートとして、最終成果物に到達するためのタスクを順序立てて作成する。タスクは 1つにつき1つの作業内容 とし、複数の作業をまとめないこと。タスクは可能な限り具体的かつ簡潔に記述し、成果物までの全工程を漏れなくカバーする。";
    return callChain(text, { goal });
}

// 任意のプロンプトからタスクを生成
export async function generateTasksFromPrompt(
    prompt: string,
): Promise<NodeEntity[]> {
    return callChain(prompt, {});
}