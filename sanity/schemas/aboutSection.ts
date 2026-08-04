import { defineField, defineType } from 'sanity';

export const aboutSection = defineType({
  name: 'aboutSection',
  title: 'About Me',
  type: 'document',
  fields: [
    defineField({
      name: 'heading',
      title: 'Section heading',
      type: 'string',
      initialValue: 'About Me',
    }),
    defineField({
      name: 'body',
      title: 'Paragraphs',
      description:
        'Each paragraph is a block. Select text and use the B button to bold it. Add or delete paragraphs freely.',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [{ title: 'Normal', value: 'normal' }],
          lists: [],
          marks: {
            decorators: [
              { title: 'Bold', value: 'strong' },
              { title: 'Italic', value: 'em' },
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [{ name: 'href', type: 'url', title: 'URL' }],
              },
            ],
          },
        },
      ],
    }),
  ],
  preview: {
    prepare: () => ({ title: 'About Me' }),
  },
});
