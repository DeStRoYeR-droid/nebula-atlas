// Small formatting helpers.

const numberFormat = new Intl.NumberFormat('en');

/** 5700 -> "~5,700 light-years" */
export function formatDistance(lightYears) {
  return `~${numberFormat.format(Math.round(lightYears))} light-years`;
}

/** 5700 -> "5,700 ly" (compact, for tight layouts) */
export function formatDistanceShort(lightYears) {
  return `${numberFormat.format(Math.round(lightYears))} ly`;
}

export function truncate(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max * 0.6)).replace(/[,.;:\s]+$/, '')}…`;
}
