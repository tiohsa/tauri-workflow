<script lang="ts">
    import { projectStore } from '$lib/presentation/stores/projectStore';
    import {
        SvelteFlow,
        Background,
        Controls,
        type Edge as FlowEdge,
        type Node as FlowNode,
        type Connection,
        Position,
    } from '@xyflow/svelte';
    import { get } from 'svelte/store';
    import type { ProjectSnapshot, NodeEntity, EdgeEntity } from '$lib/domain/entities';
    import EditableNode from './EditableNode.svelte';
    import '@xyflow/svelte/dist/style.css';
    import { autoLayout } from '$lib/application/usecases/autoLayout';
    import { t, dictionary } from '$lib/presentation/stores/i18n';
    import { useSvelteFlow } from '@xyflow/svelte';
    import { EMPTY_SNAPSHOT } from '$lib/domain/defaults';

    let snapshot = $state<ProjectSnapshot>(get(projectStore) ?? EMPTY_SNAPSHOT);
    let tr = $state(get(t));

    let unsubscribe: () => void;
    $effect(() => {
        unsubscribe?.();
        unsubscribe = projectStore.subscribe((v) => (snapshot = v ?? EMPTY_SNAPSHOT));
        return () => unsubscribe?.();
    });
    $effect(() => {
        const un = t.subscribe((v) => (tr = v));
        return () => un?.();
    });

    // 選択ノード（Tabで左に追加）
    let selectedNodeId = $state<string | null>(null);
    const INSERT_H_GAP = 240;
    const DEFAULT_NEW_EFFORT_HOURS = 8;
    const AUTO_CONNECT_ON_INSERT = true;
    const DROP_MERGE_DISTANCE = 50;
    const genId = (p = 'n') => `${p}${crypto.randomUUID().slice(0, 8)}`;
    const { screenToFlowPosition } = useSvelteFlow();

    type ContextMenuState = {
        x: number;
        y: number;
        type: "pane" | "node" | "edge";
        targetId?: string;
    } | null;
    let contextMenu = $state<ContextMenuState>(null);

    function runLayout() {
        const positioned = autoLayout(snapshot.nodes ?? [], snapshot.edges ?? []);
        projectStore.update((s) => ({ ...s, nodes: positioned }));
    }

    function addLeftNodeOf(targetId: string) {
        const target = (snapshot.nodes ?? []).find((n) => n.id === targetId);
        if (!target) return;
        const tx = target.position?.x ?? 0;
        const ty = target.position?.y ?? 0;

        const newNode: NodeEntity = {
            id: genId('n'),
            name: tr.newTask,
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
                    id: genId('e'),
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

    function openContextMenu(
        event: MouseEvent,
        type: "pane" | "node" | "edge",
        targetId?: string,
    ) {
        event.preventDefault();
        contextMenu = { x: event.clientX, y: event.clientY, type, targetId };
    }

    function onPaneContextMenu({ event }: { event: MouseEvent }) {
        openContextMenu(event, "pane");
    }

    function onNodeContextMenu({
        event,
        node,
    }: {
        event: MouseEvent;
        node: FlowNode;
    }) {
        selectedNodeId = node.id;
        openContextMenu(event, "node", node.id);
    }

    function onEdgeContextMenu({
        event,
        edge,
    }: {
        event: MouseEvent;
        edge: FlowEdge;
    }) {
        openContextMenu(event, "edge", edge.id);
    }

    function closeContextMenu() {
        contextMenu = null;
    }

    function addNodeAtPosition(pos: { x: number; y: number }) {
        const newNode: NodeEntity = {
            id: genId("n"),
            name: tr.newTask,
            effortHours: DEFAULT_NEW_EFFORT_HOURS,
            position: pos,
        };
        projectStore.update((s) => ({ ...s, nodes: [...s.nodes, newNode] }));
        selectedNodeId = newNode.id;
    }

    function handleAddNode() {
        if (!contextMenu) return;
        const pos = screenToFlowPosition({
            x: contextMenu.x,
            y: contextMenu.y,
        });
        addNodeAtPosition(pos);
        closeContextMenu();
    }

    function handleDeleteNode() {
        deleteSelectedNode();
        closeContextMenu();
    }

    function handleDeleteEdge() {
        if (!contextMenu?.targetId) return;
        const id = contextMenu.targetId;
        projectStore.update((s) => ({
            ...s,
            edges: s.edges.filter((e) => e.id !== id),
        }));
        closeContextMenu();
    }

    function handleKeyDown(e: KeyboardEvent) {
        if (e.key === "Tab") {
            e.preventDefault();
            if (selectedNodeId) addLeftNodeOf(selectedNodeId);
        }
    }

    const FINAL_NAMES = [
        dictionary.ja.finalProduct,
        dictionary.en.finalProduct,
    ];
    const terminalId = $derived(() => {
        const all = snapshot?.nodes ?? [];
        if (all.length === 0) return null;
        const outSet = new Set((snapshot?.edges ?? []).map((e) => e.source));
        const sinks = all.filter((n) => !outSet.has(n.id));
        if (sinks.length === 1) return sinks[0].id;
        const byName = all.find((n) => FINAL_NAMES.includes(n.name));
        return byName?.id ?? all[0].id;
    });

    const totalOtherHours = $derived(() =>
        (snapshot?.nodes ?? [])
            .filter((n) => n.id !== terminalId())
            .reduce((sum, n) => sum + (Number(n.effortHours) || 0), 0),
    );

    // 最終成果物ノードの effortHours を合計に同期（差分のみ更新）
    $effect(() => {
        const id = terminalId();
        if (!id) return;
        const cur = (snapshot.nodes ?? []).find((n) => n.id === id);
        if (!cur) return;
        const nextVal = totalOtherHours();
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
        (snapshot?.nodes ?? []).map(
            (n): FlowNode<Record<string, unknown>> => ({
                id: n.id,
                position: n.position ?? { x: 0, y: 0 },
                data: {
                    ...(n as unknown as Record<string, unknown>),
                    isTerminal: n.id === terminalId(),
                    computedHours:
                        n.id === terminalId() ? totalOtherHours() : n.effortHours,
                    terminalNodeId: terminalId(),
                },
                type: "editable",
                sourcePosition: Position.Right,
                targetPosition: Position.Left,
                selected: n.id === selectedNodeId,
            }),
        ),
    );

    function selectNode(id: string | null) {
        selectedNodeId = id;
    }

    $effect(() => {
        if (!selectedNodeId && snapshot.nodes?.length)
            selectNode(snapshot.nodes[0].id);
    });

    const edges = $derived(
        (snapshot?.edges ?? []).map(
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
    function onNodeDragStop(event: any) {
        const draggedNodeId = event.targetNode.id;
        const draggedPos = event.targetNode.position;
        const dropTarget = (snapshot.nodes ?? []).find((n) => {
            if (n.id === draggedNodeId) return false;
            const dx = (n.position?.x ?? 0) - draggedPos.x;
            const dy = (n.position?.y ?? 0) - draggedPos.y;
            return Math.hypot(dx, dy) < DROP_MERGE_DISTANCE;
        });

        if (!dropTarget) return;
        const draggedNode = (snapshot.nodes ?? []).find(
            (n) => n.id === draggedNodeId,
        );
        if (!draggedNode) return;

        projectStore.update((s) => {
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
            return {
                ...s,
                nodes: updatedNodes.filter((n) => n.id !== draggedNodeId),
                edges: s.edges.filter(
                    (e) =>
                        e.source !== draggedNodeId && e.target !== draggedNodeId,
                ),
                groups: s.groups.map((g) => ({
                    ...g,
                    nodeIds: g.nodeIds.filter((id) => id !== draggedNodeId),
                })),
            };
        });
    }
</script>

<svelte:window on:keydown={handleKeyDown} />

<div style:width="100vw" style:height="100vh" on:click={closeContextMenu}>
    <SvelteFlow
        {nodes}
        {edges}
        onconnect={onConnect}
        onnodeclick={onNodeDoubleClick}
        onnodedragstop={onNodeDragStop}
        onpanecontextmenu={onPaneContextMenu}
        onnodecontextmenu={onNodeContextMenu}
        onedgecontextmenu={onEdgeContextMenu}
        fitView
        nodeTypes={{ editable: EditableNode }}
    >
        <Background />
        <Controls />
    </SvelteFlow>
    {#if contextMenu}
        <div
            class="context-menu"
            style:left={`${contextMenu.x}px`}
            style:top={`${contextMenu.y}px`}
            on:click|stopPropagation
        >
            <ul>
                {#if contextMenu.type === "pane"}
                    <li on:click={handleAddNode}>{tr.addNode}</li>
                {:else if contextMenu.type === "node"}
                    <li on:click={handleAddNode}>{tr.addNode}</li>
                    <li on:click={handleDeleteNode}>{tr.deleteNode}</li>
                {:else if contextMenu.type === "edge"}
                    <li on:click={handleDeleteEdge}>
                        {tr.deleteConnector}
                    </li>
                {/if}
            </ul>
        </div>
    {/if}
</div>

<style>
    .context-menu {
        position: absolute;
        z-index: 1000;
        background: #fff;
        border: 1px solid #ccc;
        border-radius: 4px;
        padding: 4px 0;
        font-size: 14px;
    }
    .context-menu ul {
        list-style: none;
        margin: 0;
        padding: 0;
    }
    .context-menu li {
        padding: 4px 12px;
        cursor: pointer;
    }
    .context-menu li:hover {
        background: #eee;
    }
</style>
