<script lang="ts">
    import { projectStore } from "$lib/presentation/stores/projectStore";
    import { TauriFsAdapter } from "$lib/infrastructure/persistence/tauriFsAdapter";
    import { scheduleBackward } from "$lib/usecases/scheduleBackward";
    import { computeCriticalChain } from "$lib/usecases/criticalChain";
    import { autoLayout } from "$lib/usecases/autoLayout";
    import { get } from "svelte/store";
    import type { ProjectSnapshot } from "$lib/domain/entities";
    import { t, locale, type Locale } from "$lib/presentation/stores/i18n";

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
            `${tr.ccTitle}: ${cc.path.join(" -> ")}\n${tr.totalHours}: ${cc.totalHours.toFixed(1)}`,
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
    <button onclick={runLayout}>{tr.align}</button>
    <button onclick={runSchedule}>{tr.schedule}</button>
    <button onclick={markCC}>{tr.criticalChain}</button>
    <button onclick={onSave}>{tr.save}</button>
    <button onclick={onLoad}>{tr.load}</button>

    <div class="ml-auto flex items-center gap-2">
        <label
            >{tr.dueDate}
            <input
                type="date"
                value={snap?.project?.dueDate ?? ""}
                onchange={(e: Event) =>
                    setDueDate((e.currentTarget as HTMLInputElement).value)}
            />
        </label>
        <label
            >{tr.projectBuffer}
            <input
                type="number"
                step="1"
                min="0"
                value={snap?.project?.projectBufferDays ?? 0}
                onchange={(e: Event) =>
                    setPB((e.currentTarget as HTMLInputElement).value)}
            />
        </label>
        <label
            >{tr.use50}
            <input
                type="checkbox"
                checked={!!snap?.project?.useFiftyPctEstimate}
                onchange={(e: Event) =>
                    setUse50((e.currentTarget as HTMLInputElement).checked)}
            />
        </label>
        <select
            bind:value={currentLocale}
            onchange={(e) =>
                locale.set((e.currentTarget as HTMLSelectElement).value as Locale)}
        >
            <option value="ja">日本語</option>
            <option value="en">English</option>
        </select>
    </div>
</div>
