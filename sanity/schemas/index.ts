import type { SchemaTypeDefinition } from 'sanity';

import { aboutSection } from './aboutSection';
import { education } from './education';
import { job } from './job';
import { nowSection } from './nowSection';
import { siteSettings } from './siteSettings';

export const schemaTypes: SchemaTypeDefinition[] = [
  siteSettings,
  aboutSection,
  nowSection,
  job,
  education,
];
