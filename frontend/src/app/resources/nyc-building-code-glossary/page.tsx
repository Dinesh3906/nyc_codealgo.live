import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "NYC Building Code Glossary | CodeAlgo",
  description: "A comprehensive glossary of NYC Department of Buildings (DOB) terminology, zoning acronyms, and construction code definitions.",
};

export default function GlossaryPage() {
  const terms = [
    { id: "ac", term: "AC (Alternating Current)", def: "An electric current that reverses its direction many times a second at regular intervals." },
    { id: "ada", term: "ADA (Americans with Disabilities Act)", def: "Federal civil rights law that prohibits discrimination against individuals with disabilities in all areas of public life, including building accessibility." },
    { id: "ahv", term: "AHV (After-Hours Variance)", def: "A permit issued by the DOB to perform construction work outside of normal authorized hours (weekdays 7:00 AM to 6:00 PM)." },
    { id: "alt1", term: "ALT1 (Alteration Type 1)", def: "An alteration application required when there is a major change to the Certificate of Occupancy, such as changing use group or adding stories." },
    { id: "alt2", term: "ALT2 (Alteration Type 2)", def: "An alteration application for changes that do not affect the Certificate of Occupancy, but involve multiple types of work (e.g., plumbing and partitions)." },
    { id: "alt3", term: "ALT3 (Alteration Type 3)", def: "An alteration application for minor work that involves only one type of work (e.g., a simple curb cut or fence)." },
    { id: "bis", term: "BIS (Building Information System)", def: "The legacy DOB mainframe database containing property profiles, violations, and application statuses." },
    { id: "bsa", term: "BSA (Board of Standards and Appeals)", def: "An independent city agency that reviews appeals regarding zoning variances and special permits." },
    { id: "c-of-o", term: "C of O (Certificate of Occupancy)", def: "A legal document issued by the DOB certifying that a building complies with applicable building codes and is safe for occupancy." },
    { id: "cb", term: "CB (Community Board)", def: "Local representative bodies in NYC that review zoning changes and land use matters." },
    { id: "ccd1", term: "CCD1 (Construction Code Determination)", def: "A form used to request a determination or variation of the NYC Construction Codes from the DOB Borough Commissioner." },
    { id: "cd", term: "CD (Construction Documents)", def: "The final phase of the design process containing detailed architectural, structural, and MEP drawings for permitting." },
    { id: "ceqr", term: "CEQR (City Environmental Quality Review)", def: "NYC's process for evaluating the environmental impacts of discretionary actions by city agencies." },
    { id: "cfr", term: "CFR (Code of Federal Regulations)", def: "The codification of the general and permanent rules published in the Federal Register." },
    { id: "dob", term: "DOB (Department of Buildings)", def: "The NYC agency responsible for enforcing the Building Code and Zoning Resolution to ensure safe construction." },
    { id: "dob-now", term: "DOB NOW", def: "The modernized, online portal for DOB transactions, permitting, and compliance filings, gradually replacing BIS." },
    { id: "dot", term: "DOT (Department of Transportation)", def: "NYC agency managing streets and sidewalks; requires permits for construction logistics occupying the public right-of-way." },
    { id: "dp", term: "DP (Design Professional)", def: "A New York State Registered Architect (RA) or Professional Engineer (PE)." },
    { id: "ecb", term: "ECB (Environmental Control Board)", def: "A tribunal (now part of OATH) that hears cases regarding violations of NYC laws, including DOB infractions." },
    { id: "egress", term: "Egress", def: "A continuous and unobstructed path of vertical and horizontal travel from any occupied portion of a building to a public way." },
    { id: "eis", term: "EIS (Environmental Impact Statement)", def: "A comprehensive document required when a proposed project may have a significant adverse impact on the environment." },
    { id: "far", term: "FAR (Floor Area Ratio)", def: "The principal bulk regulation controlling the size of buildings. It is the ratio of total building floor area to the area of its zoning lot." },
    { id: "fdny", term: "FDNY (Fire Department of New York)", def: "Agency that reviews and approves fire protection plans, alarm systems, and emergency egress." },
    { id: "fisp", term: "FISP (Facade Inspection Safety Program)", def: "Formerly Local Law 11, requiring periodic inspection of exterior walls of buildings over six stories." },
    { id: "hpd", term: "HPD (Housing Preservation and Development)", def: "City agency promoting affordable housing and enforcing the Housing Maintenance Code." },
    { id: "hvac", term: "HVAC", def: "Heating, Ventilation, and Air Conditioning systems regulated by the NYC Mechanical Code." },
    { id: "ibc", term: "IBC (International Building Code)", def: "The base code model that the NYC Building Code is heavily modeled and adapted upon." },
    { id: "laa", term: "LAA (Limited Alteration Application)", def: "A simplified DOB application for minor plumbing, boiler, and elevator work." },
    { id: "ll11", term: "Local Law 11", def: "The predecessor to FISP, mandating rigorous facade inspections." },
    { id: "ll58", term: "Local Law 58", def: "A landmark NYC law establishing accessibility requirements for people with disabilities in buildings." },
    { id: "ll84", term: "Local Law 84", def: "Requires large buildings to benchmark their energy and water consumption annually." },
    { id: "ll87", term: "Local Law 87", def: "Requires large buildings to undergo energy audits and retro-commissioning every 10 years." },
    { id: "ll97", term: "Local Law 97", def: "Groundbreaking legislation placing strict carbon emission limits on NYC's largest buildings." },
    { id: "lpc", term: "LPC (Landmarks Preservation Commission)", def: "Agency responsible for protecting NYC's architecturally, historically, and culturally significant buildings." },
    { id: "mep", term: "MEP", def: "Mechanical, Electrical, and Plumbing engineering disciplines." },
    { id: "nb", term: "NB (New Building)", def: "A DOB application type for the construction of an entirely new structure." },
    { id: "noa", term: "NOA (Notice of Approval)", def: "A formal notification that construction documents have been reviewed and accepted by the DOB." },
    { id: "nov", term: "NOV (Notice of Violation)", def: "A formal summons issued by an inspector for violating the NYC Building Code or Zoning Resolution." },
    { id: "oath", term: "OATH (Office of Administrative Trials and Hearings)", def: "The independent administrative law court where DOB and ECB violations are adjudicated." },
    { id: "pa", term: "PA (Public Assembly)", def: "A DOB classification for spaces where 75 or more people gather indoors, requiring a specific Place of Assembly Certificate of Operation." },
    { id: "paa", term: "PAA (Post Approval Amendment)", def: "An application filed to amend approved construction documents prior to project sign-off." },
    { id: "pe", term: "PE (Professional Engineer)", def: "A licensed engineer authorized to stamp and submit structural and MEP plans to the DOB." },
    { id: "pl", term: "PL (Plumbing)", def: "Work category encompassing domestic water, sanitary, and gas piping." },
    { id: "pra", term: "PRA (Plan Review Agent)", def: "A third-party professional authorized to expedite and review plans for DOB approval." },
    { id: "ra", term: "RA (Registered Architect)", def: "A licensed architect authorized to stamp and submit architectural plans to the DOB." },
    { id: "rfi", term: "RFI (Request for Information)", def: "A formal document used during construction to clarify design intent or resolve site issues." },
    { id: "r-occupancy", term: "R-Occupancy (Residential)", def: "Building code classification for structures used for sleeping purposes, such as apartments and hotels." },
    { id: "sc", term: "SC (Structural Concrete)", def: "Special inspections required during the pouring and curing of structural concrete elements." },
    { id: "sd", term: "SD (Schematic Design)", def: "An early phase of architectural design translating the program into spatial relationships." },
    { id: "soe", term: "SOE (Support of Excavation)", def: "Temporary structural systems (e.g., shoring, underpinning) required to retain earth during foundational excavation." },
    { id: "swo", term: "SWO (Stop Work Order)", def: "An order issued by the DOB halting all or partial construction due to unsafe conditions or unpermitted work." },
    { id: "tco", term: "TCO (Temporary Certificate of Occupancy)", def: "A certificate allowing a building to be partially or fully occupied for a limited time (typically 90 days) before a final C of O is obtained." },
    { id: "tr1", term: "TR1", def: "A Technical Report form submitted to the DOB identifying responsibility for Special Inspections." },
    { id: "tr8", term: "TR8", def: "A Technical Report form certifying compliance with the NYC Energy Conservation Code." },
    { id: "ulurp", term: "ULURP (Uniform Land Use Review Procedure)", def: "A standardized public review process for applications affecting city land use." },
    { id: "vio", term: "VIO (Violation)", def: "An infraction recorded against a property for non-compliance, often requiring a Certificate of Correction." },
    { id: "zd1", term: "ZD1 (Zoning Diagram)", def: "A required DOB form illustrating the proposed building bulk, yards, and setbacks against zoning limits." },
    { id: "zrd1", term: "ZRD1 (Zoning Resolution Determination)", def: "A form used to request a formal interpretation of the NYC Zoning Resolution from the DOB." },
    { id: "zoning-lot", term: "Zoning Lot", def: "A tract of land, either unsubdivided or consisting of two or more lots of record, treated as a single entity for zoning purposes." },
    { id: "zr", term: "ZR (Zoning Resolution)", def: "The legal document regulating land use, building size, and density in New York City." }
  ];

  return (
    <main className="min-h-screen py-24 px-6 bg-background">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-4xl font-bold mb-6 text-foreground text-center">NYC Building Code Glossary</h1>
        <p className="text-xl text-muted-foreground text-center mb-12">The definitive A-Z guide to DOB acronyms and construction terminology.</p>
        
        <dl className="grid gap-6">
          {terms.map((item) => (
            <div key={item.id} className="p-6 border border-border rounded-xl bg-card shadow-sm hover:shadow-md transition-shadow">
              <dt id={item.id} className="text-xl font-semibold text-primary mb-2 scroll-mt-24">
                <a href={`#${item.id}`} className="hover:underline">{item.term}</a>
              </dt>
              <dd className="text-muted-foreground leading-relaxed">{item.def}</dd>
            </div>
          ))}
        </dl>
      </div>
    </main>
  );
}
