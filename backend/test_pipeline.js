const { CompliancePipeline } = require('./src/services/compliance.service');
const path = require('path');
require('dotenv').config();

async function testPipeline() {
  try {
    const p = path.resolve(__dirname, 'uploads/1774786408812-real_estate_plan.pdf');
    // We need a test.jpg file in uploads to run this
    console.log("Running pipeline on:", p);
    const result = await CompliancePipeline.run('test-plan-id', p, 'image/jpeg');
    console.log("PIPELINE RESULT:", JSON.stringify(result, null, 2));
  } catch (e) {
    console.error("PIPELINE ERROR:", e);
  }
}

testPipeline();
