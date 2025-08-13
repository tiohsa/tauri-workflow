import type { ProjectSnapshot } from '$lib/domain/entities';
import type { PersistencePort } from '$lib/usecases/ports/persistencePort';

export async function saveProject(port: PersistencePort, snapshot: ProjectSnapshot): Promise<void> {
  await port.save(snapshot);
}

export async function loadProject(port: PersistencePort): Promise<ProjectSnapshot> {
  return port.load();
}

