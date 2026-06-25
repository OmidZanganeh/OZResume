/** UI timeline: how far back users can scrub. */
export const HISTORY_YEARS = 10;

/** Download extra years so 52-week momentum works near the oldest dates. */
export const WEEKLY_DOWNLOAD_YEARS = HISTORY_YEARS + 2;

export const HISTORY_DAYS = HISTORY_YEARS * 365;

/** ~12 years of weekly bars, newest first. */
export const WEEKS_TO_STORE = Math.ceil(WEEKLY_DOWNLOAD_YEARS * 52.18) + 4;
