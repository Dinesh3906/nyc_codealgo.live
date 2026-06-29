require('dotenv').config();
const { CompliancePipeline } = require('../src/services/compliance.service');
const fs = require('fs');
const path = require('path');

async function runSunsetIsland() {
  console.log("🚀 Starting Compliance Audit on Sunset Island Homes...");
  const planPath = "C:/Users/chala/Downloads/floor_plan.pdf";
  const planId = "sunset-island-" + Date.now();

  try {
    const start = Date.now();
    const result = await CompliancePipeline.run(planId, planPath, 'application/pdf');
    const duration = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`\n✅ Audit finished successfully in ${duration}s!`);
    
    // Save report
    const outputPath = path.resolve(__dirname, 'sunset_island_report.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`📄 Saved audit report to: ${outputPath}`);
  } catch (error) {
    console.error("❌ Pipeline failed:", error);
  }
}

runSunsetIsland();
