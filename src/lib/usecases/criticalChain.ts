import type { EdgeEntity, NodeEntity, ProjectSettings } from '$lib/domain/entities';

export function computeCriticalChain(
    nodes: NodeEntity[],
    edges: EdgeEntity[],
    settings: ProjectSettings,
    useFifty = true
) {
    const eff = (n: NodeEntity) => (useFifty && settings.useFiftyPctEstimate ? n.effortHours * settings.shrinkRatio : n.effortHours);
    const adj = new Map<string, string[]>();
    const indeg = new Map<string, number>();
    nodes.forEach(n => { adj.set(n.id, []); indeg.set(n.id, 0); });
    edges.forEach(e => { adj.get(e.source)!.push(e.target); indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1); });

    const topo: string[] = [];
    const q = nodes.filter(n => (indeg.get(n.id) ?? 0) === 0).map(n => n.id);
    while (q.length) {
        const v = q.shift()!;
        topo.push(v);
        for (const w of adj.get(v)!) {
            indeg.set(w, (indeg.get(w) ?? 0) - 1);
            if ((indeg.get(w) ?? 0) === 0) q.push(w);
        }
    }

    const dist = new Map<string, number>();
    const prev = new Map<string, string | null>();
    for (const n of nodes) { dist.set(n.id, -Infinity); prev.set(n.id, null); }
    for (const id of topo) {
        if (edges.every(e => e.target !== id)) {
            const n = nodes.find(n => n.id === id)!;
            dist.set(id, eff(n));
        }
    }
    for (const v of topo) {
        for (const w of adj.get(v)!) {
            const alt = (dist.get(v) ?? -Infinity) + eff(nodes.find(n => n.id === w)!);
            if (alt > (dist.get(w) ?? -Infinity)) { dist.set(w, alt); prev.set(w, v); }
        }
    }

    let end: string | null = null; let best = -Infinity;
    for (const [id, d] of dist) { if (d > best) { best = d; end = id; } }
    const path: string[] = [];
    while (end) { path.unshift(end); end = prev.get(end) ?? null; }
    return { path, totalHours: best };
}