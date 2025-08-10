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
    import type {
        ProjectSnapshot,
        NodeEntity,
        EdgeEntity,
    } from "$lib/domain/entities";
    import EditableNode from "./EditableNode.svelte";
    import "@xyflow/svelte/dist/style.css";
    import { autoLayout } from "$lib/usecases/autoLayout";

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

    // 追加: フォーカス中ノードID（Tabで左へノード追加に利用）
    let selectedNodeId = $state<string | null>(null);
    const INSERT_H_GAP = 240;
    const DEFAULT_NEW_EFFORT_HOURS = 8;
    const AUTO_CONNECT_ON_INSERT = true;

    const genId = (p = "n") => `${p}${crypto.randomUUID().slice(0, 8)}`;

    function runLayout() {
        const positioned = autoLayout(snap.nodes ?? [], snap.edges ?? []);
        projectStore.update((s) => ({ ...s, nodes: positioned }));
    }

    function addLeftNodeOf(targetId: string) {
        const target = (snap.nodes ?? []).find((n) => n.id === targetId);
        if (!target) return;
        const tx = target.position?.x ?? 0;
        const ty = target.position?.y ?? 0;

        const newNode: NodeEntity = {
            id: genId("n"),
            name: "新規タスク",
            effortHours: DEFAULT_NEW_EFFORT_HOURS,
            position: { x: tx - INSERT_H_GAP, y: ty },
        };

        projectStore.update((s) => {
            const next: ProjectSnapshot = {
                ...s,
                nodes: [...s.nodes, newNode],
            };
            if (AUTO_CONNECT_ON_INSERT) {
                const newEdge: EdgeEntity = {
                    id: genId("e"),
                    source: newNode.id,
                    target: target.id,
                };
                next.edges = [...s.edges, newEdge];
            } else {
                next.edges = s.edges;
            }
            return next;
        });

        selectedNodeId = newNode.id;
        runLayout();
    }

    function handleKeyDown(e: KeyboardEvent) {
        if (e.key === "Tab") {
            e.preventDefault();
            if (selectedNodeId) addLeftNodeOf(selectedNodeId);
        }
    }

    // Flow nodes/edges（タイプを editable に）
    const nodes = $derived(
        (snap?.nodes ?? []).map(
            (n): FlowNode<Record<string, unknown>> => ({
                id: n.id,
                position: n.position ?? { x: 0, y: 0 },
                data: n as unknown as Record<string, unknown>,
                type: "editable",
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

    // クリックでは選択IDのみ更新（編集はノード内のダブルクリックで）
    function onNodeClick({
        node,
    }: {
        node: FlowNode<Record<string, unknown>>;
        event: MouseEvent | TouchEvent;
    }) {
        selectedNodeId = node.id;
    }
</script>

<svelte:window on:keydown={handleKeyDown} />

<div style:width="100vw" style:height="100vh">
    <SvelteFlow
        {nodes}
        {edges}
        onconnect={onConnect}
        onnodeclick={onNodeClick}
        fitView
        nodeTypes={{ editable: EditableNode }}
    >
        <Background />
        <Controls />
    </SvelteFlow>
</div>
