import { defineField, defineType } from 'sanity';

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  fields: [
    defineField({
      name: 'availableBadge',
      title: 'Availability badge',
      description: 'Small pill at the very top, e.g. "Open to Opportunities"',
      type: 'string',
    }),
    defineField({
      name: 'tagline',
      title: 'Tagline',
      description: 'The line under your name, e.g. "Senior GIS Developer and Analyst"',
      type: 'string',
    }),
    defineField({
      name: 'phone',
      title: 'Phone',
      type: 'string',
    }),
    defineField({
      name: 'email',
      title: 'Email',
      type: 'string',
    }),
    defineField({
      name: 'linkedinUrl',
      title: 'LinkedIn URL',
      type: 'url',
    }),
    defineField({
      name: 'storyMapUrl',
      title: 'StoryMap URL',
      type: 'url',
    }),
    defineField({
      name: 'location',
      title: 'Location',
      type: 'string',
    }),
    defineField({
      name: 'footerText',
      title: 'Footer line',
      description: 'e.g. "Senior GIS Developer and Analyst · Lincoln, Nebraska"',
      type: 'string',
    }),
  ],
  preview: {
    select: { title: 'tagline' },
    prepare: ({ title }) => ({ title: 'Site Settings', subtitle: title }),
  },
});
