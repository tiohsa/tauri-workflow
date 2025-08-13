// @ts-nocheck
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { saveProject, loadProject } from './projectIO.js';
import { EMPTY_SNAPSHOT } from '../../domain/defaults.js';

const SAMPLE_PATH = 'project.json';

// saveProject tests
// Test name: saveProject calls PersistencePort.save with provided snapshot and path
// - verifies saveProject forwards parameters to the persistence port

test('saveProject calls PersistencePort.save with provided snapshot and path', async () => {
    // Arrange
    const save = mock.fn(async () => {});
    const port = { save, load: async () => EMPTY_SNAPSHOT };

    // Act
    await saveProject(port, EMPTY_SNAPSHOT, SAMPLE_PATH);

    // Assert
    assert.equal(save.mock.calls.length, 1);
    assert.deepEqual(save.mock.calls[0].arguments, [EMPTY_SNAPSHOT, SAMPLE_PATH]);
});

// loadProject tests
// Test name: loadProject returns snapshot from PersistencePort.load
// - ensures the function returns the snapshot fetched by the port

test('loadProject returns snapshot from PersistencePort.load', async () => {
    // Arrange
    const load = mock.fn(async () => EMPTY_SNAPSHOT);
    const port = { save: async () => {}, load };

    // Act
    const result = await loadProject(port, SAMPLE_PATH);

    // Assert
    assert.equal(load.mock.calls.length, 1);
    assert.deepEqual(load.mock.calls[0].arguments, [SAMPLE_PATH]);
    assert.deepEqual(result, EMPTY_SNAPSHOT);
});
