import { PuzzleGrid } from '../components/PuzzleGrid.jsx';
import { DataErrorState, EmptyAtlas } from '../components/states/DataStates.jsx';
import { LoadingAnnouncement, PuzzleSkeleton } from '../components/states/Skeletons.jsx';
import { useNebulae } from '../data/DataProvider.jsx';
import { pageMeta } from '../seo/meta.js';
import { useDocumentHead } from '../seo/useDocumentHead.js';

export default function HomePage({ paused = false }) {
  const { status, nebulae, error, retry } = useNebulae();
  useDocumentHead(pageMeta.home());

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col items-center px-4 pb-12 pt-7 sm:px-6 sm:pt-10 xl:max-w-[88rem]">
      <header className="mb-6 max-w-4xl text-center sm:mb-8 xl:max-w-5xl">
        <h1
          id="page-title"
          tabIndex={-1}
          className="text-2xl font-extrabold uppercase tracking-[0.05em] text-fg sm:text-3xl lg:text-4xl xl:text-5xl"
        >
          <span className="max-sm:sr-only">Nebula Atlas: </span>Explore the Cosmos
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
          A stunning 4×4 sliding puzzle of the universe’s most breathtaking emission, reflection and planetary nebulae.
          Pick a tile to explore it.
        </p>
        <span
          aria-hidden="true"
          className="mx-auto mt-4 block h-px w-24 bg-gradient-to-r from-transparent via-accent to-transparent sm:hidden"
        />
      </header>

      {status === 'loading' && (
        <div className="relative aspect-square w-full max-w-[34rem] sm:max-w-[40rem] lg:max-w-[max(32rem,min(52rem,calc(100dvh-15rem)))] xl:max-w-[max(36rem,min(60rem,calc(100dvh-15rem)))]">
          <LoadingAnnouncement />
          <PuzzleSkeleton />
        </div>
      )}
      {status === 'error' && <DataErrorState error={error} onRetry={retry} />}
      {status === 'ready' && nebulae.length === 0 && <EmptyAtlas />}
      {status === 'ready' && nebulae.length > 0 && <PuzzleGrid nebulae={nebulae} paused={paused} />}
    </div>
  );
}
