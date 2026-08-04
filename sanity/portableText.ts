import type { PortableTextBlock } from '@portabletext/react';

/**
 * Builds a Portable Text block from a plain string, turning `**text**` into bold spans.
 * Lets the fallback content stay readable while matching the shape Sanity returns,
 * so both sources render through one code path.
 *
 * Keys are derived from position rather than randomly generated, otherwise the
 * server and client markup would disagree and React would flag a hydration mismatch.
 */
export function pt(text: string, blockIndex = 0): PortableTextBlock {
  const children = text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part, i) => {
      const bold = part.startsWith('**') && part.endsWith('**');
      return {
        _type: 'span' as const,
        _key: `s${blockIndex}-${i}`,
        text: bold ? part.slice(2, -2) : part,
        marks: bold ? ['strong'] : [],
      };
    });

  return {
    _type: 'block',
    _key: `b${blockIndex}`,
    style: 'normal',
    markDefs: [],
    children,
  } as PortableTextBlock;
}

/** Same as `pt`, for a list of strings that each become their own block. */
export function ptList(texts: string[]): PortableTextBlock[] {
  return texts.map((t, i) => pt(t, i));
}
