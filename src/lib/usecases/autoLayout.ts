import type { EdgeEntity, NodeEntity } from '$lib/domain/entities';

export function autoLayout(nodes: NodeEntity[], edges: EdgeEntity[], hGap = 280, vGap = 110) {
    const succ = new Map<string, string[]>();
    const pred = new Map<string, string[]>();
    nodes.forEach(n => { succ.set(n.id, []); pred.set(n.id, []); });
    edges.forEach(e => { succ.get(e.source)!.push(e.target); pred.get(e.target)!.push(e.source); });

    const level = new Map<string, number>();
    const sinks = nodes.filter(n => (succ.get(n.id) ?? []).length === 0).map(n => n.id);
    const queue = [...sinks];
    sinks.forEach(id => level.set(id, 0));

    while (queue.length) {
        const v = queue.shift()!;
        const lv = level.get(v)!;
        for (const p of pred.get(v) ?? []) {
            const lp = Math.max(level.get(p) ?? 0, lv + 1);
            level.set(p, lp);
            queue.push(p);
        }
    }

    const grouped = new Map<number, NodeEntity[]>();
    for (const n of nodes) {
        const l = level.get(n.id) ?? 0;
        const arr = grouped.get(l) ?? [];
        arr.push(n); grouped.set(l, arr);
    }

    const positioned: NodeEntity[] = [];
    [...grouped.keys()].sort((a, b) => a - b).forEach((lvl) => {
        const list = grouped.get(lvl)!;
        list.sort((a, b) => a.name.localeCompare(b.name));
        list.forEach((n, i) => { positioned.push({ ...n, position: { x: -lvl * hGap, y: i * vGap } }); });
    });

    return positioned;
}