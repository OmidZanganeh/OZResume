/** One typed segment; optional emphasis. Use \n for line breaks inside dialogue. */
export type DialogueSeg = { s: string; strong?: boolean };

export type TourLink = { href: string; label: string; external?: boolean; download?: boolean };

export type TourStep = {
  tab: string;
  title: string;
  dialogue: DialogueSeg[];
  links?: TourLink[];
};

export const RECRUITER_TOUR_STEPS: TourStep[] = [
  {
    tab: 'Start',
    title: 'Welcome, recruiter!',
    dialogue: [
      { s: "I'm " },
      { s: 'Geo-Bot', strong: true },
      {
        s: " — your live guide in this 3D briefing room.\n\n",
      },
      { s: 'Click a neon board', strong: true },
      { s: ' on the deck or a tab above — I walk over, read what is posted, then ' },
      { s: 'narrate it', strong: true },
      {
        s: ' for you. Omid built this so you get the pitch in under a minute without scrolling a wall of text first.',
      },
      { s: '\n\n' },
      { s: 'When my line finishes, tap ' },
      { s: 'Next', strong: true },
      { s: ' to send me to the next station. Ready?' },
    ],
  },
  {
    tab: 'Who',
    title: 'Who is Omid?',
    dialogue: [
      { s: "He's a " },
      { s: 'GIS Developer', strong: true },
      { s: ' at Olsson — telecom engineering & design — based in ' },
      { s: 'Lincoln, Nebraska', strong: true },
      { s: '.' },
      { s: '\n\n' },
      {
        s: 'MS Geography / GIS&T from UNO with a 4.0. Former grad instructor (150+ students), GIS tech on the Omaha Spatial Justice Project, and earlier photogrammetry work overseas.',
      },
    ],
  },
  {
    tab: 'Impact',
    title: 'What he ships',
    dialogue: [
      {
        s: 'Python, SQL, ArcGIS Pro, and serious automation: bore profiles, fiber workflows, AI-assisted RFP pipelines on Azure and Google — toolboxes that replace days of manual work.',
      },
      { s: '\n\n' },
      { s: 'He cares about ' },
      { s: 'clarity', strong: true },
      { s: ', ' },
      { s: 'speed', strong: true },
      { s: ', and ' },
      { s: 'mentoring', strong: true },
      { s: ' — not just pretty maps.' },
    ],
  },
  {
    tab: 'Explore',
    title: 'Dig deeper',
    dialogue: [
      {
        s: "This isn't a PDF-only résumé. There's a Projects page, a full Tools hub — GIS downloader, converters, demos — and yes, a games lobby if you need a break.",
      },
      { s: '\n\n' },
      { s: 'Grab the PDF from the header anytime. When you are done here, I will point you to contact options.' },
    ],
    links: [
      { href: '/projects', label: 'Projects' },
      { href: '/tools', label: 'Tools hub' },
      { href: '/Omid-Zanganeh-Resume.pdf', label: 'Résumé PDF', download: true },
    ],
  },
  {
    tab: 'Hello',
    title: 'Say hello',
    dialogue: [
      { s: 'If the role fits, Omid would love a conversation. ' },
      { s: 'LinkedIn', strong: true },
      { s: ', ' },
      { s: 'email', strong: true },
      { s: ', or the ' },
      { s: 'contact form', strong: true },
      { s: ' at the bottom of this page — all fair game.' },
      { s: '\n\n' },
      {
        s: 'On request, he can provide ',
      },
      { s: 'recommendation letters', strong: true },
      {
        s: ' from supervisors and managers who have worked with him directly — so your decision can be grounded in more than a résumé scan.',
      },
      { s: '\n\n' },
      { s: 'Count on someone who ' },
      { s: 'gets the job done', strong: true },
      {
        s: ': dependable execution, clear communication, and deliverables that hold up when it matters. Stakeholders who have backed him have been ',
      },
      { s: 'proud of that decision', strong: true },
      {
        s: ' — and he works so they never need to regret it. That bar is what he holds himself to on every assignment.',
      },
      { s: '\n\n' },
      { s: 'Thanks for giving a GIS hire a real read. ' },
      { s: '🗺️', strong: true },
    ],
    links: [
      { href: 'https://www.linkedin.com/in/omidzanganeh/', label: 'LinkedIn', external: true },
      { href: 'mailto:ozanganeh@unomaha.edu', label: 'Email', external: true },
    ],
  },
];
