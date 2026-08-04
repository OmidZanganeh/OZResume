import { defineField, defineType } from 'sanity';

export const education = defineType({
  name: 'education',
  title: 'Education',
  type: 'document',
  fields: [
    defineField({
      name: 'degree',
      title: 'Degree',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'school',
      title: 'School',
      type: 'string',
    }),
    defineField({
      name: 'date',
      title: 'Graduation date',
      description: 'e.g. "August 2025"',
      type: 'string',
    }),
    defineField({
      name: 'gpaBadge',
      title: 'GPA badge (optional)',
      description: 'e.g. "GPA 4.00"',
      type: 'string',
    }),
    defineField({
      name: 'awardBadge',
      title: 'Award badge (optional)',
      description: 'e.g. "GRACA Award"',
      type: 'string',
    }),
    defineField({
      name: 'coursework',
      title: 'Coursework / details',
      description: 'Each entry becomes a bullet. Bold the lead-in label with B.',
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
            annotations: [],
          },
        },
      ],
    }),
    defineField({
      name: 'order',
      title: 'Display order',
      description: 'Lower numbers appear first.',
      type: 'number',
      initialValue: 0,
    }),
  ],
  orderings: [
    {
      title: 'Display order',
      name: 'orderAsc',
      by: [{ field: 'order', direction: 'asc' }],
    },
  ],
  preview: {
    select: { title: 'degree', subtitle: 'school' },
  },
});
