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
    import {
        t,
        dictionary,
        locale,
        type Locale,
    } from "$lib/presentation/stores/i18n";
    import { useSvelteFlow } from "@xyflow/svelte";
    import {
        decomposeTaskWithAI,
        generateFinalDeliverableWithAI,
    } from "$lib/infrastructure/ai/taskGenerator";

    const fallback: ProjectSnapshot = {
        project: {
            name: "",
            dueDate: "",
            projectBufferDays: 0,
            useFiftyPctEstimate: true,
            shrinkRatio: 0.6,
            hoursPerDay: 8,
            finalProductDescription: "",
        },
        nodes: [],
        edges: [],
        groups: [],
    };
    let snap = $state<ProjectSnapshot>(get(projectStore) ?? fallback);
    let tr = $state(get(t));
    let currentLocale = $state<Locale>(get(locale));

    let unsubscribe: () => void;
    $effect(() => {
        unsubscribe?.();
        unsubscribe = projectStore.subscribe((v) => (snap = v ?? fallback));
        return () => unsubscribe?.();
    });
    $effect(() => {
        const un = t.subscribe((v) => (tr = v));
        return () => un?.();
    });
    $effect(() => {
        const un = locale.subscribe((v) => (currentLocale = v));
        return () => un?.();
    });

    /** 選択ノード（Tabで左に追加） */
    let selectedNodeId = $state<string | null>(null);
    /** 直近に追加したノードの name 入力へフォーカスするための一時フラグ */
    let focusNodeId = $state<string | null>(null);
    const INSERT_H_GAP = 240;
    const INITIAL_CENTER_ZOOM = 1.0; // 初期センタリング時のズーム
    const NAV_CENTER_DURATION = 120; // 矢印ナビ時のセンタリング時間(ms)
    const EPS = 1e-6;
    const DEFAULT_NEW_EFFORT_HOURS = 8;
    const AUTO_CONNECT_ON_INSERT = true;
    /** Generate short random ids with optional prefix. */
    const genId = (p = "n") => `${p}${crypto.randomUUID().slice(0, 8)}`;
    const { screenToFlowPosition, setCenter, getNodesBounds, getZoom } = useSvelteFlow();

    type ContextMenuState = {
        x: number;
        y: number;
        type: "pane" | "node" | "edge";
        targetId?: string;
    } | null;
    let contextMenu = $state<ContextMenuState>(null);
    import { uiProcessing } from "$lib/presentation/stores/ui";
    let globalProcessing = $state(false);
    $effect(() => {
        const un = uiProcessing.subscribe((v) => (globalProcessing = v));
        return () => un?.();
    });
    let canvasEl: HTMLDivElement | null = null;
    /** 起動時のセンタリング実行フラグ */
    let didInitialCenter = $state(false);

    /** リスト入力ダイアログ */
    let listDialog: HTMLDialogElement | null = null;
    let listText = $state("");
    let listInsertPos: { x: number; y: number } | null = null;

    /** Arrange nodes to reduce overlap. */
    function runLayout() {
        const positioned = autoLayout(snap.nodes ?? [], snap.edges ?? []);
        projectStore.update((s) => ({ ...s, nodes: positioned }));
    }

    /** Insert a new node to the left of the target node. */
    function addLeftNodeOf(targetId: string) {
        const target = (snap.nodes ?? []).find((n) => n.id === targetId);
        if (!target) return;
        const tx = target.position?.x ?? 0;
        const ty = target.position?.y ?? 0;

        const newNode: NodeEntity = {
            id: genId("n"),
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
        focusNodeId = newNode.id;
        runLayout();
        /* レンダ後にフラグを解除（1フレームあれば十分） */
        setTimeout(() => (focusNodeId = null), 0);
    }

    /** Show context menu at cursor location. */
    function openContextMenu(
        event: MouseEvent,
        type: "pane" | "node" | "edge",
        targetId?: string,
    ) {
        event.preventDefault();
        contextMenu = { x: event.clientX, y: event.clientY, type, targetId };
    }

    /** Context menu when right-clicking the canvas. */
    function onPaneContextMenu({ event }: { event: MouseEvent }) {
        openContextMenu(event, "pane");
    }

    /** Context menu when right-clicking a node. */
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

    /** Context menu when right-clicking an edge. */
    function onEdgeContextMenu({
        event,
        edge,
    }: {
        event: MouseEvent;
        edge: FlowEdge;
    }) {
        openContextMenu(event, "edge", edge.id);
    }

    /** Hide the context menu. */
    function closeContextMenu() {
        contextMenu = null;
    }

    /** Create a new node at the given position. */
    function addNodeAtPosition(pos: { x: number; y: number }) {
        const newNode: NodeEntity = {
            id: genId("n"),
            name: tr.newTask,
            effortHours: DEFAULT_NEW_EFFORT_HOURS,
            position: pos,
        };
        projectStore.update((s) => ({ ...s, nodes: [...s.nodes, newNode] }));
        selectedNodeId = newNode.id;
        focusNodeId = newNode.id;
        setTimeout(() => (focusNodeId = null), 0);
    }

    /** Add node based on current context menu state. */
    function handleAddNode() {
        if (!contextMenu) return;
        const pos = screenToFlowPosition({
            x: contextMenu.x,
            y: contextMenu.y,
        });
        addNodeAtPosition(pos);
        closeContextMenu();
    }

    /** Open list-to-nodes dialog at cursor position. */
    function handleOpenListDialog() {
        if (!contextMenu) return;
        listInsertPos = screenToFlowPosition({ x: contextMenu.x, y: contextMenu.y });
        closeContextMenu();
        listText = "";
        listDialog?.showModal();
    }

    /** Create nodes from each non-empty line and connect last to final product. */
    function confirmCreateFromList() {
        const lines = listText
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
        if (lines.length === 0) {
            listDialog?.close();
            return;
        }
        const finalId = terminalId();
        if (finalId) {
            // Place nodes to the left of the final deliverable and chain them, but DO NOT connect last to final
            const finalNode = (snap.nodes ?? []).find((n) => n.id === finalId);
            const base = finalNode?.position ?? { x: 0, y: 0 };
            projectStore.update((s) => {
                const newNodes: NodeEntity[] = [];
                const newEdges: EdgeEntity[] = [];
                let prevId: string | null = null; // last node should NOT connect to final
                lines
                    .slice()
                    .reverse()
                    .forEach((name, idx) => {
                        const id = genId("n");
                        newNodes.push({
                            id,
                            name,
                            effortHours: DEFAULT_NEW_EFFORT_HOURS,
                            position: {
                                x: (base?.x ?? 0) - INSERT_H_GAP * (idx + 1),
                                y: base?.y ?? 0,
                            },
                        });
                        if (prevId) {
                            newEdges.push({ id: genId("e"), source: id, target: prevId });
                        }
                        prevId = id;
                    });
                return {
                    ...s,
                    nodes: [...s.nodes, ...newNodes],
                    edges: [...s.edges, ...newEdges],
                };
            });
        } else {
            // Fallback: place vertically at the clicked position without connections
            const base = listInsertPos ?? { x: 0, y: 0 };
            const vGap = 100;
            projectStore.update((s) => {
                const newNodes = lines.map((name, idx) => ({
                    id: genId("n"),
                    name,
                    effortHours: DEFAULT_NEW_EFFORT_HOURS,
                    position: { x: base.x, y: base.y + idx * vGap },
                } satisfies NodeEntity));
                return { ...s, nodes: [...s.nodes, ...newNodes] };
            });
        }
        listDialog?.close();
        listText = "";
        listInsertPos = null;
    }

    /** Delete selected node from store. */
    function handleDeleteNode() {
        deleteSelectedNode();
        closeContextMenu();
    }

    /** Remove selected edge. */
    function handleDeleteEdge() {
        if (!contextMenu?.targetId) return;
        const id = contextMenu.targetId;
        projectStore.update((s) => ({
            ...s,
            edges: s.edges.filter((e) => e.id !== id),
        }));
        closeContextMenu();
    }

    /** Break selected task into subtasks via AI from context menu. */
    async function handleDecomposeTask() {
        if (!contextMenu?.targetId) return;
        const targetId = contextMenu.targetId;
        closeContextMenu();
        await decomposeTask(targetId);
    }

    /** Break the specified task into subtasks via AI. */
    async function decomposeTask(targetId: string) {
        uiProcessing.set(true);
        try {
            const target = (snap.nodes ?? []).find((n) => n.id === targetId);
            if (!target) return;
            const finalNode = terminalId
                ? (snap.nodes ?? []).find((n) => n.id === terminalId())
                : null;
            const goal = finalNode?.name ?? tr.finalProduct;
            const tasks = await decomposeTaskWithAI(
                goal,
                target.name,
                currentLocale,
                snap.project.finalProductDescription ?? "",
            );
            projectStore.update((s) => {
                const base = target.position ?? { x: 0, y: 0 };
                const newNodes: NodeEntity[] = [];
                const newEdges: EdgeEntity[] = [];
                let prevId = target.id;
                tasks
                    .slice()
                    .reverse()
                    .forEach((t, idx) => {
                        const id = genId("n");
                        newNodes.push({
                            id,
                            name: t.name,
                            effortHours: t.effortHours,
                            position: {
                                x: base.x - INSERT_H_GAP * (idx + 1),
                                y: base.y,
                            },
                        });
                        newEdges.push({
                            id: genId("e"),
                            source: id,
                            target: prevId,
                        });
                        prevId = id;
                    });
                return {
                    ...s,
                    nodes: [...s.nodes, ...newNodes],
                    edges: [...s.edges, ...newEdges],
                };
            });
        } finally {
            uiProcessing.set(false);
        }
    }

    /** Generate a full task chain leading to the final product. */
    async function handleGenerateFinalTask() {
        if (!contextMenu) return;
        const { x, y } = contextMenu;
        closeContextMenu();
        uiProcessing.set(true);
        try {
            const finalNode = terminalId()
                ? (snap.nodes ?? []).find((n) => n.id === terminalId())
                : null;

            if (finalNode) {
                /* A final node exists. Generate predecessors for it. */
                const tasks = await generateFinalDeliverableWithAI(
                    finalNode.name,
                    currentLocale,
                    snap.project.finalProductDescription ?? "",
                );
                projectStore.update((s) => {
                    const base = finalNode.position ?? { x: 0, y: 0 };
                    const newNodes: NodeEntity[] = [];
                    const newEdges: EdgeEntity[] = [];
                    let prevId = finalNode.id;

                    /* The AI returns the whole chain including the final task. We skip the last one. */
                    const predecessorTasks = tasks.slice(0, -1);

                    predecessorTasks
                        .slice()
                        .reverse()
                        .forEach((t, idx) => {
                            const id = genId("n");
                            newNodes.push({
                                id,
                                name: t.name,
                                effortHours: t.effortHours,
                                position: {
                                    x: base.x - INSERT_H_GAP * (idx + 1),
                                    y: base.y,
                                },
                            });
                            newEdges.push({
                                id: genId("e"),
                                source: id,
                                target: prevId,
                            });
                            prevId = id;
                        });
                    return {
                        ...s,
                        nodes: [...s.nodes, ...newNodes],
                        edges: [...s.edges, ...newEdges],
                    };
                });
            } else {
                /* No final node. Create a new graph from scratch. */
                const pos = screenToFlowPosition({ x, y });
                const tasks = await generateFinalDeliverableWithAI(
                    tr.finalProduct,
                    currentLocale,
                    snap.project.finalProductDescription ?? "",
                );
                projectStore.update((s) => {
                    const newNodes: NodeEntity[] = [];
                    const newEdges: EdgeEntity[] = [];
                    let prev: string | null = null;
                    tasks.forEach((t, idx) => {
                        const id = genId("n");
                        newNodes.push({
                            id,
                            name: t.name,
                            effortHours: t.effortHours,
                            position: {
                                x: pos.x + INSERT_H_GAP * idx,
                                y: pos.y,
                            },
                        });
                        if (prev)
                            newEdges.push({
                                id: genId("e"),
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
            }
        } finally {
            uiProcessing.set(false);
        }
    }

    /** Keyboard shortcuts on the canvas. */
    function handleKeyDown(e: KeyboardEvent) {
        if (isTypingTarget(e.target)) return;
        if (e.key === "Tab") {
            e.preventDefault();
            if (selectedNodeId) addLeftNodeOf(selectedNodeId);
        } else if (e.key === "ArrowRight") {
            e.preventDefault();
            moveSelection("right");
        } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            moveSelection("left");
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            moveSelectionVertical("up");
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            moveSelectionVertical("down");
        } else if (e.key === "F2") {
            e.preventDefault();
            if (selectedNodeId) {
                // EditableNode 側の shouldFocus をトリガーして編集開始
                focusNodeId = selectedNodeId;
                setTimeout(() => (focusNodeId = null), 0);
            }
        }
    }


    const FINAL_NAMES = [
        dictionary.ja.finalProduct,
        dictionary.en.finalProduct,
    ];
    const terminalId = $derived(() => {
        const all = snap?.nodes ?? [];
        if (all.length === 0) return null;
        // 明示的指定を最優先
        const explicit = snap?.project?.finalNodeId;
        if (explicit && all.some((n) => n.id === explicit)) return explicit;
        // 既存ロジック（後方互換）
        const outSet = new Set((snap?.edges ?? []).map((e) => e.source));
        const sinks = all.filter((n) => !outSet.has(n.id));
        if (sinks.length === 1) return sinks[0].id;
        const byName = all.find((n) => FINAL_NAMES.includes(n.name));
        return byName?.id ?? all[0].id;
    });

    /** 起動時に最終成果物ノードを画面中心へ */
    $effect(() => {
        if (didInitialCenter) return;
        const id = terminalId();
        if (!id) return;
        // レンダ計測が完了したタイミングで中心へ移動
        setTimeout(() => {
            try {
                const b = getNodesBounds([id]);
                const cx = b.x + b.width / 2;
                const cy = b.y + b.height / 2;
                // 既存ズームは維持（durationで軽くアニメーション）
                void setCenter(cx, cy, { zoom: INITIAL_CENTER_ZOOM, duration: 200 });
                didInitialCenter = true;
            } catch {
                // 取得に失敗した場合は次フレームでもう一度試行
                setTimeout(() => {
                    try {
                        const b2 = getNodesBounds([id]);
                        const cx2 = b2.x + b2.width / 2;
                        const cy2 = b2.y + b2.height / 2;
                        void setCenter(cx2, cy2, { zoom: INITIAL_CENTER_ZOOM, duration: 200 });
                        didInitialCenter = true;
                    } catch {
                        /* no-op */
                    }
                }, 16);
            }
        }, 0);
    });

    const totalOthers = $derived(
        (snap?.nodes ?? [])
            .filter((n) => n.id !== terminalId())
            .reduce((sum, n) => sum + (Number(n.effortHours) || 0), 0),
    );

    /** 最終成果物ノードの effortHours を合計に同期（差分のみ更新） */
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

    /** Flow ノード/エッジ（最終成果物には computedHours を渡す） */
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
                    terminalNodeId: terminalId(),
                    shouldFocus: n.id === focusNodeId,
                    onAddNode: () => addLeftNodeOf(n.id),
                    onDecomposeTask: () => decomposeTask(n.id),
                },
                type: "editable",
                sourcePosition: Position.Right,
                targetPosition: Position.Left,
                selected: n.id === selectedNodeId,
            }),
        ),
    );

    /** Update the currently selected node. */
    function selectNode(id: string | null) {
        selectedNodeId = id;
    }

    $effect(() => {
        if (!selectedNodeId && snap.nodes?.length) selectNode(snap.nodes[0].id);
    });

    const edges = $derived(
        (snap?.edges ?? []).map(
            (e): FlowEdge<Record<string, unknown>> => ({
                id: e.id,
                source: e.source,
                target: e.target,
            }),
        ),
    );

    /** Add an edge between two nodes. */
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

    /** Set selection on double click. */
    function onNodeDoubleClick({ node }: { node: FlowNode }) {
        selectedNodeId = node?.id ?? null;
    }

    /** Remove the currently selected node and related edges. */
    function deleteSelectedNode() {
        if (!selectedNodeId) return;
        const id = selectedNodeId;

        projectStore.update((s) => {
            /* ノード削除 */
            const nextNodes = s.nodes.filter((n) => n.id !== id);
            /* 関連エッジも削除 */
            const nextEdges = s.edges.filter(
                (e) => e.source !== id && e.target !== id,
            );
            /* グループからも外す */
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

    /** 選択移動: 左右方向に最も近いノードへ */
    function moveSelection(dir: "left" | "right") {
        const allNodes = snap.nodes ?? [];
        const allEdges = snap.edges ?? [];
        let currentId = selectedNodeId ?? terminalId() ?? allNodes[0]?.id ?? null;
        if (!currentId) return;

        const cur = allNodes.find((n) => n.id === currentId);
        if (!cur) return;
        const cx = cur.position?.x ?? 0;
        const cy = cur.position?.y ?? 0;

        // 後続(右): source = current -> targets
        // 先行(左): target = current <- sources
        const nextIds = dir === "right"
            ? allEdges.filter((e) => e.source === currentId).map((e) => e.target)
            : allEdges.filter((e) => e.target === currentId).map((e) => e.source);

        const candidates = nextIds
            .map((id) => allNodes.find((n) => n.id === id))
            .filter((n): n is NonNullable<typeof n> => Boolean(n));
        if (candidates.length === 0) return;

        // 方向性を優先しつつ最短距離のノードを選ぶ
        const directional = candidates.filter((n) =>
            dir === "right"
                ? (n.position?.x ?? 0) >= cx
                : (n.position?.x ?? 0) <= cx,
        );
        const pool = directional.length ? directional : candidates;
        const best = pool.reduce((acc, n) => {
            const nx = n.position?.x ?? 0;
            const ny = n.position?.y ?? 0;
            const dx = Math.abs(nx - cx) + Math.abs(ny - cy) * 0.25; // 横優先で軽く縦距離も考慮
            if (!acc || dx < acc.score) return { node: n, score: dx };
            return acc;
        }, null as null | { node: typeof candidates[number]; score: number })?.node;

        if (!best) return;
        selectedNodeId = best.id;

        // 画面中央へ軽くスムーズスクロール（ズームは維持）
        try {
            const b = getNodesBounds([best.id]);
            const cx2 = b.x + b.width / 2;
            const cy2 = b.y + b.height / 2;
            void setCenter(cx2, cy2, { zoom: getZoom(), duration: NAV_CENTER_DURATION });
        } catch {
            /* no-op */
        }
    }

    /** 選択移動: 上下方向に同じ階層（同x列）へ */
    function moveSelectionVertical(dir: "up" | "down") {
        const allNodes = (snap.nodes ?? []).filter(Boolean);
        if (allNodes.length === 0) return;
        const curId = selectedNodeId ?? terminalId() ?? allNodes[0]?.id ?? null;
        if (!curId) return;

        const cur = allNodes.find((n) => n.id === curId);
        if (!cur) return;
        const cx = cur.position?.x ?? 0;
        const cy = cur.position?.y ?? 0;

        // 同じ列に最も近い x を持つノード群を列候補とする
        const others = allNodes.filter((n) => n.id !== curId);
        if (others.length === 0) return;
        let minDx = Infinity;
        for (const n of others) {
            const dx = Math.abs((n.position?.x ?? 0) - cx);
            if (dx < minDx) minDx = dx;
        }
        const column = others.filter((n) =>
            Math.abs((n.position?.x ?? 0) - cx) <= minDx + EPS,
        );

        const directional = column.filter((n) =>
            dir === "up"
                ? (n.position?.y ?? 0) < cy - EPS
                : (n.position?.y ?? 0) > cy + EPS,
        );
        if (directional.length === 0) return;

        // 縦方向に最短、同率なら x のズレが小さいものを優先
        const best = directional.reduce((acc, n) => {
            const nx = n.position?.x ?? 0;
            const ny = n.position?.y ?? 0;
            const dy = Math.abs(ny - cy);
            const dx = Math.abs(nx - cx);
            if (!acc) return { node: n, dy, dx };
            if (dy < acc.dy - EPS) return { node: n, dy, dx };
            if (Math.abs(dy - acc.dy) <= EPS && dx < acc.dx - EPS)
                return { node: n, dy, dx };
            return acc;
        }, null as null | { node: typeof directional[number]; dy: number; dx: number })?.node;

        if (!best) return;
        selectedNodeId = best.id;
        try {
            const b = getNodesBounds([best.id]);
            const cx2 = b.x + b.width / 2;
            const cy2 = b.y + b.height / 2;
            void setCenter(cx2, cy2, { zoom: getZoom(), duration: NAV_CENTER_DURATION });
        } catch {
            /* no-op */
        }
    }

    /** Detect if a key event originated from an editable element. */
    function isTypingTarget(el: EventTarget | null) {
        if (!(el instanceof HTMLElement)) return false;
        const tag = el.tagName.toLowerCase();
        return tag === "input" || tag === "textarea" || el.isContentEditable;
    }

    /** Merge nodes when one is dragged onto another. */
    function onNodeDragStop(event: any) {
        const draggedNodeId = event.targetNode.id;
        const draggedPos = event.targetNode.position;
        const threshold = 50; // ドロップ判定距離(px)

        /* Drop先候補を探索（自分以外） */
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
                /* Drop先の工数に加算 */
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
                /* Drop元削除 + 関連エッジ削除 */
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

<svelte:window onkeydown={handleKeyDown} />

<div class="canvas-root" bind:this={canvasEl} onclick={closeContextMenu}>
    <SvelteFlow
        {nodes}
        {edges}
        onconnect={onConnect}
        onnodeclick={onNodeDoubleClick}
        onnodedragstop={onNodeDragStop}
        onpanecontextmenu={onPaneContextMenu}
        onnodecontextmenu={onNodeContextMenu}
        onedgecontextmenu={onEdgeContextMenu}
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
            onclick={(e) => e.stopPropagation()}
        >
            <ul>
                {#if contextMenu.type === "pane"}
                    <li onclick={handleAddNode}>{tr.addNode}</li>
                    <li onclick={handleOpenListDialog}>{tr.createFromList}</li>
                    <li onclick={handleGenerateFinalTask}>
                        {tr.generateFinalTask}
                    </li>
                {:else if contextMenu.type === "node"}
                    <li onclick={handleAddNode}>{tr.addNode}</li>
                    <li onclick={handleDeleteNode}>{tr.deleteNode}</li>
                    <li onclick={handleDecomposeTask}>{tr.decomposeTask}</li>
                    <li onclick={handleOpenListDialog}>{tr.createFromList}</li>
                {:else if contextMenu.type === "edge"}
                    <li onclick={handleDeleteEdge}>
                        {tr.deleteConnector}
                    </li>
                {/if}
            </ul>
        </div>
    {/if}
    <dialog bind:this={listDialog} class="rounded p-4">
        <div class="flex flex-col gap-2">
            <label>{tr.createFromList}</label>
            <textarea
                class="border rounded p-1"
                style="width: 50vw; height: 40vh;"
                placeholder={tr.linesPlaceholder}
                bind:value={listText}
            ></textarea>
            <div class="ml-auto flex gap-2">
                <button class="rounded bg-gray-200 px-2 py-1 hover:bg-gray-300" onclick={() => listDialog?.close()}>{tr.cancel}</button>
                <button class="rounded bg-gray-200 px-2 py-1 hover:bg-gray-300" onclick={confirmCreateFromList}>{tr.ok}</button>
            </div>
        </div>
    </dialog>
</div>

<style>
    .canvas-root {
        width: 100%;
        height: 90%;
        position: relative;
    }
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
