import 'dotenv/config';
import { CompliancePipeline } from '../src/services/compliance.service';
import path from 'path';
import fs from 'fs';

async function runMapAnalysis() {
  const planPath = "C:\\Users\\chala\\Downloads\\I-House-Maps-Public-Spaces.pdf";
  const planId = "i-house-maps-test-" + Date.now();

  console.log(`Checking if file exists at ${planPath}...`);
  if (!fs.existsSync(planPath)) {
    console.error(`ERROR: File not found at ${planPath}`);
    process.exit(1);
  }

  console.log(`Running hybrid Gemini pipeline for: ${planPath}`);
  
  try {
    const result = await CompliancePipeline.run(planId, planPath, 'application/pdf');
    console.log("\n=========================================");
    console.log("          ANALYSIS COMPLETED SUCCESSFULY!");
    console.log("=========================================");
    console.log("Compliance Score:", result.score + "%");
    console.log("Estimated API Cost:", result.metrics ? `$${result.metrics.estimatedApiCost}` : "N/A");
    console.log("Metrics:", JSON.stringify(result.metrics, null, 2));
    
    // Save JSON output to Downloads for reference
    const outJsonPath = "C:\\Users\\chala\\Downloads\\Forensic_Audit_I-House-Maps-Public-Spaces.json";
    fs.writeFileSync(outJsonPath, JSON.stringify(result, null, 2));
    console.log(`Saved audit JSON report to: ${outJsonPath}`);
  } catch (e: any) {
    console.error("ANALYSIS FAILED:", e.message || e);
    console.error("Stack trace:", e.stack);
  }
}

runMapAnalysis();
