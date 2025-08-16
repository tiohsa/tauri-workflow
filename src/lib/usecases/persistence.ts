import type { ProjectSnapshot } from '$lib/domain/entities';
import type { PersistencePort } from '$lib/usecases/ports/persistencePort';

/** Persist the current project snapshot via the given port. */
export async function saveProject(port: PersistencePort, snapshot: ProjectSnapshot): Promise<void> {
  await port.save(snapshot);
}

/** Load a previously saved project snapshot from the port. */
export async function loadProject(port: PersistencePort): Promise<ProjectSnapshot> {
  return port.load();
}

