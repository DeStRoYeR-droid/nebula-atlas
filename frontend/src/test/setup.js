import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { MotionGlobalConfig } from 'motion/react';
import { afterEach, vi } from 'vitest';

// Lazily loaded pages are transformed on first use, which can take a moment.
configure({ asyncUtilTimeout: 4000 });

// Animations finish instantly in tests.
MotionGlobalConfig.skipAnimations = true;

// Pure unit tests run in the "node" environment; only patch the DOM when there is one.
if (typeof window !== 'undefined') {
  // --- Browser APIs jsdom doesn't implement -------------------------------
  if (!window.matchMedia) {
    window.matchMedia = (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    });
  }

  class IntersectionObserverStub {
    constructor(callback) {
      this.callback = callback;
    }
    observe(element) {
      this.callback([{ isIntersecting: true, target: element }]);
    }
    unobserve() {}
    disconnect() {}
  }
  window.IntersectionObserver = window.IntersectionObserver ?? IntersectionObserverStub;
  window.scrollTo = vi.fn();

  afterEach(() => {
    cleanup();
    window.history.replaceState(null, '', '/');
    document.documentElement.style.overflow = '';
  });
}
