<script lang="ts">
    import { generateTasksFromPrompt } from "$lib/infrastructure/ai/taskGenerator";
    import { projectStore } from "$lib/presentation/stores/projectStore";
    import { t, locale, type Locale } from "$lib/presentation/stores/i18n";
    import { get } from "svelte/store";
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

    async function send() {
        if (!prompt.trim() || loading) return;
        lastPrompt = prompt;
        prompt = "";
        loading = true;
        try {
            lastTasks = await generateTasksFromPrompt(lastPrompt, currentLocale);
        } finally {
            loading = false;
        }
    }

    async function regenerate() {
        if (!lastPrompt || loading) return;
        loading = true;
        try {
            lastTasks = await generateTasksFromPrompt(lastPrompt, currentLocale);
        } finally {
            loading = false;
        }
    }

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
            class="rounded bg-green-500 px-3 py-1 text-white hover:bg-green-600 disabled:opacity-50"
            onclick={send}
            disabled={loading}
        >
            {tr.sendPrompt}
        </button>
    </div>
</div>
