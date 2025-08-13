// 工数(時間) → 暦時間(ms) へ変換（1日 = settings.hoursPerDay 時間）
export const toWorkingMs = (effortHours, settings) => {
    const hpd = Math.max(1, settings?.hoursPerDay ?? 8); // ガード
    const calendarHours = effortHours * (24 / hpd); // 例: 8h/日 → ×3
    return calendarHours * 3600 * 1000; // → ms
};
// 既存のままでOK（必要ならローカル日付に合わせる実装へ拡張可）
export const toISODate = (d) => d.toISOString().slice(0, 10);
