'use client';

import { visionTool } from '@sanity/vision';
import { defineConfig } from 'sanity';
import { structureTool, type StructureResolver } from 'sanity/structure';

import { apiVersion, dataset, projectId } from './sanity/env';
import { schemaTypes } from './sanity/schemas';

/** Singletons open straight into the editor; jobs and education stay as lists. */
const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .title('Site Settings')
        .id('siteSettings')
        .child(S.document().schemaType('siteSettings').documentId('siteSettings')),
      S.listItem()
        .title('About Me')
        .id('aboutSection')
        .child(S.document().schemaType('aboutSection').documentId('aboutSection')),
      S.listItem()
        .title('Currently Working On')
        .id('nowSection')
        .child(S.document().schemaType('nowSection').documentId('nowSection')),
      S.divider(),
      S.documentTypeListItem('job').title('Work Experience'),
      S.documentTypeListItem('education').title('Education'),
    ]);

export default defineConfig({
  basePath: '/studio',
  projectId,
  dataset,
  schema: { types: schemaTypes },
  plugins: [structureTool({ structure }), visionTool({ defaultApiVersion: apiVersion })],
});
