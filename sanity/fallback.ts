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
      "I'm a GIS Developer at Olsson specializing in telecom engineering, fiber network design, and enterprise workflow automation. I turn manual, time-intensive spatial work into production-grade pipelines — Python and C# desktop apps, ArcGIS Pro add-ins, Python geoprocessing toolboxes, and SQL Server integrations — that deliver measurable savings in design time, build cost, and market analysis.",
      'At Olsson, I build end-to-end tools across the fiber lifecycle: automated bore profile generation (**days to minutes**), a suite of ArcGIS automation tools for pocketing, conduit drawing, centerlines, and cable consolidation (~**90% reduction** in manual GIS steps), FTTH network design add-ins, and RF planning panels for wireless coverage, interference, and tower optimization. I also ship custom ArcGIS Pro add-ins that pull multi-source GIS data (OSM, USGS, FEMA, Census, BSL) directly into project geodatabases.',
      "A major thread of my work is applied AI for real engineering bottlenecks. Using Microsoft Azure AI Foundry, Azure OpenAI, and Google AI Studio, I built RFP Radar for intelligent contract sourcing and classification (**months to hours**), batch SQL-integrated classifiers for property and tabular enrichment, and YOLO-based object detection for remote utility infrastructure inventory via aerial and street-level imagery. I won Olsson's **2026 Edison Award** for these automation contributions.",
      "I hold a Master's in Geography (GIS&T) from the University of Nebraska at Omaha (**4.0 GPA**). My thesis on spatiotemporal NOx emissions from U.S. cement plants using TROPOMI data earned the **GRACA Project Award**. I taught Human-Environment Geography labs to **150+ students** as instructor of record and contributed GIS work to the **Omaha Spatial Justice Project**, digitizing historical parcels and mapping racially restrictive covenants in Douglas County.",
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
          'Creating custom ArcGIS geoprocessing toolboxes to accelerate fiber network routing, cost estimation, and strategic market analysis for telecom expansion.',
        icon: 'network',
      },
    ],
  },

  jobs: [
    {
      _id: 'fallback-olsson',
      company: 'Olsson',
      title: 'GIS Developer and Analyst',
      badge: '2026 Edison Award Winner',
      dates: 'Mar 2025 – Present',
      location: 'Lincoln, Nebraska',
      bullets: ptList([
        'Architected production Python and C# desktop applications for fiber telecom engineering, including automated bore profile generation that cut processing time from **days to minutes**.',
        'Built an ArcGIS Automation Suite of custom Python geoprocessing toolboxes — pocketing, conduit drawing, centerline generation, cable route consolidation, cost/routing — reducing manual GIS steps by **90%** and accelerating fiber network design timelines.',
        'Developed ArcGIS Pro add-ins (.NET/C#/WPF): multi-source GIS Data Downloader (OSM, USGS, FEMA, Census/TIGER, BSL), RF Analysis panel (coverage prediction, PCI/RSI planning, interference analysis, tower placement), Street View map tool, and FTTH network design dock pane.',
        'Engineered AI-powered tools using Azure AI Foundry, Azure OpenAI, and Google AI Studio — including RFP Radar for intelligent web-grounded contract search and classification — cutting strategic sourcing timelines from **months to hours**.',
        'Built YOLO-based aerial and street-level object detection apps for remote inventory of utility poles, streetlights, and telecom infrastructure with georeferenced ArcGIS export.',
        'Created GeoPipe: a GUI ETL application for importing large geospatial/tabular datasets into SQL Server with schema auto-detection, spatial type support, and connection-loss recovery.',
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
      date: 'August 2025',
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
