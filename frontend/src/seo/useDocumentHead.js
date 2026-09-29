// Keeps <head> in sync with whatever is on screen. A stack lets the nebula
// dialog override the page's metadata and restore it when it closes.
import { useEffect, useRef } from 'react';
import { SITE_URL } from '../config.js';
import { headTags } from './meta.js';

const stack = [];

function applyTag({ tag, key, text, attrs }) {
  if (tag === 'title') {
    document.title = text;
    return;
  }
  const keyValue = attrs[key];
  const valueName = tag === 'link' ? 'href' : 'content';
  const value = attrs[valueName];
  let element = document.head.querySelector(`${tag}[${key}="${keyValue}"]`);
  if (value === null || value === undefined) {
    element?.remove();
    return;
  }
  if (!element) {
    element = document.createElement(tag);
    element.setAttribute(key, keyValue);
    document.head.append(element);
  }
  element.setAttribute(valueName, value);
}

function applyTop() {
  const top = stack.at(-1);
  if (top?.meta) headTags(top.meta, SITE_URL).forEach(applyTag);
}

/** Set the document head for as long as the calling component is mounted. */
export function useDocumentHead(meta) {
  const entry = useRef(null);
  const signature = JSON.stringify(meta);

  useEffect(() => {
    const item = { meta: null };
    entry.current = item;
    stack.push(item);
    return () => {
      const index = stack.indexOf(item);
      if (index !== -1) stack.splice(index, 1);
      applyTop();
    };
  }, []);

  useEffect(() => {
    entry.current.meta = JSON.parse(signature);
    if (stack.at(-1) === entry.current) applyTop();
  }, [signature]);
}
