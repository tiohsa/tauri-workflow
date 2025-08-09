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

    function onNodeClick({
        node,
        event,
    }: {
        node: FlowNode<Record<string, unknown>>;
        event: MouseEvent | TouchEvent;
    }) {
        if (!(event instanceof MouseEvent) || event.detail !== 2) return;
        const data = node.data as unknown as NodeEntity;
        const name = prompt("作業名", data.name);
        if (name === null) return;
        const effort = Number(
            prompt("工数(時間)", String(data.effortHours)) ?? data.effortHours,
        );
        projectStore.update((s) => ({
            ...s,
            nodes: s.nodes.map((n) =>
                n.id === node.id ? { ...n, name, effortHours: effort } : n,
            ),
        }));
    }
</script>

<div class="w-full h-full">
    <SvelteFlow
        class="w-full h-full"
        {nodes}
        {edges}
        onconnect={onConnect}
        onnodeclick={onNodeClick}
        fitView
    >
        <Background />
        <Controls />
    </SvelteFlow>
</div>
