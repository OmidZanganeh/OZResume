export type LinkedInUrnType = 'ugcPost' | 'share';

export interface LinkedInPostRef {
  /** The numeric id from the post's URN, i.e. the {id} in urn:li:{type}:{id}. */
  urn: string;
  /** Which URN LinkedIn generated for this post — check the embed src it gave you. */
  type: LinkedInUrnType;
  /** Iframe height LinkedIn's own "Embed this post" generator produced for this post. */
  height: number;
  /** Use LinkedIn's shorter "collapsed" embed variant instead of the full post. */
  collapsed?: boolean;
}

/**
 * Featured LinkedIn posts shown on the homepage.
 *
 * To add another one: open the post on LinkedIn → "…" menu → Embed this post,
 * copy the src LinkedIn generated — it looks like
 * `.../embed/feed/update/urn:li:ugcPost:{id}` or `.../urn:li:share:{id}` —
 * and take the `type` (ugcPost or share), the numeric `id`, and the `height`
 * from that same code. Nothing else needs to change.
 */
export const linkedinPosts: LinkedInPostRef[] = [
  { urn: '7486223612534771712', type: 'ugcPost', height: 901 },
  { urn: '7482857782057140224', type: 'share', height: 915 },
  { urn: '7478828618828382208', type: 'ugcPost', height: 1468 },
  { urn: '7478828343358930944', type: 'ugcPost', height: 1468 },
  { urn: '7478505728769544192', type: 'share', height: 1137 },
  { urn: '7407950530985197569', type: 'share', height: 649 },
];
