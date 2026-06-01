export const BLOG_POSTS = [
  // Cluster 1: NYC Building Code Basics (15 posts)
  { slug: "nyc-building-code-checklist-2026", title: "NYC Building Code Checklist 2026: Everything Architects Must Know", keyword: "nyc building code checklist" },
  { slug: "nyc-existing-building-code-2026-guide", title: "NYC Existing Building Code 2026: Complete Guide for Architects", keyword: "nyc existing building code 2026" },
  { slug: "nyc-dob-code-requirements-explained", title: "NYC DOB Code Requirements Explained: A to Z for Architects", keyword: "nyc dob code requirements" },
  { slug: "nyc-building-code-vs-zoning-resolution", title: "NYC Building Code vs Zoning Resolution: Key Differences", keyword: "nyc building code vs zoning" },
  { slug: "nyc-construction-code-updates-2026", title: "NYC Construction Code Updates 2026: What Changed and Why", keyword: "nyc construction code updates 2026" },
  { slug: "nyc-building-code-fire-safety-requirements", title: "NYC Building Code Fire Safety Requirements for New Construction", keyword: "nyc building code fire safety" },
  { slug: "nyc-building-code-accessibility-requirements", title: "NYC Building Code Accessibility Requirements: ADA and Local Law", keyword: "nyc building code accessibility" },
  { slug: "nyc-building-code-egress-requirements", title: "NYC Building Code Egress Requirements: Stairwells, Doors & Exits", keyword: "nyc building code egress requirements" },
  { slug: "nyc-building-code-occupancy-classifications", title: "NYC Building Code Occupancy Classifications Explained", keyword: "nyc building code occupancy" },
  { slug: "nyc-energy-code-compliance-2026", title: "NYC Energy Code Compliance 2026: What Architects Need to Know", keyword: "nyc energy code compliance" },
  { slug: "nyc-plumbing-code-requirements", title: "NYC Plumbing Code Requirements for New Buildings and Renovations", keyword: "nyc plumbing code requirements" },
  { slug: "nyc-mechanical-code-requirements", title: "NYC Mechanical Code Requirements: HVAC Compliance Guide", keyword: "nyc mechanical code requirements" },
  { slug: "nyc-electrical-code-requirements", title: "NYC Electrical Code Requirements for Commercial Buildings", keyword: "nyc electrical code requirements" },
  { slug: "nyc-structural-code-requirements", title: "NYC Structural Code Requirements: Load, Wind & Seismic Design", keyword: "nyc structural code requirements" },
  { slug: "nyc-building-code-residential-vs-commercial", title: "NYC Building Code Residential vs Commercial: Key Distinctions", keyword: "nyc building code residential vs commercial" },
  
  // Generating the remaining 85 stubs to make 100 total
  ...Array.from({ length: 85 }).map((_, i) => ({
    slug: `nyc-building-code-guide-part-${i + 16}`,
    title: `NYC Building Code Deep Dive Part ${i + 16}: Advanced Compliance`,
    keyword: `nyc building code guide part ${i + 16}`
  }))
];
