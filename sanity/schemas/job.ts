import { defineField, defineType } from 'sanity';

export const job = defineType({
  name: 'job',
  title: 'Work Experience',
  type: 'document',
  fields: [
    defineField({
      name: 'company',
      title: 'Company',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Job title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'badge',
      title: 'Badge (optional)',
      description: 'Small highlight pill, e.g. "2026 Edison Award Winner"',
      type: 'string',
    }),
    defineField({
      name: 'dates',
      title: 'Dates',
      description: 'e.g. "Mar 2025 – Present"',
      type: 'string',
    }),
    defineField({
      name: 'location',
      title: 'Location',
      type: 'string',
    }),
    defineField({
      name: 'bullets',
      title: 'Bullet points',
      description: 'Select text and use B to bold it (for metrics like "days to minutes").',
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
    select: { title: 'title', company: 'company', dates: 'dates' },
    prepare: ({ title, company, dates }) => ({
      title: `${company} — ${title}`,
      subtitle: dates,
    }),
  },
});
