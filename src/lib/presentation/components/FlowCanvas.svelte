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
    import "@xyflow/svelte/dist/style.css";

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

    // ---- 追加: フォーカス中ノードと挿入設定 ----
    let selectedNodeId = $state<string | null>(null);
    const INSERT_H_GAP = 240; // 左にずらす距離(px)
    const DEFAULT_NEW_EFFORT_HOURS = 8; // 新規ノードの既定工数(h)
    const AUTO_CONNECT_ON_INSERT = true; // 追加時に自動で依存(左→右)を張る

    const genId = (prefix = "n") =>
        `${prefix}${crypto.randomUUID().slice(0, 8)}`;

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
                edges: s.edges,
                groups: s.groups,
            };

            if (AUTO_CONNECT_ON_INSERT) {
                const newEdge: EdgeEntity = {
                    id: genId("e"),
                    source: newNode.id, // 左の新ノード → 右の既存ノード
                    target: target.id,
                };
                next.edges = [...next.edges, newEdge];
            }

            return next;
        });

        // 追加直後にそのノードを選択状態に
        selectedNodeId = newNode.id;
    }

    function handleKeyDown(e: KeyboardEvent) {
        if (e.key === "Tab") {
            // フォーカス移動を止める
            e.preventDefault();
            if (selectedNodeId) addLeftNodeOf(selectedNodeId);
        }
    }

    // ---- 既存：派生ノード/エッジ ----
    const nodes = $derived(
        (snap?.nodes ?? []).map(
            (n): FlowNode<Record<string, unknown>> => ({
                id: n.id,
                position: n.position ?? { x: 0, y: 0 },
                data: {
                    ...n,
                    label: `${n.name} (${n.effortHours}h)`,
                } as Record<string, unknown>,
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

    // 単/ダブルクリック両対応：選択IDを常に更新し、ダブルクリック時のみ編集
    function onNodeClick({
        node,
        event,
    }: {
        node: FlowNode<Record<string, unknown>>;
        event: MouseEvent | TouchEvent;
    }) {
        selectedNodeId = node.id; // ← フォーカス更新
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

<svelte:window on:keydown={handleKeyDown} />

<div style:width="100vw" style:height="100vh">
    <SvelteFlow
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
