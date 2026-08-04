import { NextStudio } from 'next-sanity/studio';

import config from '../../../sanity.config';
import { isSanityConfigured } from '../../../sanity/env';
import SetupNotice from './SetupNotice';

export const dynamic = 'force-static';

export { metadata, viewport } from 'next-sanity/studio';

export default function StudioPage() {
  if (!isSanityConfigured) return <SetupNotice />;
  return <NextStudio config={config} />;
}
