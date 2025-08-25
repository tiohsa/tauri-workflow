import { writable } from 'svelte/store';

/** 画面全体の処理中状態を示すフラグ */
export const uiProcessing = writable<boolean>(false);

/** チャットパネルの開閉状態（デフォルト: 閉じる） */
export const chatOpen = writable<boolean>(false);

export function startProcessing() {
  uiProcessing.set(true);
}

export function stopProcessing() {
  uiProcessing.set(false);
}
