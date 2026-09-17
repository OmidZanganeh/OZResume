import { linkedinPosts } from '../data/linkedinPosts';
import LinkedInEmbed from './LinkedInEmbed';
import styles from './LinkedInPosts.module.css';

export default function LinkedInPosts() {
  if (linkedinPosts.length === 0) return null;

  return (
    <div className={styles.grid}>
      {linkedinPosts.map(post => (
        <LinkedInEmbed key={post.urn} {...post} />
      ))}
    </div>
  );
}
