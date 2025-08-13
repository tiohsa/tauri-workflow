export function computeCriticalChain(nodes, edges, settings, useFifty = true) {
    const eff = (n) => (useFifty && settings.useFiftyPctEstimate ? n.effortHours * settings.shrinkRatio : n.effortHours);
    const adj = new Map();
    const indeg = new Map();
    nodes.forEach(n => { adj.set(n.id, []); indeg.set(n.id, 0); });
    edges.forEach(e => { adj.get(e.source).push(e.target); indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1); });
    const topo = [];
    const q = nodes.filter(n => (indeg.get(n.id) ?? 0) === 0).map(n => n.id);
    while (q.length) {
        const v = q.shift();
        topo.push(v);
        for (const w of adj.get(v)) {
            indeg.set(w, (indeg.get(w) ?? 0) - 1);
            if ((indeg.get(w) ?? 0) === 0)
                q.push(w);
        }
    }
    const dist = new Map();
    const prev = new Map();
    for (const n of nodes) {
        dist.set(n.id, -Infinity);
        prev.set(n.id, null);
    }
    for (const id of topo) {
        if (edges.every(e => e.target !== id)) {
            const n = nodes.find(n => n.id === id);
            dist.set(id, eff(n));
        }
    }
    for (const v of topo) {
        for (const w of adj.get(v)) {
            const alt = (dist.get(v) ?? -Infinity) + eff(nodes.find(n => n.id === w));
            if (alt > (dist.get(w) ?? -Infinity)) {
                dist.set(w, alt);
                prev.set(w, v);
            }
        }
    }
    let end = null;
    let best = -Infinity;
    for (const [id, d] of dist) {
        if (d > best) {
            best = d;
            end = id;
        }
    }
    const path = [];
    while (end) {
        path.unshift(end);
        end = prev.get(end) ?? null;
    }
    return { path, totalHours: best };
}
