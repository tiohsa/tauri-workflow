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
    const order = new Map<string, number>();
    const placed: { x: number; y: number }[] = [];

    // sort each level while trying to minimise edge crossings
    const levels = [...grouped.keys()].sort((a, b) => a - b);
    for (const lvl of levels) {
        const list = grouped.get(lvl)!;

        const sorted = list
            .slice()
            .sort((a, b) => {
                const ba = barycenter(a.id);
                const bb = barycenter(b.id);
                if (ba === bb) return a.name.localeCompare(b.name);
                return ba - bb;
            });

        sorted.forEach((n, i) => {
            const x = -lvl * hGap;
            let y = i * vGap;

            // ensure nodes do not overlap by shifting down until free
            while (placed.some(p => Math.abs(p.x - x) < hGap && Math.abs(p.y - y) < vGap)) {
                y += vGap;
            }
            placed.push({ x, y });

            positioned.push({ ...n, position: { x, y } });
            order.set(n.id, i);
        });
    }

    return positioned;

    function barycenter(id: string): number {
        const list = succ.get(id) ?? [];
        if (list.length === 0) return Number.POSITIVE_INFINITY;
        const sum = list.reduce((acc, cur) => acc + (order.get(cur) ?? 0), 0);
        return sum / list.length;
    }
}