<script lang="ts">
    import { projectStore } from "$lib/presentation/stores/projectStore";
    import {
        SvelteFlow,
        Background,
        Controls,
        type Edge as FlowEdge,
        type Node as FlowNode,
        type Connection,　　　　
        Position,
    } from "@xyflow/svelte";
    import { get } from "svelte/store";
    import type { ProjectSnapshot, NodeEntity, EdgeEntity } from "$lib/domain/entities";

    const fallback: ProjectSnapshot = {
        project: {
            name: "",
            dueDate: "",
            projectBufferDays: 0,
            useFiftyPctEstimate: true,
            shrinkRatio: 0.6,
            hoursPerDay: 8,
        },
        nodes: [],
        edges: [],
        groups: [],
    };
    let snap = $state<ProjectSnapshot>(get(projectStore) ?? fallback);

    let unsubscribe: () => void;
    $effect(() => {
        unsubscribe?.();
        unsubscribe = projectStore.subscribe((v) => (snap = v ?? fallback));
        return () => unsubscribe?.();
    });

    const nodes = $derived(
        (snap?.nodes ?? []).map(
            (n): FlowNode<Record<string, unknown>> => ({
                id: n.id,
                position: n.position ?? { x: 0, y: 0 },
                data: { ...n, label: `${n.name} (${n.effortHours}h)` } as Record<
                    string,
                    unknown
                >,
                type: "default",
                sourcePosition: Position.Right,
                targetPosition: Position.Left,
            }),
        ),
    );

    const edges = $derived(
        (snap?.edges ?? []).map(
            (e): FlowEdge<Record<string, unknown>> => ({
                id: e.id,
                source: e.source,
                target: e.target,
            }),
        ),
    );

    function onConnect(e: Connection) {
        projectStore.update((s) => ({
            ...s,
            edges: [
                ...s.edges,
                {
                    id: `e${crypto.randomUUID()}`.slice(0, 8),
                    source: e.source,
                    target: e.target,
                } as EdgeEntity,
            ],
        }));
    }

    let editingNode = $state<NodeEntity | null>(null);

    function onNodeClick({
        node,
        event,
    }: {
        node: FlowNode<Record<string, unknown>>;
        event: MouseEvent | TouchEvent;
    }) {
        if (!(event instanceof MouseEvent) || event.detail !== 2) return;
        editingNode = node.data as NodeEntity;
    }

    function saveNode() {
        if (!editingNode) return;
        projectStore.update((s) => ({
            ...s,
            nodes: s.nodes.map((n) => (n.id === editingNode?.id ? editingNode : n)),
        }));
        editingNode = null;
    }

    function cancelEdit() {
        editingNode = null;
    }

    function addNode() {
        const id = `n${crypto.randomUUID()}`.slice(0, 8);
        const newNode: NodeEntity = {
            id,
            name: "New Task",
            effortHours: 8,
            position: { x: 100, y: 100 },
        };
        projectStore.update((s) => ({ ...s, nodes: [...s.nodes, newNode] }));
    }
</script>

<div class="w-full h-full">
    <div class="absolute top-2 left-2 z-10">
        <button onclick={addNode}>Add Node</button>
    </div>

    {#if editingNode}
        <div class="modal-overlay">
            <div class="modal-content">
                <h3>Edit Node</h3>
                <label>
                    Name
                    <input type="text" bind:value={editingNode.name} />
                </label>
                <label>
                    Effort (hours)
                    <input type="number" bind:value={editingNode.effortHours} />
                </label>
                <div class="modal-actions">
                    <button onclick={cancelEdit}>Cancel</button>
                    <button onclick={saveNode}>Save</button>
                </div>
            </div>
        </div>
    {/if}

    <SvelteFlow
        class="w-full h-full"
        {nodes}
        {edges}
        onconnect={onConnect}
        onnodeclick={onNodeClick}
    >
        <Background />
        <Controls />
    </SvelteFlow>
</div>

<style>
    .modal-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 20;
    }

    .modal-content {
        background-color: var(--background-color, #f6f6f6);
        color: var(--color, #0f0f0f);
        padding: 1.5em;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }

    .modal-content h3 {
        margin-top: 0;
    }

    .modal-content label {
        display: block;
        margin-bottom: 1em;
    }

    .modal-content input {
        width: 100%;
        margin-top: 0.25em;
    }

    .modal-actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 1.5em;
    }

    .modal-actions button {
        margin-left: 0.5em;
    }
</style>
