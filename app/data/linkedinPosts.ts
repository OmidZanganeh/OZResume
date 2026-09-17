export interface LinkedInPostRef {
  /** The numeric id from the post's URN, i.e. the {id} in urn:li:ugcPost:{id}. */
  urn: string;
  /** Iframe height LinkedIn's own "Embed this post" generator produced for this post. */
  height: number;
  /** Use LinkedIn's shorter "collapsed" embed variant instead of the full post. */
  collapsed?: boolean;
}

/**
 * Featured LinkedIn posts shown on the homepage.
 *
 * To add another one: open the post on LinkedIn → "…" menu → Embed this post,
 * copy the numeric id out of `urn:li:ugcPost:{id}` in the generated src, and
 * the `height` LinkedIn gave you for it. Nothing else needs to change.
 */
export const linkedinPosts: LinkedInPostRef[] = [
  { urn: '7486223612534771712', height: 901 },
];
