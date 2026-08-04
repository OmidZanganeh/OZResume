'use client';

import { PortableText, type PortableTextBlock, type PortableTextComponents } from '@portabletext/react';

const marks: PortableTextComponents['marks'] = {
  link: ({ children, value }) => (
    <a href={value?.href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
};

/** Renders each block as a paragraph — used for the About section. */
export function RichTextParagraphs({ value }: { value: PortableTextBlock[] }) {
  return <PortableText value={value} components={{ marks }} />;
}

/** Renders each block as a list item — used for job bullets and coursework. */
export function RichTextBullets({
  value,
  className,
}: {
  value: PortableTextBlock[];
  className?: string;
}) {
  return (
    <ul className={className}>
      <PortableText
        value={value}
        components={{ marks, block: { normal: ({ children }) => <li>{children}</li> } }}
      />
    </ul>
  );
}
