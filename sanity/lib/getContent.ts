import { fallbackContent } from '../fallback';
import type { SiteContent } from '../types';
import { client } from './client';
import {
  aboutSectionQuery,
  educationQuery,
  jobsQuery,
  nowSectionQuery,
  siteSettingsQuery,
} from './queries';

/** Treats empty arrays and blank documents as "not filled in yet". */
function usable<T>(value: T | null | undefined): value is T {
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/**
 * Reads content from Sanity, falling back per-section to the built-in copy.
 *
 * Merging section by section means a half-migrated CMS still renders a complete
 * page: whatever has been filled in wins, everything else keeps its old text.
 */
export async function getSiteContent(): Promise<SiteContent> {
  if (!client) return fallbackContent;

  try {
    const [settings, about, now, jobs, education] = await Promise.all([
      client.fetch(siteSettingsQuery, {}, { next: { revalidate: 60 } }),
      client.fetch(aboutSectionQuery, {}, { next: { revalidate: 60 } }),
      client.fetch(nowSectionQuery, {}, { next: { revalidate: 60 } }),
      client.fetch(jobsQuery, {}, { next: { revalidate: 60 } }),
      client.fetch(educationQuery, {}, { next: { revalidate: 60 } }),
    ]);

    return {
      settings: usable(settings)
        ? { ...fallbackContent.settings, ...settings }
        : fallbackContent.settings,
      about: usable(about?.body)
        ? { heading: about.heading || fallbackContent.about.heading, body: about.body }
        : fallbackContent.about,
      now: usable(now?.cards)
        ? { heading: now.heading || fallbackContent.now.heading, cards: now.cards }
        : fallbackContent.now,
      jobs: usable(jobs) ? jobs : fallbackContent.jobs,
      education: usable(education) ? education : fallbackContent.education,
    };
  } catch (error) {
    console.error('[sanity] content fetch failed, using fallback:', error);
    return fallbackContent;
  }
}
