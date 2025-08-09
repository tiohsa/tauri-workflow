<script lang="ts">
    import { projectStore } from "$lib/presentation/stores/projectStore";
    import { TauriFsAdapter } from "$lib/infrastructure/persistence/tauriFsAdapter";
    import { scheduleBackward } from "$lib/usecases/scheduleBackward";
    import { computeCriticalChain } from "$lib/usecases/criticalChain";
    import { autoLayout } from "$lib/usecases/autoLayout";
    import { get } from "svelte/store";
    import type { ProjectSnapshot } from "$lib/domain/entities";

    const fs = new TauriFsAdapter();

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

    function runSchedule() {
        const terminal = snap.nodes?.[0]?.id;
        if (!terminal) return;
        const r = scheduleBackward(
            snap.nodes ?? [],
            snap.edges ?? [],
            snap.project,
            terminal,
        );
        projectStore.update((s) => ({ ...s, nodes: r.nodes }));
    }

    function runLayout() {
        const positioned = autoLayout(snap.nodes ?? [], snap.edges ?? []);
        projectStore.update((s) => ({ ...s, nodes: positioned }));
    }

    function markCC() {
        const cc = computeCriticalChain(
            snap.nodes ?? [],
            snap.edges ?? [],
            snap.project,
        );
        alert(
            `Critical Chain: ${cc.path.join(" -> ")}\nTotal Hours: ${cc.totalHours.toFixed(1)}`,
        );
    }

    async function onSave() {
        await fs.save(snap);
    }
    async function onLoad() {
        const data = await fs.load();
        projectStore.set(data);
    }

    function setDueDate(value: string) {
        projectStore.update((s) => ({
            ...s,
            project: { ...s.project, dueDate: value },
        }));
    }
    function setPB(value: string) {
        projectStore.update((s) => ({
            ...s,
            project: { ...s.project, projectBufferDays: Number(value) },
        }));
    }
    function setUse50(checked: boolean) {
        projectStore.update((s) => ({
            ...s,
            project: { ...s.project, useFiftyPctEstimate: !!checked },
        }));
    }
</script>

<div class="flex gap-2 p-2 border-b">
    <button onclick={runLayout}>整列</button>
    <button onclick={runSchedule}>逆算</button>
    <button onclick={markCC}>クリティカルチェーン</button>
    <button onclick={onSave}>保存</button>
    <button onclick={onLoad}>読み込み</button>

    <div class="ml-auto flex items-center gap-2">
        <label>納期
            <input
                type="date"
                value={snap?.project?.dueDate ?? ""}
                onchange={(e: Event) =>
                    setDueDate((e.currentTarget as HTMLInputElement).value)}
            />
        </label>
        <label>PB
            <input
                type="number"
                step="0.1"
                min="0"
                value={snap?.project?.projectBufferDays ?? 0}
                onchange={(e: Event) =>
                    setPB((e.currentTarget as HTMLInputElement).value)}
            />
        </label>
        <label>50%
            <input
                type="checkbox"
                checked={!!snap?.project?.useFiftyPctEstimate}
                onchange={(e: Event) =>
                    setUse50((e.currentTarget as HTMLInputElement).checked)}
            />
        </label>
    </div>
</div>
