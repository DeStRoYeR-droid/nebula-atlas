// The auto-sliding 4x4 puzzle, as pure state transitions.
//
// The board has size*size cells and shows at most size*size - 1 nebulae, so
// there is always at least one gap. Each step does one of two things:
//   - slide: a tile next to a gap slides into it (never straight back);
//   - swap:  when more nebulae exist than fit on the board, a tile on the edge
//            slides out of the board and the next waiting nebula slides in.

export const DEFAULT_SIZE = 4;
export const SWAP_EVERY = 3; // every 3rd step rotates a new nebula in, if any are waiting

const DIRECTIONS = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

export const position = (index, size = DEFAULT_SIZE) => ({ col: index % size, row: Math.floor(index / size) });

export function neighbours(index, size = DEFAULT_SIZE) {
  const { col, row } = position(index, size);
  const result = [];
  if (row > 0) result.push(index - size);
  if (row < size - 1) result.push(index + size);
  if (col > 0) result.push(index - 1);
  if (col < size - 1) result.push(index + 1);
  return result;
}

/** Directions that lead off the board from a cell (empty for inner cells). */
export function outwardDirections(index, size = DEFAULT_SIZE) {
  const { col, row } = position(index, size);
  const result = [];
  if (row === 0) result.push('up');
  if (row === size - 1) result.push('down');
  if (col === 0) result.push('left');
  if (col === size - 1) result.push('right');
  return result;
}

export function directionOffset(direction) {
  return DIRECTIONS[direction] ?? { dx: 0, dy: 0 };
}

export function createPuzzle(ids, size = DEFAULT_SIZE) {
  const cells = size * size;
  const shown = ids.slice(0, cells - 1);
  const grid = Array.from({ length: cells }, (_, index) => shown[index] ?? null);
  return { size, grid, reserve: ids.slice(cells - 1), tick: 0, lastMove: null };
}

const pick = (items, random) => items[Math.min(items.length - 1, Math.floor(random() * items.length))];

function slide(state, random) {
  const { grid, size, lastMove } = state;
  const moves = [];
  grid.forEach((id, to) => {
    if (id !== null) return;
    for (const from of neighbours(to, size)) {
      if (grid[from] !== null) moves.push({ from, to, id: grid[from] });
    }
  });
  if (moves.length === 0) return null;
  // Avoid undoing the previous slide unless it's the only option.
  const fresh = moves.filter((move) => !(lastMove?.type === 'slide' && move.id === lastMove.id));
  const move = pick(fresh.length ? fresh : moves, random);
  const next = [...grid];
  next[move.to] = move.id;
  next[move.from] = null;
  return { grid: next, move: { type: 'slide', ...move } };
}

function swap(state, random) {
  const { grid, size, reserve, lastMove } = state;
  if (reserve.length === 0) return null;
  const candidates = grid
    .map((id, index) => ({ id, index }))
    .filter(({ id, index }) => id !== null && outwardDirections(index, size).length > 0 && id !== lastMove?.id);
  if (candidates.length === 0) return null;
  const { id: outgoing, index } = pick(candidates, random);
  const direction = pick(outwardDirections(index, size), random);
  const [incoming, ...rest] = reserve;
  const next = [...grid];
  next[index] = incoming;
  return {
    grid: next,
    reserve: [...rest, outgoing],
    move: { type: 'swap', index, direction, outgoing, incoming, id: incoming },
  };
}

export function step(state, random = Math.random) {
  const tick = state.tick + 1;
  const wantsSwap = state.reserve.length > 0 && tick % SWAP_EVERY === 0;
  const result = (wantsSwap && swap(state, random)) || slide(state, random) || swap(state, random);
  if (!result) return { ...state, tick };
  return {
    ...state,
    tick,
    grid: result.grid,
    reserve: result.reserve ?? state.reserve,
    lastMove: result.move,
  };
}

/** Tiles in cell order (so keyboard/tab order follows what's on screen). */
export function tiles(state) {
  return state.grid.flatMap((id, index) => (id === null ? [] : [{ id, index, ...position(index, state.size) }]));
}
