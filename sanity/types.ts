import type { PortableTextBlock } from '@portabletext/react';

export type NowIcon = 'cog' | 'cpu' | 'network';

export interface SiteSettings {
  availableBadge: string;
  tagline: string;
  phone: string;
  email: string;
  linkedinUrl: string;
  storyMapUrl: string;
  location: string;
  footerText: string;
}

export interface AboutSection {
  heading: string;
  body: PortableTextBlock[];
}

export interface NowCard {
  title: string;
  description: string;
  icon: NowIcon;
}

export interface NowSection {
  heading: string;
  cards: NowCard[];
}

export interface Job {
  _id: string;
  company: string;
  title: string;
  badge?: string;
  dates: string;
  location: string;
  bullets: PortableTextBlock[];
}

export interface Education {
  _id: string;
  degree: string;
  school: string;
  date: string;
  gpaBadge?: string;
  awardBadge?: string;
  coursework: PortableTextBlock[];
}

export interface SiteContent {
  settings: SiteSettings;
  about: AboutSection;
  now: NowSection;
  jobs: Job[];
  education: Education[];
}
