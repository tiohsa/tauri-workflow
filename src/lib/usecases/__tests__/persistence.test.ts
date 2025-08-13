import test, { mock } from 'node:test';
import { strict as assert } from 'node:assert';
import type { ProjectSnapshot } from '$lib/domain/entities';
import { saveProject, loadProject } from '../persistence';

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
  // Arrange
  const snapshot = createSnapshot();
  const port = { save: mock.fn<[(snapshot: ProjectSnapshot)], Promise<void>>(), load: mock.fn() };

  // Act
  await saveProject(port, snapshot);

  // Assert
  assert.equal(port.save.mock.calls.length, 1);
  assert.deepEqual(port.save.mock.calls[0].arguments, [snapshot]);
});

test('loadProject は永続化ポートから読み込んだスナップショットを返す', async () => {
  // Arrange
  const expected = createSnapshot();
  const port = {
    save: mock.fn(),
    load: mock.fn<[], Promise<ProjectSnapshot>>(() => Promise.resolve(expected))
  };

  // Act
  const result = await loadProject(port);

  // Assert
  assert.deepEqual(result, expected);
});
