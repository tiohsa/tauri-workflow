<script lang="ts">
    import type { NodeEntity } from "$lib/domain/entities";
    import { projectStore } from "$lib/presentation/stores/projectStore";
    import { Handle, Position } from "@xyflow/svelte";

    // SvelteFlow から渡される props
    let {
        id,
        data,
        selected,
    }: { id: string; data: NodeEntity; selected: boolean } = $props();

    let editing = $state(false);
    let name = $state(data?.name ?? "");
    let hours = $state<number | string>(data?.effortHours ?? 0);

    let nameInputEl: HTMLInputElement | null = null;

    $effect(() => {
        // data 変更時にフォームへ反映
        name = data?.name ?? "";
        hours = data?.effortHours ?? 0;
    });

    function startEdit(e: MouseEvent) {
        e.stopPropagation();
        editing = true;
        queueMicrotask(() => nameInputEl?.focus());
    }

    function commit() {
        const h = Number(hours);
        if (!name || !Number.isFinite(h) || h <= 0) return; // 簡易バリデーション
        projectStore.update((s) => ({
            ...s,
            nodes: s.nodes.map((n) =>
                n.id === id ? { ...n, name, effortHours: h } : n,
            ),
        }));
        editing = false;
    }

    function cancel() {
        name = data?.name ?? "";
        hours = data?.effortHours ?? 0;
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

<div class="node" class:selected on:dblclick={startEdit}>
    {#if editing}
        <div class="editor" on:keydown={onKeyDown} on:click|stopPropagation>
            <input
                bind:this={nameInputEl}
                class="in"
                type="text"
                placeholder="作業名"
                bind:value={name}
            />
        </div>
        <div>
            <input
                class="in w-20"
                type="number"
                min="0.1"
                step="0.1"
                bind:value={hours}
            />
            <span>h</span>
            <button class="btn" on:click|stopPropagation={commit}>OK</button>
            <button class="btn" on:click|stopPropagation={cancel}>Cancel</button
            >
        </div>
    {:else}
        <div class="label">
            <div class="title">{data?.name}</div>
            <div class="meta">{data?.effortHours}h</div>
        </div>
    {/if}

    <!-- 依存接続用ハンドル -->
    <Handle type="target" {Position} position={Position.Left} />
    <Handle type="source" {Position} position={Position.Right} />
</div>

<style>
    .node {
        padding: 8px 12px;
        border-radius: 10px;
        border: 1px solid #d1d5db;
        background: white;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
        min-width: 160px;
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
        display: flex;
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
        background: #f9fafb;
    }
    .w-20 {
        width: 3rem;
    }
</style>
