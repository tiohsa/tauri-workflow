import type { ProjectSnapshot } from '$lib/domain/entities';
import type { PersistencePort } from '$lib/application/ports/persistencePort';

export async function saveProject(port: PersistencePort, snapshot: ProjectSnapshot, path?: string) {
    await port.save(snapshot, path);
}

export function loadProject(port: PersistencePort, path?: string) {
    return port.load(path);
}
