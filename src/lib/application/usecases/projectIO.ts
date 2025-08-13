import type { ProjectSnapshot } from '$lib/domain/entities';
import type { PersistencePort } from '$lib/application/ports/persistencePort';

export async function saveProject(
    port: PersistencePort,
    snapshot: ProjectSnapshot,
    path?: string,
): Promise<void> {
    await port.save(snapshot, path);
}

export async function loadProject(
    port: PersistencePort,
    path?: string,
): Promise<ProjectSnapshot> {
    return port.load(path);
}
