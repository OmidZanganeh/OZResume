import ResumeClient from './ResumeClient';
import { getSiteContent } from '../sanity/lib/getContent';

export default async function Page() {
  const content = await getSiteContent();
  return <ResumeClient content={content} />;
}
