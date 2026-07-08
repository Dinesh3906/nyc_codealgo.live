import programmaticPosts from './programmatic-blog-posts.json';

export interface BlogPost {
  slug: string;
  title: string;
  keyword: string;
  description?: string;
  datePublished?: string;
  dateModified?: string;
  content?: string;
  faqs?: { question: string; answer: string }[];
  relatedSlugs?: string[];
}

export const BLOG_POSTS: BlogPost[] = [
  // ── CLUSTER 1: NYC BUILDING CODE BASICS (15 posts) ──
  {
    slug: "nyc-building-code-checklist-2026",
    title: "NYC Building Code Checklist 2026: Everything Architects Must Know",
    keyword: "nyc building code checklist",
    description: "A comprehensive, category-by-category checklist covering every NYC building code requirement architects must verify before submission in 2026.",
    datePublished: "2026-06-01",
    dateModified: "2026-06-01",
    relatedSlugs: ["nyc-existing-building-code-2026-guide", "nyc-dob-code-requirements-explained", "nyc-building-code-fire-safety-requirements"],
  },
  {
    slug: "nyc-existing-building-code-2026-guide",
    title: "NYC Existing Building Code 2026: Complete Guide for Architects",
    keyword: "nyc existing building code 2026",
    description: "Deep guide on the NYC Existing Building Code enacted January 17, 2026, effective July 17, 2027. The five compliance paths explained.",
    datePublished: "2026-06-01",
    dateModified: "2026-06-01",
    relatedSlugs: ["nyc-building-code-checklist-2026", "nyc-construction-code-updates-2026", "nyc-building-code-occupancy-classifications"],
  },
  {
    slug: "nyc-dob-code-requirements-explained",
    title: "NYC DOB Code Requirements Explained: A to Z for Architects",
    keyword: "nyc dob code requirements",
    description: "Every DOB code requirement explained from zoning compliance to fire safety. Specific code section references for NYC architects.",
    datePublished: "2026-06-01",
    dateModified: "2026-06-01",
    relatedSlugs: ["nyc-building-code-checklist-2026", "nyc-building-code-vs-zoning-resolution", "nyc-building-code-egress-requirements"],
  },
  {
    slug: "nyc-building-code-vs-zoning-resolution",
    title: "NYC Building Code vs Zoning Resolution: Key Differences",
    keyword: "nyc building code vs zoning",
    datePublished: "2026-06-01",
    dateModified: "2026-06-01",
    relatedSlugs: ["nyc-dob-code-requirements-explained", "nyc-building-code-occupancy-classifications", "nyc-building-code-residential-vs-commercial"],
  },
  {
    slug: "nyc-construction-code-updates-2026",
    title: "NYC Construction Code Updates 2026: What Changed and Why",
    keyword: "nyc construction code updates 2026",
    datePublished: "2026-06-01",
    dateModified: "2026-06-01",
    relatedSlugs: ["nyc-existing-building-code-2026-guide", "nyc-energy-code-compliance-2026", "nyc-building-code-checklist-2026"],
  },
  {
    slug: "nyc-building-code-fire-safety-requirements",
    title: "NYC Building Code Fire Safety Requirements for New Construction",
    keyword: "nyc building code fire safety",
    datePublished: "2026-06-01",
    dateModified: "2026-06-01",
    relatedSlugs: ["nyc-building-code-egress-requirements", "nyc-building-code-checklist-2026", "nyc-building-code-occupancy-classifications"],
  },
  {
    slug: "nyc-building-code-accessibility-requirements",
    title: "NYC Building Code Accessibility Requirements: ADA and Local Law",
    keyword: "nyc building code accessibility",
    datePublished: "2026-06-01",
    dateModified: "2026-06-01",
    relatedSlugs: ["nyc-building-code-egress-requirements", "nyc-dob-code-requirements-explained", "nyc-building-code-checklist-2026"],
  },
  {
    slug: "nyc-building-code-egress-requirements",
    title: "NYC Building Code Egress Requirements: Stairwells, Doors & Exits",
    keyword: "nyc building code egress requirements",
    datePublished: "2026-06-01",
    dateModified: "2026-06-01",
    relatedSlugs: ["nyc-building-code-fire-safety-requirements", "nyc-building-code-accessibility-requirements", "nyc-building-code-occupancy-classifications"],
  },
  {
    slug: "nyc-building-code-occupancy-classifications",
    title: "NYC Building Code Occupancy Classifications Explained",
    keyword: "nyc building code occupancy",
    datePublished: "2026-06-01",
    dateModified: "2026-06-01",
    relatedSlugs: ["nyc-building-code-residential-vs-commercial", "nyc-building-code-fire-safety-requirements", "nyc-building-code-egress-requirements"],
  },
  {
    slug: "nyc-energy-code-compliance-2026",
    title: "NYC Energy Code Compliance 2026: What Architects Need to Know",
    keyword: "nyc energy code compliance",
    datePublished: "2026-06-01",
    dateModified: "2026-06-01",
    relatedSlugs: ["nyc-construction-code-updates-2026", "nyc-mechanical-code-requirements", "nyc-building-code-checklist-2026"],
  },
  {
    slug: "nyc-plumbing-code-requirements",
    title: "NYC Plumbing Code Requirements for New Buildings and Renovations",
    keyword: "nyc plumbing code requirements",
    datePublished: "2026-06-01",
    dateModified: "2026-06-01",
    relatedSlugs: ["nyc-mechanical-code-requirements", "nyc-electrical-code-requirements", "nyc-dob-code-requirements-explained"],
  },
  {
    slug: "nyc-mechanical-code-requirements",
    title: "NYC Mechanical Code Requirements: HVAC Compliance Guide",
    keyword: "nyc mechanical code requirements",
    datePublished: "2026-06-01",
    dateModified: "2026-06-01",
    relatedSlugs: ["nyc-plumbing-code-requirements", "nyc-energy-code-compliance-2026", "nyc-electrical-code-requirements"],
  },
  {
    slug: "nyc-electrical-code-requirements",
    title: "NYC Electrical Code Requirements for Commercial Buildings",
    keyword: "nyc electrical code requirements",
    datePublished: "2026-06-01",
    dateModified: "2026-06-01",
    relatedSlugs: ["nyc-mechanical-code-requirements", "nyc-plumbing-code-requirements", "nyc-structural-code-requirements"],
  },
  {
    slug: "nyc-structural-code-requirements",
    title: "NYC Structural Code Requirements: Load, Wind & Seismic Design",
    keyword: "nyc structural code requirements",
    datePublished: "2026-06-01",
    dateModified: "2026-06-01",
    relatedSlugs: ["nyc-building-code-checklist-2026", "nyc-electrical-code-requirements", "nyc-construction-code-updates-2026"],
  },
  {
    slug: "nyc-building-code-residential-vs-commercial",
    title: "NYC Building Code Residential vs Commercial: Key Distinctions",
    keyword: "nyc building code residential vs commercial",
    datePublished: "2026-06-01",
    dateModified: "2026-06-01",
    relatedSlugs: ["nyc-building-code-occupancy-classifications", "nyc-building-code-vs-zoning-resolution", "nyc-dob-code-requirements-explained"],
  },

  // ── NEW POSTS FROM FIX 7 (added slugs for the 15 rewritten posts) ──
  {
    slug: "common-nyc-code-violations-architectural-plans",
    title: "10 Most Common NYC Code Violations on Architectural Plans",
    keyword: "common nyc code violations",
    datePublished: "2026-06-01",
    dateModified: "2026-06-01",
    relatedSlugs: ["nyc-building-code-checklist-2026", "nyc-permit-rejection-reasons", "nyc-dob-code-requirements-explained"],
  },
  {
    slug: "alt1-vs-alt2-vs-alt3-nyc-permits",
    title: "Alt-1 vs Alt-2 vs Alt-3 NYC Permits: Complete Comparison Guide",
    keyword: "alt1 vs alt2 vs alt3 nyc permits",
    datePublished: "2026-06-01",
    dateModified: "2026-06-01",
    relatedSlugs: ["nyc-dob-code-requirements-explained", "nyc-permit-rejection-reasons", "how-to-prepare-plans-for-dob-now-submission"],
  },
  {
    slug: "nyc-permit-rejection-reasons",
    title: "Top 15 NYC DOB Permit Rejection Reasons and How to Avoid Them",
    keyword: "nyc permit rejection reasons",
    datePublished: "2026-06-01",
    dateModified: "2026-06-01",
    relatedSlugs: ["common-nyc-code-violations-architectural-plans", "how-to-prepare-plans-for-dob-now-submission", "nyc-building-code-checklist-2026"],
  },
  {
    slug: "how-to-prepare-plans-for-dob-now-submission",
    title: "How to Prepare Plans for DOB NOW Submission: Step-by-Step",
    keyword: "dob now plan submission",
    datePublished: "2026-06-01",
    dateModified: "2026-06-01",
    relatedSlugs: ["nyc-permit-rejection-reasons", "nyc-dob-code-requirements-explained", "nyc-dob-plan-review-process"],
  },
  {
    slug: "nyc-local-law-97-compliance-guide",
    title: "NYC Local Law 97 Compliance Guide: Carbon Limits Explained",
    keyword: "nyc local law 97 compliance",
    datePublished: "2026-06-01",
    dateModified: "2026-06-01",
    relatedSlugs: ["nyc-energy-code-compliance-2026", "nyc-building-code-checklist-2026", "nyc-construction-code-updates-2026"],
  },
  {
    slug: "best-nyc-building-code-compliance-software",
    title: "Best NYC Building Code Compliance Software in 2026",
    keyword: "nyc building code compliance software",
    datePublished: "2026-06-01",
    dateModified: "2026-06-01",
    relatedSlugs: ["ai-tools-for-architects-nyc-compliance", "nyc-building-code-checklist-2026", "how-to-prepare-plans-for-dob-now-submission"],
  },
  {
    slug: "nyc-dob-plan-review-process",
    title: "NYC DOB Plan Review Process: Complete Timeline & Guide",
    keyword: "nyc dob plan review process",
    datePublished: "2026-06-01",
    dateModified: "2026-06-01",
    relatedSlugs: ["how-to-prepare-plans-for-dob-now-submission", "nyc-permit-rejection-reasons", "nyc-certificate-of-occupancy-guide"],
  },
  {
    slug: "nyc-certificate-of-occupancy-guide",
    title: "NYC Certificate of Occupancy Guide: Types, Process & Timelines",
    keyword: "nyc certificate of occupancy",
    datePublished: "2026-06-01",
    dateModified: "2026-06-01",
    relatedSlugs: ["nyc-dob-plan-review-process", "how-to-prepare-plans-for-dob-now-submission", "nyc-building-code-checklist-2026"],
  },
  {
    slug: "ai-tools-for-architects-nyc-compliance",
    title: "AI Tools for Architects: NYC Compliance Automation in 2026",
    keyword: "ai tools for architects nyc",
    datePublished: "2026-06-01",
    dateModified: "2026-06-01",
    relatedSlugs: ["best-nyc-building-code-compliance-software", "nyc-building-code-checklist-2026", "how-to-prepare-plans-for-dob-now-submission"],
  },
  {
    slug: "nyc-building-compliance-checklist-before-construction",
    title: "NYC Building Compliance Checklist Before Construction: 5 Phases",
    keyword: "nyc building compliance checklist before construction",
    datePublished: "2026-06-01",
    dateModified: "2026-06-01",
    relatedSlugs: ["nyc-building-code-checklist-2026", "nyc-certificate-of-occupancy-guide", "nyc-dob-plan-review-process"],
  },

  // ── PROGRAMMATIC POSTS (1000+ posts from generate_seo_data.py) ──
  ...(programmaticPosts as BlogPost[])
];
