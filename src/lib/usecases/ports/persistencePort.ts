import type { ProjectSnapshot } from '$lib/domain/entities';

export interface PersistencePort {
  save(snapshot: ProjectSnapshot, filePath?: string): Promise<void>;
  load(filePath?: string): Promise<ProjectSnapshot>;
}
