<script>
    import { projectStore } from "$lib/presentation/stores/projectStore";
    import { TauriFsAdapter } from "$lib/infrastructure/persistence/tauriFsAdapter";
    import { scheduleBackward } from "$lib/usecases/scheduleBackward";
    import { computeCriticalChain } from "$lib/usecases/criticalChain";
    import { autoLayout } from "$lib/usecases/autoLayout";
    import { get } from "svelte/store"; // 追加 ✅

    const fs = new TauriFsAdapter();

    // ✅ 初期値をストアから取得（無ければデフォルト形状）
    const fallback = {
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
    let snap = $state(get(projectStore) ?? fallback);

    // ✅ 購読してローカル state に反映
    let unsubscribe;
    $effect(() => {
        unsubscribe?.();
        unsubscribe = projectStore.subscribe((v) => (snap = v ?? fallback));
        return () => unsubscribe?.();
    });

    function runSchedule() {
        const terminal = snap.nodes?.[0]?.id; // ✅ 安全参照
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

    function setDueDate(value) {
        projectStore.update((s) => ({
            ...s,
            project: { ...s.project, dueDate: value },
        }));
    }
    function setPB(value) {
        projectStore.update((s) => ({
            ...s,
            project: { ...s.project, projectBufferDays: Number(value) },
        }));
    }
    function setUse50(checked) {
        projectStore.update((s) => ({
            ...s,
            project: { ...s.project, useFiftyPctEstimate: !!checked },
        }));
    }
</script>

<div class="flex gap-2 p-2 border-b">
    <button on:click={runLayout}>整列</button>
    <button on:click={runSchedule}>逆算</button>
    <button on:click={markCC}>クリティカルチェーン</button>
    <button on:click={onSave}>保存</button>
    <button on:click={onLoad}>読み込み</button>

    <div class="ml-auto flex items-center gap-2">
        <label
            >納期
            <input type="date" value={snap?.project?.dueDate ?? ""} />
            on:change={(e) => setDueDate(e.currentTarget.value)} />
        </label>
        <label
            >PB
            <input
                type="number"
                step="0.1"
                min="0"
                value={snap?.project?.projectBufferDays ?? 0}
            />
            on:change={(e) => setPB(e.currentTarget.value)} />
        </label>
        <label
            >50%
            <input
                type="checkbox"
                checked={!!snap?.project?.useFiftyPctEstimate}
            />
            on:change={(e) => setUse50(e.currentTarget.checked)} />
        </label>
    </div>
</div>
