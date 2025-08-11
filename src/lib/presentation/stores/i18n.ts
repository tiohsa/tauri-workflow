import { writable, derived } from 'svelte/store';

export type Locale = 'ja' | 'en';
export const locale = writable<Locale>('ja');

export const dictionary: Record<Locale, Record<string, string>> = {
  ja: {
    align: '整列',
    schedule: '逆算',
    criticalChain: 'クリティカルチェーン',
    save: '保存',
    load: '読み込み',
    dueDate: '納期',
    projectBuffer: 'PB',
    use50: '50%',
    newTask: '新規タスク',
    finalProduct: '最終成果物',
    ccTitle: 'クリティカルチェーン',
    totalHours: '合計時間',
    taskName: '作業名',
    ok: 'OK',
    cancel: 'キャンセル'
  },
  en: {
    align: 'Align',
    schedule: 'Schedule',
    criticalChain: 'Critical Chain',
    save: 'Save',
    load: 'Load',
    dueDate: 'Due',
    projectBuffer: 'PB',
    use50: '50%',
    newTask: 'New Task',
    finalProduct: 'Final Product',
    ccTitle: 'Critical Chain',
    totalHours: 'Total Hours',
    taskName: 'Task name',
    ok: 'OK',
    cancel: 'Cancel'
  }
};

export const t = derived(locale, ($locale) => dictionary[$locale]);
