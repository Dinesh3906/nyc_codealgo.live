require('dotenv').config();
const { CompliancePipeline } = require('./src/services/compliance.service');
const path = require('path');

async function testPipeline() {
  try {
    const p = path.resolve(__dirname, 'uploads/test_plan.pdf');
    // We need a test.jpg file in uploads to run this
    console.log("Running pipeline on:", p);
    const result = await CompliancePipeline.run('test-plan-id', p, 'application/pdf');
    console.log("PIPELINE RESULT:", JSON.stringify(result, null, 2));
  } catch (e) {
    console.error("PIPELINE ERROR:", e);
  }
}

testPipeline();
