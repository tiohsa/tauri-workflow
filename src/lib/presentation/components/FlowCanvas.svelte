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

    // 選択ノード（Tabで左に追加）
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
        } else if (
            (e.key === "Delete" || e.key === "Backspace") &&
            !isTypingTarget(e.target)
        ) {
            e.preventDefault();
            deleteSelectedNode();
        }
    }

    const terminalId = $derived(() => {
        const all = snap?.nodes ?? [];
        if (all.length === 0) return null;
        const outSet = new Set((snap?.edges ?? []).map((e) => e.source)); // 出次数>0のノードID
        const sinks = all.filter((n) => !outSet.has(n.id)); // 出次数0=終端候補
        if (sinks.length === 1) return sinks[0].id;
        const byName = all.find((n) => n.name === "最終成果物");
        return byName?.id ?? all[0].id;
    });

    const totalOthers = $derived(
        (snap?.nodes ?? [])
            .filter((n) => n.id !== terminalId())
            .reduce((sum, n) => sum + (Number(n.effortHours) || 0), 0),
    );

    // 最終成果物ノードの effortHours を合計に同期（差分のみ更新）
    $effect(() => {
        const id = terminalId();
        if (!id) return;
        const cur = (snap.nodes ?? []).find((n) => n.id === id);
        if (!cur) return;
        const nextVal = totalOthers;
        const curVal = Number(cur.effortHours) || 0;
        if (Math.abs(curVal - nextVal) > 1e-9) {
            projectStore.update((s) => ({
                ...s,
                nodes: s.nodes.map((n) =>
                    n.id === id ? { ...n, effortHours: nextVal } : n,
                ),
            }));
        }
    });

    // Flow ノード/エッジ（最終成果物には computedHours を渡す）
    const nodes = $derived(
        (snap?.nodes ?? []).map(
            (n): FlowNode<Record<string, unknown>> => ({
                id: n.id,
                position: n.position ?? { x: 0, y: 0 },
                data: {
                    ...(n as unknown as Record<string, unknown>),
                    isTerminal: n.id === terminalId(),
                    computedHours:
                        n.id === terminalId() ? totalOthers : n.effortHours,
                },
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

    function onNodeDoubleClick({ node }: { node: FlowNode }) {
        selectedNodeId = node?.id ?? null;
    }

    function deleteSelectedNode() {
        if (!selectedNodeId) return;
        const id = selectedNodeId;

        projectStore.update((s) => {
            // ノード削除
            const nextNodes = s.nodes.filter((n) => n.id !== id);
            // 関連エッジも削除
            const nextEdges = s.edges.filter(
                (e) => e.source !== id && e.target !== id,
            );
            // グループからも外す
            const nextGroups = s.groups.map((g) => ({
                ...g,
                nodeIds: g.nodeIds.filter((nid) => nid !== id),
            }));

            return {
                ...s,
                nodes: nextNodes,
                edges: nextEdges,
                groups: nextGroups,
            };
        });

        selectedNodeId = null;
    }

    // 入力欄での Backspace/Delete は邪魔しない
    function isTypingTarget(el: EventTarget | null) {
        if (!(el instanceof HTMLElement)) return false;
        const tag = el.tagName.toLowerCase();
        return tag === "input" || tag === "textarea" || el.isContentEditable;
    }

    // ノードドラッグ終了時処理
    function onNodeDragStop({
        targetNode,
    }: {
        targetNode: FlowNode | null;
    }) {
        if (!targetNode) return;

        const draggedNodeId = targetNode.id;
        const draggedPos = targetNode.position;
        const threshold = 50; // ドロップ判定距離(px)

        // Drop先候補を探索（自分以外）
        const dropTarget = (snap.nodes ?? []).find((n) => {
            if (n.id === draggedNodeId) return false;
            const dx = (n.position?.x ?? 0) - draggedPos.x;
            const dy = (n.position?.y ?? 0) - draggedPos.y;
            return Math.hypot(dx, dy) < threshold;
        });

        if (dropTarget) {
            const draggedNode = (snap.nodes ?? []).find(
                (n) => n.id === draggedNodeId,
            );
            if (!draggedNode) return;

            projectStore.update((s) => {
                // Drop先の工数に加算
                const updatedNodes = s.nodes.map((n) =>
                    n.id === dropTarget.id
                        ? {
                              ...n,
                              effortHours:
                                  (Number(n.effortHours) || 0) +
                                  (Number(draggedNode.effortHours) || 0),
                          }
                        : n,
                );
                // Drop元削除 + 関連エッジ削除
                return {
                    ...s,
                    nodes: updatedNodes.filter((n) => n.id !== draggedNodeId),
                    edges: s.edges.filter(
                        (e) =>
                            e.source !== draggedNodeId &&
                            e.target !== draggedNodeId,
                    ),
                    groups: s.groups.map((g) => ({
                        ...g,
                        nodeIds: g.nodeIds.filter((id) => id !== draggedNodeId),
                    })),
                };
            });
        }
    }
</script>

<svelte:window on:keydown={handleKeyDown} />

<div style:width="100vw" style:height="100vh">
    <SvelteFlow
        {nodes}
        {edges}
        onconnect={onConnect}
        onnodeclick={onNodeDoubleClick}
        onnodedragstop={onNodeDragStop}
        fitView
        nodeTypes={{ editable: EditableNode }}
    >
        <Background />
        <Controls />
    </SvelteFlow>
</div>
