<script lang="ts">
    import { projectStore, resetProject } from "$lib/presentation/stores/projectStore";
    import { usePersistencePort } from "$lib/presentation/services/persistence";
    import { scheduleBackward } from "$lib/usecases/scheduleBackward";
    import { computeCriticalChain } from "$lib/usecases/criticalChain";
    import { autoLayout } from "$lib/usecases/autoLayout";
    import { saveProject, loadProject } from "$lib/usecases/persistence";
    import { get } from "svelte/store";
    import type { ProjectSnapshot } from "$lib/domain/entities";
    import { t, locale, type Locale } from "$lib/presentation/stores/i18n";

    const persistencePort = usePersistencePort();

    const btnClass = "rounded bg-gray-200 px-2 py-1 hover:bg-gray-300";
    const inputClass = "border rounded px-1";

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

    /** Recalculate task dates based on current dependencies. */
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

    /** Auto arrange nodes to tidy the canvas. */
    function runLayout() {
        const positioned = autoLayout(snap.nodes ?? [], snap.edges ?? []);
        projectStore.update((s) => ({ ...s, nodes: positioned }));
    }

    /** Compute and display the critical chain. */
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

    /** Persist the current project snapshot. */
    async function onSave() {
        await saveProject(persistencePort, snap);
    }
    /** Load a project snapshot from storage. */
    async function onLoad() {
        const data = await loadProject(persistencePort);
        projectStore.set(data);
    }

    /** Reset to a fresh project. */
    function onNew() {
        resetProject();
    }

    /** Update project due date. */
    function setDueDate(value: string) {
        projectStore.update((s) => ({
            ...s,
            project: { ...s.project, dueDate: value },
        }));
    }
    /** Update project buffer days. */
    function setPB(value: string) {
        projectStore.update((s) => ({
            ...s,
            project: { ...s.project, projectBufferDays: Number(value) },
        }));
    }
    /** Toggle 50% estimate usage. */
    function setUse50(checked: boolean) {
        projectStore.update((s) => ({
            ...s,
            project: { ...s.project, useFiftyPctEstimate: !!checked },
        }));
    }
  /** Update final product description. */
  function setFinalDesc(value: string) {
      projectStore.update((s) => ({
          ...s,
          project: { ...s.project, finalProductDescription: value },
      }));
  }

  let descDialog: HTMLDialogElement;
  let descText = $state("");

  /** Open the description dialog. */
  function openDesc() {
      descText = snap?.project?.finalProductDescription ?? "";
      descDialog.showModal();
  }

  /** Save the description from the dialog. */
  function confirmDesc() {
      setFinalDesc(descText);
      descDialog.close();
  }
</script>

<div class="flex gap-2 border-b p-2">
    <button class={btnClass} onclick={runLayout}>{tr.align}</button>
    <button class={btnClass} onclick={runSchedule}>{tr.schedule}</button>
    <button class={btnClass} onclick={markCC}>{tr.criticalChain}</button>
    <button class={btnClass} onclick={onNew}>{tr.newProject}</button>
    <button class={btnClass} onclick={onSave}>{tr.save}</button>
    <button class={btnClass} onclick={onLoad}>{tr.load}</button>

    <div class="ml-auto flex items-center gap-2">
        <button class={btnClass} onclick={openDesc}>{tr.finalProductDescription}</button>
        <dialog bind:this={descDialog} class="rounded p-4">
            <div class="flex flex-col gap-2">
                <textarea
                    class="border rounded p-1"
                    style="width: 50vw; height: 50vh;"
                    bind:value={descText}
                ></textarea>
                <div class="ml-auto flex gap-2">
                    <button class={btnClass} onclick={() => descDialog.close()}>{tr.cancel}</button>
                    <button class={btnClass} onclick={confirmDesc}>{tr.ok}</button>
                </div>
            </div>
        </dialog>
        <label class="flex items-center gap-1"
            >{tr.dueDate}
            <input
                class={inputClass}
                type="date"
                value={snap?.project?.dueDate ?? ""}
                onchange={(e: Event) =>
                    setDueDate((e.currentTarget as HTMLInputElement).value)}
            />
        </label>
        <label class="flex items-center gap-1"
            >{tr.projectBuffer}
            <input
                class={inputClass}
                type="number"
                step="1"
                min="0"
                value={snap?.project?.projectBufferDays ?? 0}
                onchange={(e: Event) =>
                    setPB((e.currentTarget as HTMLInputElement).value)}
            />
        </label>
        <label class="flex items-center gap-1"
            >{tr.use50}
            <input
                class="h-4 w-4"
                type="checkbox"
                checked={!!snap?.project?.useFiftyPctEstimate}
                onchange={(e: Event) =>
                    setUse50((e.currentTarget as HTMLInputElement).checked)}
            />
        </label>
        <select
            class={inputClass}
            bind:value={currentLocale}
            onchange={(e) =>
                locale.set((e.currentTarget as HTMLSelectElement).value as Locale)}
        >
            <option value="ja">日本語</option>
            <option value="en">English</option>
        </select>
    </div>
</div>
