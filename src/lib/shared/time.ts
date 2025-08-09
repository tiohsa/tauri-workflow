import type { ProjectSettings } from '$lib/domain/entities';
export const toWorkingHours = (hours: number, settings: ProjectSettings) => hours; // 将来: カレンダー対応
export const toISODate = (d: Date) => d.toISOString().slice(0, 10);