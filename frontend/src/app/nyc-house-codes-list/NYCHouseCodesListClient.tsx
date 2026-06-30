'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';

// Detailed Glossary of NYC Building Codes and Search Terms (Highly optimized for Search Engines)
const GLOSSARY_ITEMS = [
  // Fire & Life Safety
  {
    code: "BC 907.2",
    term: "Interconnected Smoke Detectors & Fire Alarms",
    keywords: "NYC smoke detector code, apartment fire alarm system requirements, bedroom smoke alarm placement rules, interconnected fire alarms",
    category: "Fire & Life Safety",
    summary: "Mandates interconnected smoke alarms inside every sleeping room, in the immediate vicinity outside bedrooms, and on every story of a dwelling unit.",
    details: "Alarms must receive primary power from the building wiring with a battery backup. Wireless interconnection is allowed under approved conditions."
  },
  {
    code: "BC 915",
    term: "Carbon Monoxide (CO) Alarms & Detectors",
    keywords: "NYC carbon monoxide detector law, CO alarm placement heights, boiler room carbon monoxide detectors, gas appliance safety rules",
    category: "Fire & Life Safety",
    summary: "Requires certified carbon monoxide alarms in all dwelling units containing fuel-burning appliances or having attached garages.",
    details: "Must be installed within 15 feet of all sleeping areas and outside boiler rooms. Must be hardwired with battery back-up or utilize 10-year sealed batteries."
  },
  {
    code: "BC 903.2",
    term: "Automatic Sprinkler System Mandates",
    keywords: "NYC residential sprinkler requirement, multi-family building automatic sprinklers, commercial building fire suppression systems, BC 903",
    category: "Fire & Life Safety",
    summary: "Establishes fire sprinkler installation criteria for Group R residential buildings, high-rise properties, and specific commercial occupancies.",
    details: "Highly detailed regulations on water supply capacity, NFPA 13/13R compliance standards, and mandatory annual DOB inspection routines."
  },
  {
    code: "BC 705",
    term: "Exterior Fire-Resistance Wall Ratings",
    keywords: "NYC building code property line fire wall, fire-rated exterior walls, exterior wall opening protection, fire separation distance rules",
    category: "Fire & Life Safety",
    summary: "Governs fire-resistance ratings of exterior walls based on fire separation distance to lot lines and adjacent buildings.",
    details: "Prohibits unprotected openings (windows/doors) within certain distances of property boundaries to prevent inter-building fire spread."
  },
  {
    code: "BC 803",
    term: "Interior Finishes Flame-Spread Index",
    keywords: "NYC interior wall finish class rating, flame spread index limits, smoke development ratings, plasterboard class classification",
    category: "Fire & Life Safety",
    summary: "Regulates interior wall and ceiling finish materials based on Class A, B, or C flame-spread and smoke-developed indexes.",
    details: "Restricts materials in exit enclosures, corridors, and habitable spaces to prevent rapid flame travel during fire egress scenarios."
  },

  // Means of Egress
  {
    code: "BC 1008",
    term: "Means of Egress Clear Doorway Widths",
    keywords: "NYC building code egress door width, minimum door opening clearance, commercial entrance ADA door dimensions, swing direction rules",
    category: "Means of Egress",
    summary: "Egress doors must provide a minimum clear opening width of 32 inches, measured between the face of the door and the stop when opened 90 degrees.",
    details: "Maximum nominal door leaf width is 48 inches. Pivot or swinging doors must swing in the direction of egress travel when serving high occupancies."
  },
  {
    code: "BC 1009",
    term: "Stairway Riser Heights & Tread Depths",
    keywords: "NYC stair riser tread dimensions, residential staircase code, maximum stair riser height, stair handrail projection guidelines",
    category: "Means of Egress",
    summary: "Stair risers must be between 4 and 7 inches high, and treads must have a minimum run/depth of 11 inches.",
    details: "Residential stairways permit a maximum riser height of 8.25 inches and a minimum tread depth of 9 inches with uniform spacing."
  },
  {
    code: "BC 1013",
    term: "Guards and Handrail Heights",
    keywords: "NYC handrail height building code, guardrail height requirements, balcony guard spacing, staircase railing code regulations",
    category: "Means of Egress",
    summary: "Guards are required along open-sided walking surfaces higher than 30 inches, mandating a minimum height of 42 inches.",
    details: "Handrails must be positioned between 34 and 38 inches measured vertically from the tread nosing. Spacing between guard balusters must not allow a 4-inch sphere to pass."
  },
  {
    code: "BC 1006",
    term: "Emergency Escape and Rescue Openings (EERO)",
    keywords: "NYC bedroom window egress requirements, emergency egress window sill height, basement escape window dimensions, DOB egress window",
    category: "Means of Egress",
    summary: "Every sleeping room below the fourth story must have at least one operable emergency window or door leading directly outside.",
    details: "Must provide a net clear opening of 5.7 sq ft (5.0 sq ft on grade level), with a minimum height of 24 inches, width of 20 inches, and sill height max 44 inches."
  },
  {
    code: "BC 1018",
    term: "Corridor Widths and Dead-End Limits",
    keywords: "NYC building code hallway width, residential corridor clearance, maximum dead end corridor distance, commercial corridor dimensions",
    category: "Means of Egress",
    summary: "Determines minimum width of corridors serving occupant loads and restricts dead-end corridor lengths to prevent entrapment.",
    details: "Most corridors must maintain a 44-inch clear width (36 inches in small residential occupancies). Dead-ends are generally capped at 20 feet."
  },

  // Accessibility
  {
    code: "BC 1107",
    term: "ADA Accessible Ramps & Slopes",
    keywords: "NYC ADA ramp slope requirement, handicap ramp landing dimensions, wheel chair ramp handrails, maximum ramp angle commercial",
    category: "Accessibility",
    summary: "Ramps used as part of an accessible route must have a maximum slope of 1:12 (8.33% grade) with designated landings.",
    details: "Requires landings at the top and bottom of each ramp run, with minimum clear dimensions of 60 inches by 60 inches where ramps change directions."
  },
  {
    code: "BC 1109",
    term: "Accessible Restroom & Toilet Compartments",
    keywords: "NYC ADA bathroom requirements, handicap toilet clearance dimensions, wheelchair turning circle diameter, accessible sink heights",
    category: "Accessibility",
    summary: "Mandates bathroom design requirements for disabled access, including grab bar placement, clear floor spaces, and turning circles.",
    details: "Requires a 60-inch unobstructed turning space (turning circle) or T-shaped wheelchair turnaround area, with specific grab bar heights (33-36 inches)."
  },
  {
    code: "BC 1107.6",
    term: "Type A & Type B Adaptable Units",
    keywords: "NYC adaptable apartment code, Type A vs Type B residential units, accessible kitchen design rules, universal design apartments",
    category: "Accessibility",
    summary: "Specifies accessible unit ratios and adaptable designs for multi-family residential developments (Group R-2 occupancies).",
    details: "Outlines clear doorways, low countertops, reinforced bathroom walls for future grab bar installations, and adaptable turning spaces in kitchens."
  },

  // Ventilation & Habitation
  {
    code: "BC 1208.2",
    term: "Minimum Room Area & Habitable Space Dimensions",
    keywords: "NYC bedroom minimum size square feet, habitable room dimensions building code, studio apartment minimum area, bedroom layout rules",
    category: "Ventilation & Habitation",
    summary: "Every habitable room must have at least 70 square feet of net floor area, with a minimum horizontal dimension of 7 feet.",
    details: "At least one habitable room in every dwelling unit must have a net floor area of not less than 150 square feet."
  },
  {
    code: "BC 1208.2.1",
    term: "Habitable Room Minimum Ceiling Heights",
    keywords: "NYC ceiling height code residential, basement ceiling height requirements, kitchen ceiling exceptions, habitable attic height rules",
    category: "Ventilation & Habitation",
    summary: "Habitable spaces, hallways, bathrooms, and laundry rooms must have a ceiling height of not less than 7 feet 6 inches.",
    details: "Exceptions include kitchens, bathrooms, and storage rooms which are permitted to have a lower height limit of 7 feet 0 inches."
  },
  {
    code: "BC 1205.2",
    term: "Natural Light & Ventilation Openings",
    keywords: "NYC window size room ratio code, residential ventilation window requirements, natural light percentage room area, fresh air regulations",
    category: "Ventilation & Habitation",
    summary: "Every habitable room must be provided with natural light through windows equal to at least 10% of the room's floor area.",
    details: "Natural ventilation opening area (operable window space) must be at least 4% of the room's net floor area to ensure adequate outdoor air intake."
  },

  // MEP Codes
  {
    code: "NEC 110.26",
    term: "Electrical Panel Working Clearances",
    keywords: "NYC electrical code panel clearance, working space electrical switchboards, electrical panel depth room requirements, panel height limits",
    category: "MEP Codes",
    summary: "Requires clear working space around electrical equipment, specifying a minimum depth of 36 inches in front of panels.",
    details: "Width of working space must be at least 30 inches or the width of the equipment, whichever is greater, and must extend up to 6.5 feet high."
  },
  {
    code: "PC 403",
    term: "Minimum Plumbing Fixture Counts",
    keywords: "NYC plumbing code fixture calculator, commercial bathroom count rules, residential plumbing fixture requirements, kitchen sink code",
    category: "MEP Codes",
    summary: "Establishes minimum toilet, sink, shower, and drinking fountain counts based on building occupancy classifications and occupant loads.",
    details: "Specifies strict toilet-to-occupant ratios for offices, restaurants, and retail spaces, including mandatory separate facilities for sexes."
  },
  {
    code: "MC 403",
    term: "Mechanical Airflow Rate & Exhaust CFM",
    keywords: "NYC mechanical ventilation exhaust rate, bathroom exhaust fan CFM code, kitchen hood exhaust airflows, fresh air ventilation rates",
    category: "MEP Codes",
    summary: "Dictates mandatory mechanical exhaust and fresh air intake ventilation rates for kitchens, bathrooms, and work areas.",
    details: "Residential bathrooms require local exhaust of 50 CFM intermittent or 20 CFM continuous. Kitchens require a minimum of 100 CFM intermittent exhaust."
  },
  {
    code: "FGC 303",
    term: "Gas Appliance Locations & Air Supply",
    keywords: "NYC gas appliance boiler installation rules, boiler room air intake louvers, gas heater clearance regulations, fuel gas safety code",
    category: "MEP Codes",
    summary: "Restricts gas-fired appliances (such as boilers, furnaces, and water heaters) from being installed in bedrooms or bathrooms.",
    details: "Ensures appliances have sufficient combustion air supply through direct vents or ductwork, preventing hazardous flue gas buildup."
  }
];

export default function NYCHouseCodesListClient() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Filter Categories
  const categories = useMemo(() => {
    return ['All', ...Array.from(new Set(GLOSSARY_ITEMS.map(item => item.category)))];
  }, []);

  // Filtered List based on Search & Category
  const filteredItems = useMemo(() => {
    return GLOSSARY_ITEMS.filter(item => {
      const matchesSearch = 
        item.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.keywords.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.details.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30 selection:text-blue-200">
      
      {/* Dynamic Floating Gradient Backgrounds */}
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-blue-950/20 via-slate-950 to-transparent pointer-events-none z-0" />
      <div className="absolute top-[20%] right-[10%] w-[400px] h-[400px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="absolute top-[60%] left-[5%] w-[450px] h-[450px] bg-teal-500/5 blur-[150px] rounded-full pointer-events-none z-0" />

      <main className="relative container mx-auto px-6 py-16 max-w-5xl z-10">
        
        {/* Breadcrumb for Google Crawler SEO */}
        <nav className="mb-8 text-sm text-slate-500 flex items-center gap-2">
          <Link href="/" className="hover:text-blue-400 transition-colors">Home</Link>
          <span>/</span>
          <span className="text-slate-300">NYC House Codes List</span>
        </nav>

        {/* Premium Header */}
        <header className="mb-12 border-b border-slate-800/80 pb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-500/30 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-6">
            ✨ Complete 2026 Interactive Directory
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white mb-6 leading-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            New York City House Codes List
          </h1>
          <p className="text-xl text-slate-400 leading-relaxed max-w-3xl">
            The definitive interactive index of NYC residential and commercial building codes. Search, filter, and verify municipal rules for fire safety, egress limits, ADA accessibility, and MEP designs.
          </p>
        </header>

        {/* Dynamic SEO Informational Block */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 mb-12 backdrop-blur-md">
          <h2 className="text-2xl font-bold text-white mb-4">Why NYC Building Code Compliance Matters</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            New York City maintains the most rigorous safety and occupancy standards in the United States. Governed by the <strong>New York City Department of Buildings (DOB)</strong>, compliance with local <strong>NYC Building Codes</strong> prevents safety hazards, protects investments, and safeguards structural value. Residential builders, engineers, and property owners must cross-reference guidelines carefully to avoid costly work stoppages and structural penalties.
          </p>
          <div className="grid sm:grid-cols-3 gap-6 mt-6 pt-6 border-t border-slate-800/60">
            <div>
              <h3 className="text-slate-400 font-bold mb-1">Total Codes Index</h3>
              <p className="text-2xl font-extrabold text-blue-400">113 Chapters</p>
            </div>
            <div>
              <h3 className="text-slate-400 font-bold mb-1">Zoning Resolutions</h3>
              <p className="text-2xl font-extrabold text-blue-400">59 Districts</p>
            </div>
            <div>
              <h3 className="text-slate-400 font-bold mb-1">Target Requirements</h3>
              <p className="text-2xl font-extrabold text-blue-400">10,000+ Rules</p>
            </div>
          </div>
        </section>

        {/* Interactive Search & Filter Controls */}
        <section className="mb-10 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl sticky top-4 backdrop-blur-lg z-20">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full md:flex-1">
              <input
                type="text"
                placeholder="Search code sections, keywords (e.g. egress, stair height, ADA slope)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500/50 rounded-lg py-3 px-11 text-slate-100 placeholder:text-slate-600 focus:outline-none transition-all focus:ring-1 focus:ring-blue-500/20"
              />
              <svg className="absolute left-4 top-3.5 h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-4 top-3 text-slate-500 hover:text-slate-300 text-sm font-semibold"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Category Filter Buttons */}
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedCategory === category
                      ? 'bg-blue-500 text-slate-950 shadow-md font-bold'
                      : 'bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 text-xs text-slate-500">
            Showing {filteredItems.length} compliance definitions based on your active search criteria.
          </div>
        </section>

        {/* Directory Glossary Grid */}
        <section className="space-y-8 min-h-[300px]">
          {filteredItems.length > 0 ? (
            <div className="grid gap-6">
              {filteredItems.map((item, idx) => (
                <article 
                  key={idx}
                  className="group bg-slate-900/40 border border-slate-800/80 hover:border-blue-500/30 rounded-xl p-6 hover:shadow-lg transition-all hover:bg-slate-900/60 duration-300"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-blue-400 font-extrabold text-sm px-2.5 py-1 rounded bg-blue-950/40 border border-blue-500/20">
                        {item.code}
                      </span>
                      <h3 className="text-xl font-bold text-white group-hover:text-blue-300 transition-colors">
                        {item.term}
                      </h3>
                    </div>
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-800 text-slate-400 self-start sm:self-auto">
                      {item.category}
                    </span>
                  </div>

                  <p className="text-slate-300 mb-3 leading-relaxed">
                    {item.summary}
                  </p>

                  <div className="text-slate-400 text-sm bg-slate-950/60 p-4 rounded-lg border border-slate-800/60 leading-relaxed mb-4">
                    <strong className="text-slate-300">Technical Details: </strong>
                    {item.details}
                  </div>

                  {/* Hidden Keywords Injector for Crawler Indexing */}
                  <div className="text-[10px] text-slate-600/60 mt-2 leading-tight">
                    <span className="font-semibold text-slate-600">Search Tags: </span> 
                    {item.keywords}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 border border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
              <svg className="mx-auto h-12 w-12 text-slate-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-xl font-semibold text-slate-400 mb-2">No matching code guidelines found</h3>
              <p className="text-slate-600 max-w-md mx-auto">
                We couldn&apos;t find any specific building code rule or chapter matching &ldquo;{searchTerm}&rdquo;. Try using terms like &quot;smoke&quot;, &quot;stair&quot;, &quot;ADA&quot;, or &quot;ventilation&quot;.
              </p>
            </div>
          )}
        </section>

        {/* High-Impact SEO Search Engine Dominance Strategy Block */}
        <section className="mt-16 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-blue-500/10 blur-[80px] rounded-full pointer-events-none" />
          
          <div className="max-w-3xl relative z-10">
            <h2 className="text-3xl font-black text-white mb-4">
              Instant NYC Code Compliance Checking
            </h2>
            <p className="text-lg text-slate-300 mb-8 leading-relaxed">
              Don&apos;t spend hours scrolling through thousands of pages of municipal PDF regulations or worrying about hidden structural traps. PermitIQ by Aureon&apos;s AI compliance engine parses your architectural plans and instantly identifies potential code violations, saving time and preventing DOB design rejection.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/dashboard" className="inline-flex justify-center items-center px-8 py-4 bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold text-lg rounded-xl shadow-lg hover:shadow-blue-500/10 hover:scale-[1.02] active:scale-[0.98] transition-all">
                Launch Code Compliance Checker
              </Link>
              <Link href="/nyc-codes-checking" className="inline-flex justify-center items-center px-8 py-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-bold text-lg rounded-xl transition-all">
                Learn About Verification
              </Link>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
