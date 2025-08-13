import { test, expect } from 'vitest';
import { scheduleBackward } from '../scheduleBackward';

test('scheduleBackward: 直線依存の逆算スケジュール', () => {
  const settings = {
    name: 'Demo',
    dueDate: '2025-01-10',
    projectBufferDays: 0,
    useFiftyPctEstimate: false,
    shrinkRatio: 0.6,
    hoursPerDay: 8,
  };
  const nodes = [
    { id: 'A', name: 'A', effortHours: 8 },
    { id: 'B', name: 'B', effortHours: 8 },
    { id: 'T', name: 'Terminal', effortHours: 0 },
  ];
  const edges = [
    { id: 'e1', source: 'A', target: 'B' },
    { id: 'e2', source: 'B', target: 'T' },
  ];
  const { nodes: out } = scheduleBackward(nodes, edges, settings, 'T');
  const byId = Object.fromEntries(out.map((n) => [n.id, n]));
  expect(byId['B'].start).toBe('2025-01-08');
  expect(byId['B'].end).toBe('2025-01-09');
  expect(byId['A'].start).toBe('2025-01-06');
  expect(byId['A'].end).toBe('2025-01-07');
  expect(byId['T'].start).toBe('2025-01-06');
  expect(byId['T'].end).toBe('2025-01-10');
});

