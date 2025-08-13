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
    newTask: '',
    newProject: '新規作成',
    finalProduct: '最終成果物',
    finalProductDescription: '成果物説明',
    ccTitle: 'クリティカルチェーン',
    totalHours: '合計時間',
    taskName: '作業名',
    ok: 'OK',
    cancel: 'キャンセル',
    addNode: 'ノードを追加',
    deleteNode: 'ノードを削除',
    deleteConnector: 'コネクタを削除',
    decomposeTask: 'タスクを分解',
    generateFinalTask: '最終成果物タスクを生成',
    processing: '処理中...',
    sendPrompt: '送信',
    accept: '受け入れる',
    regenerate: '再生成',
    promptPlaceholder: 'プロンプトを入力...'
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
    newTask: '',
    newProject: 'New',
    finalProduct: 'Final Product',
    finalProductDescription: 'Deliverable description',
    ccTitle: 'Critical Chain',
    totalHours: 'Total Hours',
    taskName: 'Task name',
    ok: 'OK',
    cancel: 'Cancel',
    addNode: 'Add Node',
    deleteNode: 'Delete Node',
    deleteConnector: 'Delete Connector',
    decomposeTask: 'Decompose Task',
    generateFinalTask: 'Generate Final Task',
    processing: 'Processing...',
    sendPrompt: 'Send',
    accept: 'Accept',
    regenerate: 'Regenerate',
    promptPlaceholder: 'Enter prompt...'
  }
};

export const t = derived(locale, ($locale) => dictionary[$locale]);
