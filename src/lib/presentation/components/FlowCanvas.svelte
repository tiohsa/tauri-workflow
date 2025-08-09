<script>
    import { projectStore } from "$lib/presentation/stores/projectStore";
    import { SvelteFlow, Background, Controls } from "@xyflow/svelte";
    import { get } from "svelte/store";

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

    let unsubscribe;
    $effect(() => {
        unsubscribe?.();
        unsubscribe = projectStore.subscribe((v) => (snap = v ?? fallback));
        return () => unsubscribe?.();
    });

    // ✅ $derived で派生値
    const nodes = $derived(
        (snap?.nodes ?? []).map((n) => ({
            id: n.id,
            position: n.position ?? { x: 0, y: 0 },
            data: n,
            type: "default",
        })),
    );

    const edges = $derived(
        (snap?.edges ?? []).map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
        })),
    );

    function onConnect(e) {
        projectStore.update((s) => ({
            ...s,
            edges: [
                ...s.edges,
                {
                    id: `e${crypto.randomUUID()}`.slice(0, 8),
                    source: e.source,
                    target: e.target,
                },
            ],
        }));
    }

    function onNodeDoubleClick(_event, node) {
        const name = prompt("作業名", node.data.name);
        if (name === null) return;
        const effort = Number(
            prompt("工数(時間)", String(node.data.effortHours)) ??
                node.data.effortHours,
        );
        projectStore.update((s) => ({
            ...s,
            nodes: s.nodes.map((n) =>
                n.id === node.id ? { ...n, name, effortHours: effort } : n,
            ),
        }));
    }
</script>

<div class="h-full">
    <SvelteFlow
        {nodes}
        {edges}
        on:connect={onConnect}
        on:nodeDoubleClick={onNodeDoubleClick}
        fitView
    >
        <Background />
        <Controls />
    </SvelteFlow>
</div>
