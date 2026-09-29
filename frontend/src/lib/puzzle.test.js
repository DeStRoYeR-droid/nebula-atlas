// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createPuzzle, neighbours, outwardDirections, step, tiles } from './puzzle.js';

const ids = (n) => Array.from({ length: n }, (_, i) => `n${i}`);

function seeded(seed = 42) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

describe('puzzle', () => {
  it('fills 15 of 16 cells and keeps the rest in reserve', () => {
    const puzzle = createPuzzle(ids(18));
    expect(puzzle.grid.filter(Boolean)).toHaveLength(15);
    expect(puzzle.grid[15]).toBeNull();
    expect(puzzle.reserve).toEqual(['n15', 'n16', 'n17']);
  });

  it('knows neighbours and edges', () => {
    expect(neighbours(0).sort()).toEqual([1, 4]);
    expect(neighbours(5).sort((a, b) => a - b)).toEqual([1, 4, 6, 9]);
    expect(outwardDirections(0)).toEqual(['up', 'left']);
    expect(outwardDirections(5)).toEqual([]);
  });

  it('slides a neighbouring tile into the gap', () => {
    const next = step(createPuzzle(ids(15)), seeded());
    expect(next.lastMove.type).toBe('slide');
    expect([11, 14]).toContain(next.lastMove.from);
    expect(next.lastMove.to).toBe(15);
    expect(next.grid[next.lastMove.from]).toBeNull();
  });

  it('never loses or duplicates a nebula over many steps', () => {
    const random = seeded(7);
    let puzzle = createPuzzle(ids(20));
    for (let i = 0; i < 300; i += 1) {
      puzzle = step(puzzle, random);
      const shown = puzzle.grid.filter(Boolean);
      expect(shown).toHaveLength(15);
      expect(new Set([...shown, ...puzzle.reserve]).size).toBe(20);
    }
  });

  it('rotates waiting nebulae in through the edges', () => {
    const random = seeded(3);
    let puzzle = createPuzzle(ids(17));
    const swaps = [];
    for (let i = 0; i < 12; i += 1) {
      puzzle = step(puzzle, random);
      if (puzzle.lastMove.type === 'swap') swaps.push(puzzle.lastMove);
    }
    expect(swaps.length).toBeGreaterThan(0);
    for (const swap of swaps) expect(outwardDirections(swap.index)).toContain(swap.direction);
  });

  it('does not swap when every nebula is already on the board', () => {
    const random = seeded(9);
    let puzzle = createPuzzle(ids(10));
    for (let i = 0; i < 30; i += 1) {
      puzzle = step(puzzle, random);
      expect(puzzle.lastMove.type).toBe('slide');
    }
  });

  it('lists tiles in on-screen order for keyboard navigation', () => {
    const list = tiles(createPuzzle(ids(3)));
    expect(list.map((t) => [t.id, t.col, t.row])).toEqual([
      ['n0', 0, 0],
      ['n1', 1, 0],
      ['n2', 2, 0],
    ]);
  });
});
