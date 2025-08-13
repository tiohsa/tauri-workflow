import type { PersistencePort } from '$lib/application/ports/persistencePort';
import type { ProjectSnapshot } from '$lib/domain/entities';
import { save, open } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';

export class TauriFsAdapter implements PersistencePort {
    async save(snapshot: ProjectSnapshot, path?: string) {
        const target = path || await save({ filters: [{ name: 'Project', extensions: ['json'] }] });
        if (!target) return;
        await writeTextFile(target, JSON.stringify(snapshot, null, 2));
    }
    async load(path?: string): Promise<ProjectSnapshot> {
        const target = path || await open({ filters: [{ name: 'Project', extensions: ['json'] }] });
        if (!target) throw new Error('ファイルが選択されていません');
        const text = await readTextFile(target as string);
        return JSON.parse(text) as ProjectSnapshot;
    }
}
