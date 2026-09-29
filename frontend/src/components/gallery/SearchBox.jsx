import { useEffect, useId, useRef, useState } from 'react';
import { useDebouncedValue } from '../../hooks/useBrowser.js';
import { Icon } from '../Icon.jsx';

export const SEARCH_DEBOUNCE_MS = 250;

/**
 * Search field with local state: typing only re-renders this component.
 * The (debounced) query is reported via `onSearch`, which updates the URL.
 */
export function SearchBox({ value, onSearch, inputRef, controls }) {
  const id = useId();
  const [text, setText] = useState(value);
  const debounced = useDebouncedValue(text, SEARCH_DEBOUNCE_MS);
  const lastSent = useRef(value);

  useEffect(() => {
    if (debounced === lastSent.current) return;
    lastSent.current = debounced;
    onSearch(debounced);
  }, [debounced, onSearch]);

  // Follow changes that didn't come from typing (Back button, "Clear filters").
  useEffect(() => {
    if (value === lastSent.current) return;
    lastSent.current = value;
    setText(value);
  }, [value]);

  function submitNow(next) {
    lastSent.current = next;
    onSearch(next);
  }

  return (
    <form
      role="search"
      className="w-full"
      onSubmit={(event) => {
        event.preventDefault();
        submitNow(text);
      }}
    >
      <label htmlFor={id} className="sr-only">
        Search nebulae
      </label>
      <div className="glass relative flex items-center rounded-xl focus-within:border-accent/70">
        <Icon name="search" className="pointer-events-none absolute left-3.5 size-4 text-subtle" />
        <input
          ref={inputRef}
          id={id}
          type="search"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && text) {
              event.preventDefault();
              setText('');
              submitNow('');
            }
          }}
          placeholder="Search by name, catalogue number or constellation"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          aria-controls={controls}
          className="w-full rounded-xl bg-transparent py-3 pl-10 pr-11 text-base text-fg placeholder:text-subtle focus-visible:outline-none sm:text-sm [&::-webkit-search-cancel-button]:appearance-none"
        />
        {text && (
          <button
            type="button"
            onClick={() => {
              setText('');
              submitNow('');
              inputRef?.current?.focus();
            }}
            className="absolute right-2 rounded-lg p-1.5 text-subtle hover:bg-fg/10 hover:text-fg"
            aria-label="Clear search"
          >
            <Icon name="close" className="size-4" />
          </button>
        )}
      </div>
    </form>
  );
}
