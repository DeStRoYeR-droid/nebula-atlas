import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { PUZZLE_INTERVAL_MS } from '../config.js';
import { useInView, usePageVisible, usePrefersReducedMotion } from '../hooks/useBrowser.js';
import { SIZES } from '../lib/images.js';
import { DEFAULT_SIZE, createPuzzle, directionOffset, position, step, tiles } from '../lib/puzzle.js';
import { Icon } from './Icon.jsx';
import { NebulaImage } from './NebulaImage.jsx';
import { NebulaLink } from './NebulaLink.jsx';

const SLIDE = { duration: 0.45, ease: [0.22, 1, 0.36, 1] };
const EAGER_TILES = 8; // the first two rows are above the fold on most screens

/** Position (as % of a tile) of a cell, optionally one step off the board. */
function cellTarget(index, direction) {
  const { col, row } = position(index, DEFAULT_SIZE);
  const { dx, dy } = directionOffset(direction);
  return { x: `${(col + dx) * 100}%`, y: `${(row + dy) * 100}%` };
}

const tileVariants = {
  // `move` comes from <AnimatePresence custom>: swapped-out tiles slide off the edge.
  exit: (move) =>
    move?.type === 'swap'
      ? { ...cellTarget(move.index, move.direction), opacity: 0, transition: SLIDE }
      : { opacity: 0, transition: { duration: 0.2 } },
};

const PuzzleTile = memo(function PuzzleTile({ nebula, priority }) {
  return (
    <NebulaLink
      nebula={nebula}
      aria-label={nebula.name}
      className="glass flex size-full flex-col overflow-hidden rounded-lg p-1 transition-[border-color,box-shadow] duration-300 hover:border-accent/70 hover:shadow-[0_0_28px_-8px_var(--accent)] focus-visible:outline-offset-[-2px] sm:rounded-xl sm:p-1.5"
    >
      <NebulaImage
        nebula={nebula}
        sizes={SIZES.tile}
        priority={priority}
        className="min-h-0 flex-1 rounded-md sm:rounded-lg"
      />
      <span
        aria-hidden="true"
        className="block truncate px-0.5 pt-1 text-center text-[0.625rem] font-medium leading-tight text-fg sm:pt-1.5 sm:text-xs lg:text-sm"
      >
        <span className="sm:hidden">{nebula.shortName}</span>
        <span className="hidden sm:inline">{nebula.name}</span>
      </span>
    </NebulaLink>
  );
});

/**
 * View 1: a 4x4 sliding puzzle that moves on its own every 1.5 s.
 * Pauses on hover/focus, when off screen, in background tabs, while a dialog is
 * open, and by default for people who prefer reduced motion.
 */
export function PuzzleGrid({ nebulae, paused = false }) {
  const byId = useMemo(() => new Map(nebulae.map((n) => [n.id, n])), [nebulae]);
  const idsKey = nebulae.map((n) => n.id).join('|');
  const [puzzle, setPuzzle] = useState(() => createPuzzle(nebulae.map((n) => n.id)));
  const eager = useMemo(() => new Set(idsKey.split('|').slice(0, EAGER_TILES)), [idsKey]);

  // Start over if the set of nebulae changes.
  const [builtFor, setBuiltFor] = useState(idsKey);
  if (builtFor !== idsKey) {
    setBuiltFor(idsKey);
    setPuzzle(createPuzzle(idsKey.split('|')));
  }

  const prefersReducedMotion = usePrefersReducedMotion();
  const [userChoice, setUserChoice] = useState(null); // null: follow the default
  const stopped = userChoice === null ? prefersReducedMotion : userChoice === 'paused';
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const visible = usePageVisible();
  const board = useRef(null);
  const inView = useInView(board);

  const canMove = nebulae.length > 1;
  const running = canMove && !stopped && !paused && !hovered && !focused && visible && inView;

  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(() => setPuzzle((state) => step(state)), PUZZLE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [running]);

  const move = puzzle.lastMove;
  const statusText = !canMove
    ? null
    : stopped
      ? userChoice === null
        ? 'Auto-sliding is off because your device prefers reduced motion'
        : 'Auto-sliding paused'
      : `Auto-sliding • ${PUZZLE_INTERVAL_MS / 1000}s interval`;

  return (
    <div className="flex w-full flex-col items-center gap-3 sm:gap-4">
      <div
        ref={board}
        className="relative aspect-square w-full max-w-[34rem] sm:max-w-[40rem] lg:max-w-[max(32rem,min(52rem,calc(100dvh-15rem)))] xl:max-w-[max(36rem,min(60rem,calc(100dvh-15rem)))]"
        onPointerEnter={(event) => event.pointerType === 'mouse' && setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
        }}
      >
        {/* Empty cells behind the tiles, so the gap reads as a puzzle slot. */}
        <div aria-hidden="true" className="absolute inset-0 grid grid-cols-4 grid-rows-4">
          {Array.from({ length: DEFAULT_SIZE * DEFAULT_SIZE }, (_, index) => (
            <div key={index} className="p-1 sm:p-1.5">
              <div className="size-full rounded-lg border border-dashed border-line bg-fg/[0.02] sm:rounded-xl" />
            </div>
          ))}
        </div>

        <ul aria-label="Nebula puzzle" className="absolute inset-0 overflow-hidden">
          <AnimatePresence custom={move} initial={false}>
            {tiles(puzzle).map((tile) => {
              const nebula = byId.get(tile.id);
              if (!nebula) return null;
              const entering = move?.type === 'swap' && move.incoming === tile.id;
              return (
                <m.li
                  key={tile.id}
                  custom={move}
                  variants={tileVariants}
                  initial={entering ? { ...cellTarget(tile.index, move.direction), opacity: 0 } : false}
                  animate={{ ...cellTarget(tile.index), opacity: 1 }}
                  exit="exit"
                  transition={{ ...SLIDE, delay: entering ? 0.3 : 0 }}
                  className="absolute left-0 top-0 h-1/4 w-1/4 p-1 sm:p-1.5"
                >
                  <PuzzleTile nebula={nebula} priority={eager.has(tile.id)} />
                </m.li>
              );
            })}
          </AnimatePresence>
        </ul>
      </div>

      {statusText && (
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-subtle sm:text-sm">
          <span>{statusText}</span>
          <button
            type="button"
            onClick={() => setUserChoice(stopped ? 'playing' : 'paused')}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-medium text-muted transition-colors hover:bg-fg/10 hover:text-fg"
          >
            <Icon name={stopped ? 'play' : 'pause'} className="size-3" />
            {stopped ? 'Play' : 'Pause'} sliding
          </button>
        </div>
      )}
    </div>
  );
}
