export type LinkedInUrnType = 'ugcPost' | 'share';

export interface LinkedInPostRef {
  /** The numeric id from the post's URN, i.e. the {id} in urn:li:{type}:{id}. */
  urn: string;
  /** Which URN LinkedIn generated for this post — check the embed src it gave you. */
  type: LinkedInUrnType;
  /** Use LinkedIn's shorter "collapsed" embed variant instead of the full post. */
  collapsed?: boolean;
}

/**
 * Featured LinkedIn posts shown on the homepage.
 *
 * Every card renders at the same fixed height (see LINKEDIN_POST_HEIGHT in
 * LinkedInEmbed.tsx) with internal scroll for the rest — LinkedIn's post
 * content is much longer than its header, so a fixed height keeps the grid
 * uniform instead of every card being a different size.
 *
 * To add another post: open it on LinkedIn → "…" menu → Embed this post,
 * copy the src it generated — it looks like
 * `.../embed/feed/update/urn:li:ugcPost:{id}` or `.../urn:li:share:{id}` —
 * and take the `type` (ugcPost or share) and the numeric `id` from that.
 * The height LinkedIn suggests can be ignored; every card uses the same one.
 */
export const linkedinPosts: LinkedInPostRef[] = [
  { urn: '7486223612534771712', type: 'ugcPost' },
  { urn: '7482857782057140224', type: 'share' },
  { urn: '7478828618828382208', type: 'ugcPost' },
  { urn: '7478828343358930944', type: 'ugcPost' },
  { urn: '7478505728769544192', type: 'share' },
  { urn: '7407950530985197569', type: 'share' },
];
