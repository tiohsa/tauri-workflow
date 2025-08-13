import type { PersistencePort } from '$lib/usecases/ports/persistencePort';
import type { ProjectSnapshot } from '$lib/domain/entities';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';

const JSON_FILTER = { name: 'Project', extensions: ['json'] };

export class TauriFsAdapter implements PersistencePort {
  async save(snapshot: ProjectSnapshot, filePath?: string) {
    const path = filePath ?? (await save({ filters: [JSON_FILTER] }));
    if (!path) return;
    await writeTextFile(path, JSON.stringify(snapshot, null, 2));
  }

  async load(filePath?: string): Promise<ProjectSnapshot> {
    const path = filePath ?? (await open({ filters: [JSON_FILTER] }));
    if (typeof path !== 'string') {
      throw new Error('ファイルが選択されていません');
    }
    const content = await readTextFile(path);
    return JSON.parse(content) as ProjectSnapshot;
  }
}
