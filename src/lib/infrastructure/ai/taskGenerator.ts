import { PromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";
import {
    appendFileSync,
    existsSync,
    renameSync,
    statSync,
    unlinkSync,
} from "node:fs";
import { join } from "node:path";
import type { NodeEntity } from "$lib/domain/entities";
import type { Locale } from "$lib/presentation/stores/i18n";

const LOG_FILE = join(process.cwd(), "task-generator.log");
const MAX_LOG_SIZE = 1024 * 1024; // 1MB
const MAX_LOG_GENERATIONS = 10;

/** Rotate existing logs, keeping only the most recent files. */
function rotateLogs() {
    const oldest = `${LOG_FILE}.${MAX_LOG_GENERATIONS}`;
    if (existsSync(oldest)) {
        unlinkSync(oldest);
    }
    for (let i = MAX_LOG_GENERATIONS - 1; i >= 0; i--) {
        const src = i === 0 ? LOG_FILE : `${LOG_FILE}.${i}`;
        const dest = `${LOG_FILE}.${i + 1}`;
        if (existsSync(src)) {
            renameSync(src, dest);
        }
    }
}

/** Append a line to the log file, rotating when size exceeds the limit. */
function logToFile(message: string) {
    try {
        const size = existsSync(LOG_FILE) ? statSync(LOG_FILE).size : 0;
        const newSize = size + Buffer.byteLength(message + "\n");
        if (newSize > MAX_LOG_SIZE) {
            rotateLogs();
        }
        appendFileSync(LOG_FILE, message + "\n");
    } catch (error) {
        console.error("logToFile error", error);
    }
}

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

const PROMPTS: Record<Locale, { rules: string; inputLabel: string; decompose: string; finalDeliverable: string }> = {
    ja: {
        rules:
            "出力は必ず日本語で。名前などの文字列はすべて日本語で記述し、英語を混在させないこと。",
        inputLabel: "入力:",
        decompose:
            "入力として goal（最終成果物の目的）と タスク（goal達成のためのタスクの一部）が与えられる。与えられたタスクは、goalに至る工程の中で特定の作業を示すものであり、そのタスクをさらに細かい作業単位に分解する。分解後のタスクは 1つにつき1つの作業内容 とし、複数の作業をまとめないこと。タスクは具体的かつ簡潔に記述し、分解したタスクだけでその元のタスクの内容が完全に実行できる状態にする。",
        finalDeliverable:
            "入力として与えられる goal を分析し、その最終成果物を実現するために最も適した エキスパート像（専門分野・役割） を具体的かつ明確に定義する。その定義したエキスパートとして、最終成果物に到達するためのタスクを順序立てて作成する。タスクは 1つにつき1つの作業内容 とし、複数の作業をまとめないこと。タスクは可能な限り具体的かつ簡潔に記述し、成果物までの全工程を漏れなくカバーする。",
    },
    en: {
        rules:
            "Output must be in English. Write all task names and other strings in English without mixing other languages.",
        inputLabel: "Input:",
        decompose:
            "You are given a goal (the purpose of the final deliverable) and a task (one step toward that goal). Break the given task down into smaller work units. Each resulting task must describe exactly one concrete action; do not merge multiple actions into one task. Keep each task specific and concise so that executing all of them completely fulfills the original task.",
        finalDeliverable:
            "Analyze the provided goal and clearly define the most suitable expert persona (field/role) to accomplish it. Acting as that expert, create an ordered list of tasks required to reach the final deliverable. Each task must represent exactly one unit of work and should not combine multiple actions. Keep tasks as specific and concise as possible to cover the entire process leading to the deliverable.",
    },
};

const provider = (import.meta.env.VITE_LLM_PROVIDER as string | undefined)?.toLowerCase();

let model: {
    invoke(prompt: string): Promise<unknown>;
};

if (provider === "openai") {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
    if (!apiKey) {
        throw new Error("VITE_OPENAI_API_KEY is not set. Check your .env files.");
    }
    model = {
        async invoke(prompt: string) {
            const res = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0,
                }),
            });
            const data = await res.json();
            return data.choices?.[0]?.message?.content ?? "";
        },
    };
} else {
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY as string | undefined;
    if (!apiKey) {
        throw new Error("VITE_GOOGLE_API_KEY is not set. Check your .env files.");
    }
    model = {
        async invoke(prompt: string) {
            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ role: "user", parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0 },
                    }),
                }
            );
            const data = await res.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        },
    };
}

/** Execute the prompt template and parse structured tasks from the LLM. */
async function callChain(
    promptText: string,
    input: Record<string, string>,
    locale: Locale
): Promise<NodeEntity[]> {
    // 入力を汎用ブロック化（どのキーでも対応）
    const inputBlock = Object.entries(input)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n");

    const prompt = new PromptTemplate({
        template: [
            "{rules}",
            // ユーザー意図
            "{promptText}",
            // 入力を明示
            "{inputLabel}",
            "{inputBlock}",
            // 構造化出力の指示
            "{format}",
        ].join("\n\n"),
        inputVariables: ["promptText", "inputBlock"],
        partialVariables: {
            format: formatInstructions,
            rules: PROMPTS[locale].rules,
            inputLabel: PROMPTS[locale].inputLabel,
        },
    });

    const formattedPrompt = await prompt.format({
        promptText,
        inputBlock,
    });
    logToFile(`[LLM REQUEST] ${formattedPrompt}`);

    const rawResponse = await model.invoke(formattedPrompt);
    const responseText =
        typeof rawResponse === "string"
            ? rawResponse
            : ((rawResponse as any).content as string);
    logToFile(`[LLM RESPONSE] ${responseText}`);

    const result = (await parser.parse(responseText)) as z.infer<typeof schema>;

    return result.tasks.map((t: any) => ({
        id: "",
        name: t.name,
        effortHours: t.effortHours ?? 8,
    }));
}

/** Decompose a given task into smaller steps via the AI model. */
export async function decomposeTaskWithAI(
    goal: string,
    task: string,
    locale: Locale,
    goalDescription: string = ""
): Promise<NodeEntity[]> {
    const text = PROMPTS[locale].decompose;
    return callChain(text, { goal, task, goalDescription }, locale);
}

/** Generate predecessors leading to the final deliverable. */
export async function generateFinalDeliverableWithAI(
    goal: string,
    locale: Locale,
    goalDescription: string = ""
): Promise<NodeEntity[]> {
    const text = PROMPTS[locale].finalDeliverable;
    return callChain(text, { goal, goalDescription }, locale);
}

/** Create tasks from an arbitrary natural-language prompt. */
export async function generateTasksFromPrompt(
    prompt: string,
    locale: Locale
): Promise<NodeEntity[]> {
    return callChain(prompt, {}, locale);
}

