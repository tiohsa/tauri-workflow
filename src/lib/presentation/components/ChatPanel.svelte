<script lang="ts">
    import { generateTasksFromPrompt } from "$lib/infrastructure/ai/taskGenerator";
    import { projectStore } from "$lib/presentation/stores/projectStore";
    import { t, locale, type Locale } from "$lib/presentation/stores/i18n";
    import { get } from "svelte/store";
    import { uiProcessing } from "$lib/presentation/stores/ui";
    import type { NodeEntity, EdgeEntity } from "$lib/domain/entities";

    const INSERT_H_GAP = 240;

    let prompt = $state("");
    let lastPrompt = $state("");
    let lastTasks = $state<NodeEntity[] | null>(null);
    let loading = $state(false);
    let tr = $state(get(t));
    let currentLocale = $state<Locale>(get(locale));

    $effect(() => {
        const un = t.subscribe((v) => (tr = v));
        return () => un?.();
    });
    $effect(() => {
        const un = locale.subscribe((v) => (currentLocale = v));
        return () => un?.();
    });

    /** Send the prompt to the AI and store generated tasks. */
    async function send() {
        if (!prompt.trim() || loading) return;
        lastPrompt = prompt;
        prompt = "";
        loading = true;
        uiProcessing.set(true);
        try {
            lastTasks = await generateTasksFromPrompt(lastPrompt, currentLocale);
        } finally {
            loading = false;
            uiProcessing.set(false);
        }
    }

    /** Re-run generation using the last prompt. */
    async function regenerate() {
        if (!lastPrompt || loading) return;
        loading = true;
        uiProcessing.set(true);
        try {
            lastTasks = await generateTasksFromPrompt(lastPrompt, currentLocale);
        } finally {
            loading = false;
            uiProcessing.set(false);
        }
    }

    /** Add generated tasks to the project. */
    function accept() {
        if (!lastTasks || lastTasks.length === 0) return;
        projectStore.update((s) => {
            const baseX = 0;
            const baseY = 0;
            const newNodes: NodeEntity[] = [];
            const newEdges: EdgeEntity[] = [];
            let prev: string | null = null;
            lastTasks!.forEach((t, idx) => {
                const id = `n${crypto.randomUUID().slice(0, 8)}`;
                newNodes.push({
                    id,
                    name: t.name,
                    effortHours: t.effortHours,
                    position: { x: baseX + INSERT_H_GAP * idx, y: baseY },
                });
                if (prev)
                    newEdges.push({
                        id: `e${crypto.randomUUID().slice(0, 8)}`,
                        source: prev,
                        target: id,
                    });
                prev = id;
            });
            return {
                ...s,
                nodes: [...s.nodes, ...newNodes],
                edges: [...s.edges, ...newEdges],
            };
        });
        lastTasks = null;
    }
</script>

<div class="flex h-full w-72 flex-col border-l border-gray-300 bg-white">
    <div class="flex-1 space-y-4 overflow-auto p-4">
        {#if lastTasks}
            <div class="space-y-2">
                <div class="font-semibold">{lastPrompt}</div>
                <ul class="list-disc pl-5 text-sm">
                    {#each lastTasks as task}
                        <li>{task.name} ({task.effortHours}h)</li>
                    {/each}
                </ul>
                <div class="flex gap-2 pt-2">
                    <button
                        class="rounded bg-blue-500 px-2 py-1 text-white hover:bg-blue-600"
                        onclick={accept}
                    >
                        {tr.accept}
                    </button>
                    <button
                        class="rounded bg-gray-200 px-2 py-1 hover:bg-gray-300"
                        onclick={regenerate}
                    >
                        {tr.regenerate}
                    </button>
                </div>
            </div>
        {/if}
    </div>
    <div class="flex items-center gap-2 border-t border-gray-200 p-2">
        <input
            type="text"
            class="flex-1 rounded border border-gray-300 px-2 py-1"
            bind:value={prompt}
            placeholder={tr.promptPlaceholder}
            onkeydown={(e: KeyboardEvent) => {
                if (e.key === "Enter") send();
            }}
        />
        <button
            class="inline-flex items-center justify-center rounded bg-green-500 p-2 text-white hover:bg-green-600 disabled:opacity-50"
            onclick={send}
            disabled={loading}
            aria-label={tr.sendPrompt}
            title={tr.sendPrompt}
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="currentColor"
                aria-hidden="true"
            >
                <!-- simple paper plane icon -->
                <polygon points="2,21 23,12 2,3 7,12 2,21" />
            </svg>
        </button>
    </div>
</div>
