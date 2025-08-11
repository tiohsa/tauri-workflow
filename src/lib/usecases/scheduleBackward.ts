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
    const pred = new Map<string, string[]>();

    edges.forEach(e => {
        pred.set(e.target, [...(pred.get(e.target) ?? []), e.source]);
    });

    const eff = (n: NodeEntity) =>
        (settings.useFiftyPctEstimate ? n.effortHours * settings.shrinkRatio : n.effortHours);

    const terminalEnd = new Date(new Date(settings.dueDate).getTime() - settings.projectBufferDays * 24 * 3600 * 1000);

    const t = nodeMap.get(terminalNodeId);
    if (!t) throw new Error('terminal node not found');
    t.end = toISODate(terminalEnd);
    t.start = toISODate(terminalEnd);

    const level = new Map<string, number>();
    const q: string[] = [terminalNodeId];
    level.set(terminalNodeId, 0);
    while (q.length) {
        const v = q.shift()!;
        for (const p of pred.get(v) ?? []) {
            if (!level.has(p)) {
                level.set(p, (level.get(v) ?? 0) + 1);
                q.push(p);
            }
        }
    }

    const maxLevel = Math.max(...level.values());
    for (let l = 1; l <= maxLevel; l++) {
        const prevNodes = Array.from(level.entries())
            .filter(([_, lvl]) => lvl === l - 1)
            .map(([id]) => nodeMap.get(id)!)
            .filter(n => n.start);
        let minStartPrev = terminalEnd;
        for (const n of prevNodes) {
            const d = new Date(n.start!);
            if (d < minStartPrev) minStartPrev = d;
        }
        for (const [id, lvl] of level.entries()) {
            if (lvl !== l) continue;
            const node = nodeMap.get(id)!;
            const end = minStartPrev;
            const start = new Date(end.getTime() - toWorkingMs(eff(node), settings));
            node.end = toISODate(end);
            node.start = toISODate(start);
            t.start = toISODate(new Date(Math.min(
                new Date(t.start).getTime(),
                start.getTime()
            )));
            t.end = toISODate(new Date(Math.max(
                new Date(t.end).getTime(),
                end.getTime()
            )));
        }
    }

    return { nodes: Array.from(nodeMap.values()) };
}
