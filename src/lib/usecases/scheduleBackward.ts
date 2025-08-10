import type { EdgeEntity, NodeEntity, ProjectSettings } from '$lib/domain/entities';
import { toWorkingMs, toISODate } from '$lib/shared/time';
export interface ScheduleResult { nodes: NodeEntity[]; }

export function scheduleBackward(
    nodes: NodeEntity[],
    edges: EdgeEntity[],
    settings: ProjectSettings,
    terminalNodeId: string
): ScheduleResult {
    const nodeMap = new Map(nodes.map(n => [n.id, { ...n }]));
    const succ = new Map<string, string[]>();
    const pred = new Map<string, string[]>();

    edges.forEach(e => {
        succ.set(e.source, [...(succ.get(e.source) ?? []), e.target]);
        pred.set(e.target, [...(pred.get(e.target) ?? []), e.source]);
    });

    const eff = (n: NodeEntity) =>
        (settings.useFiftyPctEstimate ? n.effortHours * settings.shrinkRatio : n.effortHours);

    const terminalEnd = new Date(new Date(settings.dueDate).getTime() - settings.projectBufferDays * 24 * 3600 * 1000);
    const order = reverseTopological(nodes, edges);

    const t = nodeMap.get(terminalNodeId);
    if (!t) throw new Error('terminal node not found');
    t.end = toISODate(terminalEnd);
    t.start = toISODate(new Date(terminalEnd.getTime() - toWorkingMs(eff(t), settings)));

    for (const id of order) {
        if (id === terminalNodeId) continue;
        const node = nodeMap.get(id)!;
        const successors = succ.get(id) ?? [];
        let minStartOfSucc: Date | undefined;
        for (const s of successors) {
            const sNode = nodeMap.get(s)!;
            if (!sNode.start) continue;
            const d = new Date(sNode.start);
            minStartOfSucc = !minStartOfSucc || d < minStartOfSucc ? d : minStartOfSucc;
        }
        const end = minStartOfSucc ?? terminalEnd;
        const start = new Date(end.getTime() - toWorkingMs(eff(node), settings));
        node.end = toISODate(end);
        node.start = toISODate(start);
    }

    return { nodes: Array.from(nodeMap.values()) };
}

function reverseTopological(nodes: NodeEntity[], edges: EdgeEntity[]): string[] {
    const succ = new Map<string, string[]>();
    const indeg = new Map<string, number>();
    nodes.forEach(n => indeg.set(n.id, 0));
    edges.forEach(e => {
        succ.set(e.source, [...(succ.get(e.source) ?? []), e.target]);
        indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
    });
    const q: string[] = nodes.filter(n => (succ.get(n.id) ?? []).length === 0).map(n => n.id);
    const order: string[] = [];
    const visited = new Set<string>();
    while (q.length) {
        const v = q.pop()!;
        if (visited.has(v)) continue;
        visited.add(v);
        order.push(v);
        for (const e of edges.filter(e => e.target === v)) {
            const u = e.source;
            const remain = (succ.get(u) ?? []).filter(x => x !== v);
            succ.set(u, remain);
            if (remain.length === 0) q.push(u);
        }
    }
    return order;
}
