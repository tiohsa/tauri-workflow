import type { ProjectSnapshot } from '$lib/domain/entities';

export interface PersistencePort {
    save(snapshot: ProjectSnapshot, path?: string): Promise<void>;
    load(path?: string): Promise<ProjectSnapshot>;
}
