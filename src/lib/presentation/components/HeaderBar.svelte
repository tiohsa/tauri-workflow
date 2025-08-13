<script lang="ts">
    import { projectStore } from '$lib/presentation/stores/projectStore';
    import type { PersistencePort } from '$lib/application/ports/persistencePort';
    import { saveProject, loadProject } from '$lib/application/usecases/projectIO';
    import { scheduleBackward } from '$lib/application/usecases/scheduleBackward';
    import { computeCriticalChain } from '$lib/application/usecases/criticalChain';
    import { autoLayout } from '$lib/application/usecases/autoLayout';
    import { TauriFsAdapter } from '$lib/infrastructure/persistence/tauriFsAdapter';
    import { get } from 'svelte/store';
    import type { ProjectSnapshot } from '$lib/domain/entities';
    import { EMPTY_SNAPSHOT } from '$lib/domain/defaults';
    import { t, locale, type Locale } from '$lib/presentation/stores/i18n';

    const persistence: PersistencePort = new TauriFsAdapter();

    let snapshot = $state<ProjectSnapshot>(get(projectStore) ?? EMPTY_SNAPSHOT);
    let tr = $state(get(t));
    let currentLocale = $state<Locale>(get(locale));

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
    $effect(() => {
        const un = locale.subscribe((v) => (currentLocale = v));
        return () => un?.();
    });

    function runSchedule() {
        const terminal = snapshot.nodes?.[0]?.id;
        if (!terminal) return;
        const r = scheduleBackward(
            snapshot.nodes ?? [],
            snapshot.edges ?? [],
            snapshot.project,
            terminal,
        );
        projectStore.update((s) => ({ ...s, nodes: r.nodes }));
    }

    function runLayout() {
        const positioned = autoLayout(snapshot.nodes ?? [], snapshot.edges ?? []);
        projectStore.update((s) => ({ ...s, nodes: positioned }));
    }

    function markCC() {
        const cc = computeCriticalChain(
            snapshot.nodes ?? [],
            snapshot.edges ?? [],
            snapshot.project,
        );
        alert(
            `${tr.ccTitle}: ${cc.path.join(" -> ")}\n${tr.totalHours}: ${cc.totalHours.toFixed(1)}`,
        );
    }

    async function onSave() {
        await saveProject(persistence, snapshot);
    }
    async function onLoad() {
        const data = await loadProject(persistence);
        projectStore.set(data);
    }

    function setDueDate(value: string) {
        updateProject('dueDate', value);
    }
    function setPB(value: string) {
        updateProject('projectBufferDays', Number(value));
    }
    function setUse50(checked: boolean) {
        updateProject('useFiftyPctEstimate', !!checked);
    }

    function updateProject<K extends keyof ProjectSnapshot['project']>(
        key: K,
        value: ProjectSnapshot['project'][K],
    ) {
        projectStore.update((s) => ({
            ...s,
            project: { ...s.project, [key]: value },
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
                value={snapshot?.project?.dueDate ?? ''}
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
                value={snapshot?.project?.projectBufferDays ?? 0}
                onchange={(e: Event) =>
                    setPB((e.currentTarget as HTMLInputElement).value)}
            />
        </label>
        <label
            >{tr.use50}
            <input
                type="checkbox"
                checked={!!snapshot?.project?.useFiftyPctEstimate}
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

