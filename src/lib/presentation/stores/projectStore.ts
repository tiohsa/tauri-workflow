import { writable, get } from 'svelte/store';
import type { ProjectSnapshot } from '$lib/domain/entities';
import { t } from './i18n';

const STORAGE_KEY = 'project-snapshot';

function loadSnapshot(): ProjectSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ProjectSnapshot) : null;
  } catch {
    return null;
  }
}

function saveSnapshot(snapshot: ProjectSnapshot): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore write errors
  }
}

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
      finalNodeId: 'n1',
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

const initial = loadSnapshot() ?? createInitialSnapshot();

export const projectStore = writable<ProjectSnapshot>(initial);

// 状態が更新されるたびに最新のスナップショットを保存する
// subscribe は初期化時にも発火するため、起動直後にも保存される
projectStore.subscribe((snap) => {
  saveSnapshot(snap);
});

/** Reset the store to its initial state. */
export function resetProject() {
  projectStore.set(createInitialSnapshot());
}
