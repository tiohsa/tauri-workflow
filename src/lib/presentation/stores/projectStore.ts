import { writable, get } from 'svelte/store';
import type { ProjectSnapshot } from '$lib/domain/entities';
import { t } from './i18n';

/** Produce a fresh project with a single terminal node. */
function createInitialSnapshot(): ProjectSnapshot {
    return {
        project: {
            name: 'New Project',
            dueDate: new Date().toISOString().slice(0, 10),
            projectBufferDays: 5,
            useFiftyPctEstimate: true,
            shrinkRatio: 0.6,
            hoursPerDay: 8,
            finalProductDescription: '',
        },
        nodes: [
            {
                id: 'n1',
                name: get(t).finalProduct,
                effortHours: 8,
                position: { x: 0, y: 0 },
            },
        ],
        edges: [],
        groups: [],
    };
}

export const projectStore = writable<ProjectSnapshot>(createInitialSnapshot());

/** Reset the store to its initial state. */
export function resetProject() {
    projectStore.set(createInitialSnapshot());
}