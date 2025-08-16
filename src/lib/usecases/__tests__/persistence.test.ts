import { test, expect, vi } from 'vitest';
import type { ProjectSnapshot } from '$lib/domain/entities';
import { saveProject, loadProject } from '../persistence';

/** Minimal sample project used across tests. */
function createSnapshot(): ProjectSnapshot {
  return {
    project: {
      name: 'sample',
      dueDate: '2024-01-01',
      projectBufferDays: 0,
      useFiftyPctEstimate: false,
      shrinkRatio: 1,
      hoursPerDay: 8
    },
    nodes: [],
    edges: [],
    groups: []
  };
}

test('saveProject はスナップショットを永続化ポートに渡して保存する', async () => {
  /** Arrange */
  const snapshot = createSnapshot();
  const port = { save: vi.fn(), load: vi.fn() };

  /** Act */
  await saveProject(port, snapshot);
  expect(port.save).toHaveBeenCalledTimes(1);
  expect(port.save).toHaveBeenCalledWith(snapshot);
});

test('loadProject は永続化ポートから読み込んだスナップショットを返す', async () => {
  /** Arrange */
  const expected = createSnapshot();
  const port = {
    save: vi.fn(),
    load: vi.fn(() => Promise.resolve(expected))
  };

  /** Act */
  const result = await loadProject(port);
  expect(result).toEqual(expected);
});
