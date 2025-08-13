<script lang="ts">
    import { generateTasksFromPrompt } from "$lib/infrastructure/ai/taskGenerator";
    import { projectStore } from "$lib/presentation/stores/projectStore";
    import { t } from "$lib/presentation/stores/i18n";
    import { get } from "svelte/store";
    import type { NodeEntity, EdgeEntity } from "$lib/domain/entities";

    const INSERT_H_GAP = 240;

    let prompt = $state("");
    let lastPrompt = $state("");
    let lastTasks = $state<NodeEntity[] | null>(null);
    let loading = $state(false);
    let tr = $state(get(t));

    $effect(() => {
        const un = t.subscribe((v) => (tr = v));
        return () => un?.();
    });

    async function send() {
        if (!prompt.trim() || loading) return;
        lastPrompt = prompt;
        prompt = "";
        loading = true;
        try {
            lastTasks = await generateTasksFromPrompt(lastPrompt);
        } finally {
            loading = false;
        }
    }

    async function regenerate() {
        if (!lastPrompt || loading) return;
        loading = true;
        try {
            lastTasks = await generateTasksFromPrompt(lastPrompt);
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

<div class="chat-panel">
    <div class="messages">
        {#if lastTasks}
            <div class="message">
                <div class="prompt">{lastPrompt}</div>
                <div class="tasks">
                    <ul>
                        {#each lastTasks as task}
                            <li>{task.name} ({task.effortHours}h)</li>
                        {/each}
                    </ul>
                </div>
                <div class="actions">
                    <button onclick={accept}>{tr.accept}</button>
                    <button onclick={regenerate}>{tr.regenerate}</button>
                </div>
            </div>
        {/if}
    </div>
    <div class="input-area">
        <input
            type="text"
            bind:value={prompt}
            placeholder={tr.promptPlaceholder}
            onkeydown={(e: KeyboardEvent) => {
                if (e.key === "Enter") send();
            }}
        />
        <button onclick={send} disabled={loading}>{tr.sendPrompt}</button>
    </div>
</div>

<style>
    .chat-panel {
        width: 300px;
        border-left: 1px solid #ccc;
        display: flex;
        flex-direction: column;
        height: 100%;
    }
    .messages {
        flex: 1;
        overflow: auto;
        padding: 8px;
    }
    .input-area {
        display: flex;
        gap: 4px;
        padding: 8px;
    }
    .actions {
        margin-top: 8px;
        display: flex;
        gap: 4px;
    }
    .tasks ul {
        padding-left: 16px;
    }
    .prompt {
        font-weight: bold;
        margin-bottom: 4px;
    }
</style>
