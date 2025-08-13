import { test, expect } from 'vitest';
import { autoLayout } from '../autoLayout';

test('autoLayout: 各ノードに座標が付与される', () => {
  const nodes = [
    { id: 'A', name: 'A', effortHours: 1 },
    { id: 'B', name: 'B', effortHours: 1 },
    { id: 'C', name: 'C', effortHours: 1 },
  ];
  const edges = [
    { id: 'e1', source: 'A', target: 'B' },
    { id: 'e2', source: 'B', target: 'C' },
  ];
  const positioned = autoLayout(nodes, edges);
  expect(positioned).toHaveLength(3);
  positioned.forEach((n) => {
    expect(n.position?.x).toBeTypeOf('number');
    expect(n.position?.y).toBeTypeOf('number');
  });
});

test('autoLayout: 依存関係で左→右の層分けが成立', () => {
  const nodes = [
    { id: 'A', name: 'A', effortHours: 1 },
    { id: 'B', name: 'B', effortHours: 1 },
    { id: 'C', name: 'C', effortHours: 1 },
  ];
  const edges = [
    { id: 'e1', source: 'A', target: 'B' },
    { id: 'e2', source: 'B', target: 'C' },
  ];
  const positioned = autoLayout(nodes, edges);
  const map = new Map(positioned.map((n) => [n.id, n.position!.x]));
  // レベルが進むほど x はより負の値（A <- B <- C の順に左へ）
  expect(map.get('A')! < map.get('B')!).toBe(true);
  expect(map.get('B')! < map.get('C')!).toBe(true);
});

