import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "NYC Local Laws & Deadlines Tracker | PermitIQ ( by Aureon )",
  description: "Track the latest NYC Local Laws affecting building construction, energy compliance, and safety regulations.",
};

export default function TrackerPage() {
  const laws = [
    { name: "Local Law 97 (2019)", summary: "Strict carbon emissions limits for buildings over 25,000 sq ft.", deadline: "May 2025 (Initial Report)", penalty: "$268 per metric ton over limit", status: "Active" },
    { name: "Local Law 11 (FISP)", summary: "Mandatory exterior wall/facade inspections for buildings taller than 6 stories.", deadline: "Cycle 9C: Feb 2024", penalty: "$1,000/month late filing", status: "Active" },
    { name: "Local Law 87 (2009)", summary: "Energy audits and retro-commissioning requirements.", deadline: "Dec 31 (Yr matching Tax Block)", penalty: "$3,000 first year, $5k thereafter", status: "Active" },
    { name: "Local Law 84 (2009)", summary: "Benchmarking of energy and water consumption for large buildings.", deadline: "May 1, Annually", penalty: "$500 per quarter", status: "Active" },
    { name: "Local Law 88 (2009)", summary: "Lighting upgrades and sub-metering mandates.", deadline: "Jan 1, 2025", penalty: "DOB Discretionary", status: "Approaching" },
    { name: "Local Law 152 (2016)", summary: "Periodic inspection of building gas piping systems.", deadline: "Dec 31 (Varies by District)", penalty: "$10,000 fine", status: "Active" },
    { name: "Local Law 196 (2017)", summary: "Site Safety Training (SST) requirements for construction workers.", deadline: "Enforced", penalty: "$5,000 per untrained worker", status: "Enforced" },
    { name: "Local Law 59 (2019)", summary: "Age limitations and modernization requirements for cranes.", deadline: "Jan 1, 2024", penalty: "Permit Revocation", status: "Enforced" },
    { name: "Local Law 126 (2021)", summary: "Periodic inspection of parking structures.", deadline: "Dec 31 (Varies by Sub-cycle)", penalty: "$1,000/month late filing", status: "Active" },
    { name: "Local Law 104 (2019)", summary: "DOB permit denial for buildings with excessive open violations.", deadline: "Enforced", penalty: "Permit Freeze", status: "Enforced" }
  ];

  return (
    <main className="min-h-screen py-24 px-6 bg-background">
      <div className="container mx-auto max-w-6xl">
        <h1 className="text-4xl font-bold mb-6 text-foreground text-center">NYC Local Laws Tracker</h1>
        <p className="text-xl text-muted-foreground text-center mb-12">Stay compliant with upcoming DOB deadlines and avoid excessive penalties.</p>
        
        <div className="overflow-x-auto rounded-xl border border-border shadow-sm">
          <table className="w-full text-left border-collapse bg-card">
            <thead>
              <tr className="bg-secondary text-secondary-foreground text-sm uppercase tracking-wider">
                <th className="p-4 font-semibold border-b border-border">Law / Regulation</th>
                <th className="p-4 font-semibold border-b border-border">Summary of Requirement</th>
                <th className="p-4 font-semibold border-b border-border">Compliance Deadline</th>
                <th className="p-4 font-semibold border-b border-border">Potential Penalty</th>
                <th className="p-4 font-semibold border-b border-border text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {laws.map((law, idx) => (
                <tr key={idx} className="hover:bg-accent/5 transition-colors">
                  <td className="p-4 font-medium text-foreground whitespace-nowrap">{law.name}</td>
                  <td className="p-4 text-muted-foreground text-sm">{law.summary}</td>
                  <td className="p-4 text-sm font-semibold">{law.deadline}</td>
                  <td className="p-4 text-sm text-destructive">{law.penalty}</td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${
                      law.status === 'Enforced' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                      law.status === 'Approaching' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                      'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                      {law.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
