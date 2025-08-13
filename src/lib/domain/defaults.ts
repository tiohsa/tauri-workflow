import type { ProjectSnapshot } from './entities';

export const EMPTY_SNAPSHOT: ProjectSnapshot = {
    project: {
        name: '',
        dueDate: '',
        projectBufferDays: 0,
        useFiftyPctEstimate: true,
        shrinkRatio: 0.6,
        hoursPerDay: 8,
    },
    nodes: [],
    edges: [],
    groups: [],
};
