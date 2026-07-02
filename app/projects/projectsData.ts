export type ProjectTone = 'blue' | 'cyan' | 'orange' | 'green';

export interface ProjectTag {
  label: string;
  tone: ProjectTone;
}

export interface ProjectEntry {
  title: string;
  subtitle: string;
  tags: ProjectTag[];
  image: string | null;
  problem: string;
  solution: string;
  impact: string[];
  tech: string[];
}

export const projects: ProjectEntry[] = [
  {
    title: 'RFP Radar',
    subtitle: 'AI-powered RFP sourcing and contract classification',
    tags: [
      { label: 'AI & Automation', tone: 'blue' },
      { label: 'Azure OpenAI', tone: 'blue' },
      { label: 'Telecom', tone: 'cyan' },
      { label: 'Production', tone: 'green' },
    ],
    image: '/RFP.png',
    problem:
      'Manual RFP searching required analysts to spend months reviewing thousands of government contracts to find relevant fiber and telecom opportunities.',
    solution:
      'Built a production desktop application using Azure OpenAI and Google AI Studio to automate web grounding, intelligent classification, and matching of RFPs to company capabilities. Features batch search, URL validation, and CSV export.',
    impact: [
      'Processing time reduced from months to hours',
      'Automated classification of thousands of contracts',
      'Deployed as a production tool at Olsson',
    ],
    tech: ['Python', 'Azure OpenAI', 'Google AI Studio', 'ArcGIS', 'SQL Server'],
  },
  {
    title: 'Fiber Automatic Expansion',
    subtitle: 'ArcGIS Pro add-in for automated fiber build-area planning',
    tags: [
      { label: 'ArcGIS Pro', tone: 'blue' },
      { label: 'Telecom', tone: 'cyan' },
      { label: 'Fiber', tone: 'orange' },
      { label: 'Spatial Analysis', tone: 'green' },
    ],
    image: '/Fiber-Automatic-Expansion.png',
    problem:
      'Evaluating where to build new fiber networks meant analysts drawing polygons by eye, estimating passings per mile in spreadsheets, and recalculating every time a boundary changed — slow, inconsistent, and hard to scale.',
    solution:
      'Built a custom ArcGIS Pro decision-support add-in that reads address points and route networks, divides the study area into a spatial grid for density analysis, flood-fills viable build zones against configurable PPM thresholds, and generates economic scorecards. An interactive spot-check panel lets analysts refine boundaries grid-cell by grid-cell with live scorecard updates.',
    impact: [
      'Expansion planning reduced from days or weeks to minutes',
      'Consistent, repeatable candidate build areas across analysts',
      'Human-in-the-loop refinement keeps strategy in analyst hands',
    ],
    tech: ['C#', '.NET', 'ArcGIS Pro SDK', 'WPF', 'Spatial Analysis', 'Telecom'],
  },
  {
    title: 'GIS Data Downloader',
    subtitle: 'One-click multi-source spatial data acquisition in ArcGIS Pro',
    tags: [
      { label: 'ArcGIS Pro', tone: 'blue' },
      { label: '.NET 8', tone: 'cyan' },
      { label: 'Open Data', tone: 'green' },
      { label: 'SQL Server', tone: 'orange' },
    ],
    image: '/GIS-Data-Downloader.png',
    problem:
      'Analysts spent hours in browser portals — pick a state, wait for downloads, unzip, import, fix projections, repeat — before any real GIS work could start.',
    solution:
      'Built a custom ArcGIS Pro dock-pane add-in (.NET 8 / C#) that pulls address points, parcels, building footprints, OSM roads, TIGER boundaries, FEMA flood zones, USGS elevation, GBIF species records, Wikipedia markers, and BSL broadband data directly into the project geodatabase. Large SQL parcel pulls use auto-tiled extents, parallel streaming from SQL Server into GDB InsertCursor, and direct WKT-to-geometry parsing.',
    impact: [
      'Eliminates manual portal hunting and import loops',
      'Statewide parcel downloads at millions of rows without choking SQL',
      'Packaged as .esriAddinX — double-click install, no Visual Studio required',
    ],
    tech: ['C#', '.NET 8', 'ArcGIS Pro SDK', 'WPF', 'SQL Server', 'OpenStreetMap'],
  },
  {
    title: 'FTTH Network Designer',
    subtitle: 'Automated fiber optic network planning in ArcGIS Pro',
    tags: [
      { label: 'ArcGIS Pro', tone: 'blue' },
      { label: 'FTTH', tone: 'orange' },
      { label: 'Network Design', tone: 'cyan' },
      { label: 'Kruskal MST', tone: 'green' },
    ],
    image: '/FTTH-Network-Designer.png',
    problem:
      'Laying out FTTH networks in ArcGIS meant days of manual digitizing — placing junction shafts, connecting every address, and designing a backbone — with frequent errors and no consistent drop-type or trunk classification for cost estimates.',
    solution:
      'Built an ArcGIS Pro add-in (.NET 8 / WPF) that automates the full workflow in three steps: place shafts at road intersections, connect homes to the nearest shaft via a spatial grid (tagging Street Drop vs Driveway Drop by geodesic length), then run Kruskal’s minimum spanning tree for an optimal backbone classified as Main Trunk or Terminal Branch. Respects active map selections for partial study areas.',
    impact: [
      'Network layout reduced from days to minutes',
      'Drop-type tagging drives material cost estimates automatically',
      'MST backbone minimizes total cable length for construction phasing',
    ],
    tech: ['C#', '.NET 8', 'ArcGIS Pro SDK', 'WPF', 'Kruskal MST', 'FTTH'],
  },
  {
    title: 'RF Network Planning',
    subtitle: 'ArcGIS Pro add-in for wireless RF design and optimization',
    tags: [
      { label: 'ArcGIS Pro', tone: 'blue' },
      { label: 'RF Planning', tone: 'cyan' },
      { label: '5G / LTE', tone: 'orange' },
      { label: 'Wireless', tone: 'green' },
    ],
    image: '/RF-Network-Planning.png',
    problem:
      'Wireless network planning meant juggling spreadsheets, specialized RF software, and GIS separately — hours of manual PCI assignment, interference checks, and coverage analysis with no shared map view for the team.',
    solution:
      'Built a custom ArcGIS Pro dock-pane add-in that reads standard tower CSV exports and runs eight capabilities in one place: antenna sector pie wedges on the map, automatic PCI assignment, azimuth and tilt optimization, signal-strength heatmaps (Okumura-Hata, COST-231, and other propagation models), color-coded co-channel and adjacent-channel interference lines between tower pairs, and site placement optimization using elevation, line-of-sight, and Fresnel zone diffraction — all written back as shareable map layers.',
    impact: [
      'RF planning workflows reduced from hours to a few clicks',
      'No context-switching between GIS, spreadsheets, and external RF tools',
      'Map-native outputs the whole engineering team can review together',
    ],
    tech: ['C#', '.NET', 'ArcGIS Pro SDK', 'WPF', 'RF Propagation', 'PCI Planning'],
  },
  {
    title: 'Aerial AI Object Detection',
    subtitle: 'YOLO-based utility infrastructure detection from aerial imagery',
    tags: [
      { label: 'Computer Vision', tone: 'cyan' },
      { label: 'YOLO', tone: 'blue' },
      { label: 'Aerial Imagery', tone: 'green' },
      { label: 'Telecom', tone: 'orange' },
    ],
    image: '/Aerial-AI-Object-Detection.png',
    problem:
      'Identifying utility poles, streetlights, and telecom infrastructure in aerial imagery required expensive manual inspection across large geographic areas.',
    solution:
      'Built a desktop application that fetches high-resolution aerial tiles by coordinate, runs a custom-trained YOLO model to detect utility assets, and exports georeferenced results to ArcGIS. Supports single-point, grid, and area scanning modes with tile navigation controls.',
    impact: [
      'Automated detection of utility poles and streetlights from aerial tiles',
      'Georeferenced export to GIS-ready formats',
      'Custom YOLO model trained on telecom infrastructure classes',
    ],
    tech: ['Python', 'YOLO', 'Aerial Imagery API', 'ArcGIS', 'OpenCV'],
  },
  {
    title: 'Streetview AI Object Detection',
    subtitle: 'YOLO-based infrastructure detection along street routes',
    tags: [
      { label: 'Computer Vision', tone: 'cyan' },
      { label: 'YOLO', tone: 'blue' },
      { label: 'Street View', tone: 'green' },
      { label: 'Field Survey', tone: 'orange' },
    ],
    image: '/Streetview-AI-Object-Detection.png',
    problem:
      'Field surveys for utility poles and telecom equipment require costly in-person visits, and traditional GIS methods cannot identify specific physical assets from ground level.',
    solution:
      'Built a desktop application that traverses streets using street-level imagery, running a custom YOLO model to detect and classify utility infrastructure. Supports line traversal, panoramic capture, and area buffering with step-by-step navigation controls.',
    impact: [
      'Remote field survey capability without site visits',
      'Automated inventory of streetside utility assets',
      'Configurable traversal distance and panoramic heading coverage',
    ],
    tech: ['Python', 'YOLO', 'Street-Level Imagery API', 'ArcGIS', 'OpenCV'],
  },
  {
    title: 'Bore Profile Automation',
    subtitle: 'Automated directional drilling profile generator',
    tags: [
      { label: 'Telecom Engineering', tone: 'orange' },
      { label: 'Directional Drill', tone: 'cyan' },
      { label: 'Elevation', tone: 'green' },
      { label: '.NET', tone: 'blue' },
    ],
    image: '/Bore-Profile-Automation.png',
    problem:
      'Generating bore profiles for fiber network directional drilling required days of manual drafting, creating bottlenecks in project timelines and introducing human error.',
    solution:
      'Developed a fully automated desktop application that reads spatial waypoints from an interactive map, processes elevation models, calculates bore depth and slope, and generates production-ready 2D and 3D elevation profiles with configurable running lines and break points.',
    impact: [
      'Processing time cut from days to minutes',
      'Eliminated manual drafting errors',
      'Deployed across the telecom engineering team at Olsson',
    ],
    tech: ['Python', 'C#', 'ArcGIS Pro', 'SQL Server', '.NET'],
  },
  {
    title: 'ArcGIS Automation Suite',
    subtitle: 'Custom Python geoprocessing toolboxes for fiber network design',
    tags: [
      { label: 'ArcGIS Pro', tone: 'blue' },
      { label: 'Python', tone: 'green' },
      { label: 'Fiber Design', tone: 'orange' },
      { label: 'Geoprocessing', tone: 'cyan' },
    ],
    image: null,
    problem:
      'Complex fiber network design workflows required repetitive manual GIS operations, slowing down engineers and creating inconsistencies across projects.',
    solution:
      'Developed a suite of custom Python geoprocessing toolboxes for ArcGIS Pro that automate routing analysis, cost estimation, and network design workflows.',
    impact: [
      '90% reduction in manual processing steps',
      'Accelerated fiber network design timelines',
      'Improved cost estimation accuracy',
    ],
    tech: ['Python', 'ArcGIS Pro', 'Geoprocessing', 'Spatial Analysis', 'NetworkX'],
  },
  {
    title: 'NOx Emissions Analysis',
    subtitle: 'MS thesis — spatiotemporal remote sensing',
    tags: [
      { label: 'Research', tone: 'green' },
      { label: 'Remote Sensing', tone: 'cyan' },
      { label: 'Environmental Justice', tone: 'orange' },
      { label: 'TROPOMI', tone: 'blue' },
    ],
    image: null,
    problem:
      'Limited understanding of spatiotemporal patterns of NOx emissions from U.S. cement plants and their environmental justice implications.',
    solution:
      'Used TROPOMI satellite data to perform spatiotemporal hotspot analysis of NOx emissions, correlating emission patterns with population demographics and environmental justice indicators.',
    impact: [
      'Full MS thesis — GPA 4.00',
      'Remote sensing analysis of all U.S. cement plants',
      'Environmental justice exposure analysis for affected populations',
    ],
    tech: ['Python', 'TROPOMI / Sentinel-5P', 'Google Earth Engine', 'SNAP', 'Spatial Statistics'],
  },
  {
    title: 'Omaha Spatial Justice Project',
    subtitle: 'Historical GIS and urban analysis',
    tags: [
      { label: 'Research', tone: 'green' },
      { label: 'Historical GIS', tone: 'orange' },
      { label: 'Urban Analysis', tone: 'blue' },
      { label: 'Omaha', tone: 'cyan' },
    ],
    image: null,
    problem:
      'Historical patterns of racial exclusion in Omaha real estate were undocumented spatially, making it difficult to understand the geographic scope of discriminatory practices.',
    solution:
      'Digitized historical land parcels from archival documents and aerial photography, georeferenced historical maps, and built a spatial database revealing redlining and racial covenant patterns.',
    impact: [
      'Revealed spatial patterns of racial exclusion',
      'Contributed to urban spatial justice research',
      'Accurate historical parcel database for Omaha',
    ],
    tech: ['ArcGIS Pro', 'Georeferencing', 'Digitizing', 'Historical GIS', 'Python'],
  },
];
