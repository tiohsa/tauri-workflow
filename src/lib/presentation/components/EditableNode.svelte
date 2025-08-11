<script lang="ts">
    import type { NodeEntity } from "$lib/domain/entities";
    import { projectStore } from "$lib/presentation/stores/projectStore";
    import { Handle, Position } from "@xyflow/svelte";
    import { get } from "svelte/store";
    import { scheduleBackward } from "$lib/usecases/scheduleBackward";
    import { t } from "$lib/presentation/stores/i18n";

    // SvelteFlow から渡される props
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
        };
        selected: boolean;
    } = $props();

    let editing = $state(true);
    let name = $state(data?.name ?? "");
    let hours = $state<number | string>(data?.effortHours ?? 0);
    let tr = $state(get(t));

    let nameInputEl: HTMLInputElement | null = null;

    $effect(() => {
        name = data?.name ?? "";
        hours =
            (data?.isTerminal ? data?.computedHours : data?.effortHours) ?? 0;
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

    function startEdit(e: MouseEvent) {
        e.stopPropagation();
        editing = true;
        queueMicrotask(() => nameInputEl?.focus());
    }

    function commit() {
        if (!name) return;
        if (data?.isTerminal) {
            // 最終成果物は名称のみ更新（時間は自動集計）
            projectStore.update((s) => ({
                ...s,
                nodes: s.nodes.map((n) => (n.id === id ? { ...n, name } : n)),
            }));
        } else {
            const h = Number(hours);
            if (!Number.isFinite(h) || h <= 0) return;
            projectStore.update((s) => ({
                ...s,
                nodes: s.nodes.map((n) =>
                    n.id === id ? { ...n, name, effortHours: h } : n,
                ),
            }));
        }
        editing = false;

        // 再計算
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

    function cancel() {
        name = data?.name ?? "";
        hours =
            (data?.isTerminal ? data?.computedHours : data?.effortHours) ?? 0;
        editing = false;
    }

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
</script>

<div
    class="node"
    class:selected
    ondblclick={startEdit}
    role="button"
    tabindex="0"
>
    {#if editing && !data?.isTerminal}
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
            <div>
                {#if !data?.isTerminal}
                    <input
                        class="in w-20"
                        type="number"
                        min="0.1"
                        step="0.1"
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
                {(data?.isTerminal ? data?.computedHours : data?.effortHours) ??
                    0}h
            </div>
            <div></div>
        </div>
    {/if}
    <div class="due-date">
        <span class="date">{data.start}</span>-<span class="date"
            >{data.end}</span
        >
    </div>

    <Handle type="target" position={Position.Left} />
    {#if !data?.isTerminal}
        <Handle type="source" position={Position.Right} />
    {/if}
</div>

<style>
    .node {
        padding: 8px 12px;
        border-radius: 10px;
        border: 1px solid #d1d5db;
        background: white;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
        min-width: 180px;
    }
    .node.selected {
        outline: 2px solid #4f46e5;
    }
    .label .title {
        font-weight: 600;
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
    .due-date {
        display: flex;
        border: 0px;
        font-size: 10px;
        font-family: inherit;
        /* width: 60px; */
    }
    .date {
        padding: 0px 2px 0px 2px;
        font-size: 10px;
    }
</style>
