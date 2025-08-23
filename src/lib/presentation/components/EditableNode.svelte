<script lang="ts">
    import type { NodeEntity } from "$lib/domain/entities";
    import { projectStore } from "$lib/presentation/stores/projectStore";
    import { Handle, Position } from "@xyflow/svelte";
    import { get } from "svelte/store";
    import { scheduleBackward } from "$lib/usecases/scheduleBackward";
    import { t } from "$lib/presentation/stores/i18n";
    import { createEventDispatcher } from "svelte";

    /** SvelteFlow から渡される props。 */
    let {
        id,
        data,
        selected,
    }: {
        id: string;
        data: NodeEntity & {
            isTerminal?: boolean;
            computedHours?: number;
            terminalNodeId?: string;
            shouldFocus?: boolean;
        };
        selected: boolean;
    } = $props();

    let editing = $state(false);
    let name = $state(data?.name ?? "");
    let hours = $state<number | string>(data?.effortHours ?? 0);
    let startDate = $state(data?.start ?? "");
    let endDate = $state(data?.end ?? "");
    let tr = $state(get(t));

    let nameInputEl: HTMLInputElement | null = null;

    const dispatch = createEventDispatcher<{
        addnode: { id: string };
        aitask: { id: string };
    }>();

    $effect(() => {
        name = data?.name ?? "";
        hours =
            (data?.isTerminal ? data?.computedHours : data?.effortHours) ?? 0;
        startDate = data?.start ?? "";
        endDate = data?.end ?? "";
    });

    $effect(() => {
        if (editing) {
            nameInputEl?.focus();
        }
    });
    $effect(() => {
        const un = t.subscribe((v) => (tr = v));
        return () => un?.();
    });

    /** Enable edit mode and focus the name input. */
    function startEdit(e: MouseEvent) {
        e.stopPropagation();
        editing = true;
        queueMicrotask(() => nameInputEl?.focus());
    }

    function onAddNodeClick(e: MouseEvent) {
        e.stopPropagation();
        dispatch("addnode", { id });
    }

    function onAITaskClick(e: MouseEvent) {
        e.stopPropagation();
        dispatch("aitask", { id });
    }

    /**
     * FlowCanvas から渡される shouldFocus が立っていたら
     * 編集モードにして name 入力へフォーカス
     */
    $effect(() => {
        if (data?.shouldFocus) {
            editing = true;
            queueMicrotask(() => nameInputEl?.focus());
        }
    });

    /** Persist the edited values to the store. */
    function commit() {
        if (!name) return;
        const h = Number(hours);
        if (!data?.isTerminal && (!Number.isFinite(h) || h <= 0)) return;
        const startChanged = startDate !== (data?.start ?? "");
        const endChanged = endDate !== (data?.end ?? "");
        projectStore.update((s) => ({
            ...s,
            nodes: s.nodes.map((n) => {
                if (n.id !== id) return n;
                const updated: NodeEntity = {
                    ...n,
                    name,
                    start: startDate,
                    end: endDate,
                };
                if (!data?.isTerminal) {
                    updated.effortHours = h;
                }
                if (startChanged || endChanged) {
                    updated.locked = true;
                }
                return updated;
            }),
        }));
        editing = false;

        /** 再計算 */
        const s = get(projectStore);
        if (data.terminalNodeId) {
            const res = scheduleBackward(
                s.nodes,
                s.edges,
                s.project,
                data.terminalNodeId,
            );
            projectStore.update((cur) => ({ ...cur, nodes: res.nodes }));
        }
    }

    /** Revert edits and exit edit mode. */
    function cancel() {
        name = data?.name ?? "";
        hours =
            (data?.isTerminal ? data?.computedHours : data?.effortHours) ?? 0;
        startDate = data?.start ?? "";
        endDate = data?.end ?? "";
        editing = false;
    }

    /** Handle Enter/Escape keys in the editor. */
    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Enter") {
            e.preventDefault();
            commit();
        }
        if (e.key === "Escape") {
            e.preventDefault();
            cancel();
        }
    }

    /** Toggle the locked state of this node. */
    function toggleLock(e: MouseEvent) {
        e.stopPropagation();
        projectStore.update((s) => ({
            ...s,
            nodes: s.nodes.map((n) =>
                n.id === id ? { ...n, locked: !n.locked } : n,
            ),
        }));
        const s = get(projectStore);
        if (data.terminalNodeId) {
            const res = scheduleBackward(
                s.nodes,
                s.edges,
                s.project,
                data.terminalNodeId,
            );
            projectStore.update((cur) => ({ ...cur, nodes: res.nodes }));
        }
    }
</script>

<div
    class="node"
    class:selected
    ondblclick={startEdit}
    role="button"
    tabindex="0"
>
    {#if editing}
        <div
            class="editor"
            onkeydown={onKeyDown}
            onclick={(e) => e.stopPropagation()}
            role="group"
            tabindex="0"
        >
            <div>
                <input
                    bind:this={nameInputEl}
                    class="in"
                    type="text"
                    placeholder={tr.taskName}
                    bind:value={name}
                />
            </div>
            <div class="dates">
                <input class="in date-in" type="date" bind:value={startDate} />
                <span class="unit">→</span>
                <input class="in date-in" type="date" bind:value={endDate} />
            </div>
            <div>
                {#if !data?.isTerminal}
                    <input
                        class="in w-20"
                        type="number"
                        min="0"
                        step="0.5"
                        bind:value={hours}
                    />
                    <span class="unit">h</span>
                {:else}
                    <span class="sum"
                        >Σ {(data?.computedHours ?? 0).toFixed(1)}h</span
                    >
                {/if}
                <button
                    class="btn"
                    onclick={(e) => {
                        e.stopPropagation();
                        commit();
                    }}>{tr.ok}</button
                >
                <button
                    class="btn"
                    onclick={(e) => {
                        e.stopPropagation();
                        cancel();
                    }}>{tr.cancel}</button
                >
            </div>
        </div>
    {:else}
        <div class="label">
            <div class="title">{data?.name}</div>
            <div class="meta">
                <span class="date">{data.start}</span>
                <span class="space">
                    {(data?.isTerminal
                        ? data?.computedHours
                        : data?.effortHours) ?? 0}h
                </span>
                <span class="date">{data.end}</span>
                <button class="lock" onclick={toggleLock}>
                    {data.locked ? "🔒" : "🔓"}
                </button>
            </div>
            <div></div>
        </div>
        <div class="hover-tools">
            <button
                class="tool-btn"
                title={tr.addNode}
                onclick={onAddNodeClick}
            >⊕</button>
            <button
                class="tool-btn"
                title={tr.decomposeTask}
                onclick={onAITaskClick}
            >🤖</button>
        </div>
    {/if}

    <Handle type="target" position={Position.Left} />
    {#if !data?.isTerminal}
        <Handle type="source" position={Position.Right} />
    {/if}
</div>

<style>
    .node {
        padding: 4px 8px;
        border-radius: 10px;
        border: 1px solid #d1d5db;
        background: white;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
        width: 180px; /* 固定幅 */
        position: relative;
    }
    .node.selected {
        outline: 2px solid #4f46e5;
    }
    .label .title {
        font-weight: 600;
        white-space: normal; /* 折り返しを許可 */
        word-break: break-word;
        overflow-wrap: anywhere;
    }
    .label .meta {
        font-size: 12px;
        opacity: 0.7;
        margin-top: 2px;
    }
    .editor {
        /* display: flex; */
        align-items: left;
        gap: 6px;
    }
    .editor .in {
        border: 1px solid #d1d5db;
        padding: 4px 6px;
        border-radius: 6px;
        width: 100%; /* 編集時も固定幅内に収める */
        box-sizing: border-box;
    }
    .btn {
        padding: 4px 8px;
        border: 1px solid #9ca3af;
        border-radius: 6px;
        font-size: 10px;
        background: #f9fafb;
    }
    .w-20 {
        width: 3rem;
        font-size: 12px;
    }
    .unit {
        font-size: 12px;
    }
    .sum {
        font-size: 12px;
        opacity: 0.8;
    }
    .date {
        padding: 0px 2px 0px 2px;
        font-size: 12px;
        border-radius: 2px;
    }
    .space {
        width: 60px;
    }
    .date-in {
        width: 6.5rem;
        font-size: 12px;
    }
    .lock {
        background: transparent;
        border: none;
        cursor: pointer;
        font-size: 12px;
        padding: 0 4px;
    }
    .hover-tools {
        position: absolute;
        top: -10px;
        right: -10px;
        display: flex;
        gap: 4px;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s ease;
    }
    .node:hover .hover-tools {
        opacity: 1;
        pointer-events: auto;
    }
    .tool-btn {
        width: 20px;
        height: 20px;
        border: 1px solid #9ca3af;
        border-radius: 9999px;
        background: #f9fafb;
        font-size: 12px;
        cursor: pointer;
    }
</style>
