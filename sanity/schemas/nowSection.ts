import { defineArrayMember, defineField, defineType } from 'sanity';

export const nowSection = defineType({
  name: 'nowSection',
  title: 'Currently Working On',
  type: 'document',
  fields: [
    defineField({
      name: 'heading',
      title: 'Section heading',
      type: 'string',
      initialValue: 'Currently Working On',
    }),
    defineField({
      name: 'cards',
      title: 'Cards',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'card',
          fields: [
            defineField({ name: 'title', title: 'Title', type: 'string' }),
            defineField({ name: 'description', title: 'Description', type: 'text', rows: 3 }),
            defineField({
              name: 'icon',
              title: 'Icon',
              type: 'string',
              options: {
                list: [
                  { title: 'Cog (automation)', value: 'cog' },
                  { title: 'CPU (AI)', value: 'cpu' },
                  { title: 'Network (fiber)', value: 'network' },
                ],
                layout: 'radio',
              },
              initialValue: 'cog',
            }),
          ],
          preview: {
            select: { title: 'title', subtitle: 'description' },
          },
        }),
      ],
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Currently Working On' }),
  },
});
