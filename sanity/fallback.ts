import { ptList } from './portableText';
import type { SiteContent } from './types';

/**
 * What the site renders before Sanity is connected, and whenever a fetch fails.
 * Keeping a full copy here means the CMS can go down without taking the page with it.
 */
export const fallbackContent: SiteContent = {
  settings: {
    availableBadge: 'Open to Opportunities',
    tagline: 'Senior GIS Developer and Analyst',
    phone: '+1 (531) 229-6873',
    email: 'ozanganeh@unomaha.edu',
    linkedinUrl: 'https://www.linkedin.com/in/omidzanganeh/',
    storyMapUrl: 'https://arcg.is/1n1C4r',
    location: 'Lincoln, Nebraska',
    footerText: 'Senior GIS Developer and Analyst · Lincoln, Nebraska',
  },

  about: {
    heading: 'About Me',
    body: ptList([
      "I'm a **Senior GIS Developer and Analyst** at Olsson with a track record of turning manual spatial workflows into reliable production tools. I specialize in ArcGIS Pro SDK (.NET/C#/WPF), Python geoprocessing, SQL Server pipelines, and applied AI for engineering teams — with proven results like **~90% fewer manual GIS steps**, multi-day workflows reduced to minutes, and AI-assisted contract sourcing in hours instead of months.",
      'At Olsson I work directly with **many telecom and infrastructure clients**, delivering GIS tools, network design support, and spatial analysis. I build end-to-end automation across the fiber and wireless lifecycle — from engineering drafting and network layout to build-area planning, RF analysis, and multi-source spatial data acquisition — including density-based expansion tools **used across multiple clients**.',
      'Several of my ArcGIS Pro add-ins and utilities are adopted beyond one-off projects and used **firm-wide** across teams. I also learned **iBwave** to deliver DAS (distributed antenna system) designs, expanding from GIS automation into wireless engineering deliverables.',
      'A major thread of my work is applied AI for real bottlenecks — intelligent contract search and classification (**months to hours**), and computer-vision inventory of utility infrastructure from aerial and street-level imagery. I was a **2025 Edison Award Nominee** and **2026 Edison Award Winner** at Olsson for these contributions.',
      "I hold a Master's in Geography (GIS&T) from the University of Nebraska at Omaha (**4.0 GPA**, December 2025). My thesis on spatiotemporal NOx emissions from U.S. cement plants using TROPOMI data earned the **GRACA Project Award**. I taught Human-Environment Geography labs to **150+ students** as instructor of record and contributed GIS work to the **Omaha Spatial Justice Project**.",
      "I'm passionate about bridging geospatial science, software engineering, and applied AI to solve complex spatial problems with practical impact — and always open to connecting with others who share that focus.",
    ]),
  },

  now: {
    heading: 'Currently Working On',
    cards: [
      {
        title: 'Workflow Automation',
        description:
          'Building Python and C# tools that eliminate repetitive GIS tasks — turning multi-day manual processes into fully automated pipelines.',
        icon: 'cog',
      },
      {
        title: 'AI-Powered Spatial Solutions',
        description:
          'Developing AI agents using Azure AI Foundry and Google AI Studio for intelligent data classification, RFP sourcing, and web grounding at scale.',
        icon: 'cpu',
      },
      {
        title: 'Fiber Network Design Tools',
        description:
          'Building ArcGIS Pro tools for FTTH layout, density-based build-area planning used across multiple clients, RF analysis, and fiber expansion workflows.',
        icon: 'network',
      },
    ],
  },

  jobs: [
    {
      _id: 'fallback-olsson',
      company: 'Olsson',
      title: 'GIS Developer and Analyst',
      badge: '2025 Nominee & 2026 Edison Award Winner',
      dates: 'Mar 2025 – Present',
      location: 'Lincoln, Nebraska',
      bullets: ptList([
        'Worked directly with **many telecom and infrastructure clients**, delivering GIS tools, network design support, and spatial analysis that improved speed and consistency of delivery.',
        'Built production Python and C# GIS apps, including automated bore profile generation that cut processing from **days to minutes**.',
        'Created an ArcGIS Automation Suite of Python geoprocessing toolboxes — pocketing, conduit drawing, centerlines, cable consolidation, cost/routing — reducing manual GIS steps by **~90%**.',
        'Shipped ArcGIS Pro add-ins (.NET/C#/WPF) adopted across projects and teams: GIS Data Downloader used **firm-wide**, FTTH Network Designer, Fiber Automatic Expansion (density grouping used across **multiple clients**), RF Analysis panel, and a Street View tool for in-map **pole and asset verification**.',
        'Learned **iBwave** to deliver DAS (distributed antenna system) designs, expanding into wireless engineering deliverables alongside GIS automation.',
        'Built AI tools with Azure OpenAI and Google AI Studio — including contract sourcing (**months to hours**) and a **parcel-owner classifier** that flags development/investment firms for fiber expansion analysis; plus YOLO apps for remote utility inventory.',
        'Created GeoPipe: a GUI ETL app for large spatial/tabular imports into SQL Server with schema auto-detection, spatial types, and connection-loss recovery.',
      ]),
    },
    {
      _id: 'fallback-uno-teaching',
      company: 'University of Nebraska at Omaha',
      title: 'Graduate Teaching Assistant – Instructor of Record',
      dates: 'Jan 2024 – Aug 2025',
      location: 'Omaha, Nebraska',
      bullets: ptList([
        'Taught lab sections of Human-Environment Geography to over **150 students** across three semesters as sole instructor of record.',
      ]),
    },
    {
      _id: 'fallback-uno-gis',
      company: 'University of Nebraska at Omaha',
      title: 'GIS Technician – Omaha Spatial Justice Project',
      dates: 'Jun 2024 – Aug 2025',
      location: 'Omaha, Nebraska',
      bullets: ptList([
        'Digitized historical land parcels from archival documents and aerial photography; reviewed legal records to build an accurate geodatabase of racially restrictive covenants in Douglas County, supporting urban spatial justice research.',
      ]),
    },
  ],

  education: [
    {
      _id: 'fallback-ms',
      degree: 'Master of Science: Geography – Geographic Information Science and Technology',
      school: 'University of Nebraska at Omaha, Nebraska',
      date: 'December 2025',
      gpaBadge: 'GPA 4.00',
      awardBadge: 'GRACA Award',
      coursework: ptList([
        '**Geographic Information Systems I:** ArcGIS Desktop & Pro, Spatial Analysis, Georeferencing, Map Projections, Selections & Queries, Data Editing, Buffering, Overlay & Raster Analysis, Spatial Joins, Summarize, Statistics, Symbology & Labels, Layout Design, Digitizing & Snapping.',
        '**Geographic Information Systems II:** ArcGIS Pro & Enterprise, SQL, GIS Web Services, Web System Architecture, AWS Cloud, Spatial Data Management, GeoEvent, Web Mapping (ArcGIS Online).',
        '**Thesis:** Spatiotemporal Analysis of NOx Emissions from U.S. Cement Plants Using TROPOMI Data – Remote Sensing, Temporal & Hotspot Analysis, Environmental Visualization, Population Exposure & Environmental Justice Analysis.',
      ]),
    },
    {
      _id: 'fallback-bs',
      degree: 'Bachelor of Science: Geomatics (Surveying) Engineering',
      school: 'Geomatics College of National Cartographic Center (GCNCC), Tehran',
      date: 'August 2016',
      coursework: ptList([
        'GIS, Applications of GIS, Numerical Mapping and AutoCAD, Fundamentals of Urbanization and Urban Planning, Fundamentals of Remote Sensing, Image Digital Processing, Advanced Software Packages and Applications.',
      ]),
    },
  ],
};
