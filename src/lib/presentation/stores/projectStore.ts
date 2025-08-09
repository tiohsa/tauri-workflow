import { writable } from 'svelte/store';
import type { ProjectSnapshot } from '$lib/domain/entities';

export const projectStore = writable<ProjectSnapshot>({
    project: {
        name: 'New Project',
        dueDate: new Date().toISOString().slice(0, 10),
        projectBufferDays: 5,
        useFiftyPctEstimate: true,
        shrinkRatio: 0.6,
        hoursPerDay: 8
    },
    nodes: [
        { id: 'n1', name: '最終成果物', effortHours: 8, position: { x: 0, y: 0 } },
    ],
    edges: [],
    groups: []
});