export const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2026-01-01';

export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';

export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '';

/**
 * The site renders from `sanity/fallback.ts` until a project ID is configured,
 * so a missing env var is a valid state rather than a build error.
 */
export const isSanityConfigured = Boolean(projectId);
