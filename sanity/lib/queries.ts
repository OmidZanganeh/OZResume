import { groq } from 'next-sanity';

export const siteSettingsQuery = groq`*[_type == "siteSettings"][0]{
  availableBadge, tagline, phone, email, linkedinUrl, storyMapUrl, location, footerText
}`;

export const aboutSectionQuery = groq`*[_type == "aboutSection"][0]{ heading, body }`;

export const nowSectionQuery = groq`*[_type == "nowSection"][0]{
  heading,
  cards[]{ title, description, icon }
}`;

export const jobsQuery = groq`*[_type == "job"] | order(order asc){
  _id, company, title, badge, dates, location, bullets
}`;

export const educationQuery = groq`*[_type == "education"] | order(order asc){
  _id, degree, school, date, gpaBadge, awardBadge, coursework
}`;
