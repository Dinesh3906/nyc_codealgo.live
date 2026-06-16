require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { CompliancePipeline } = require('../src/services/compliance.service');

async function main() {
  const planId = process.argv[2] || '5fbf2ad1-b1fd-4a10-9e50-c0f9c5683359';
  const customFile = process.argv[3];
  
  const sourcePdf = customFile 
    ? path.resolve(customFile) 
    : path.resolve(__dirname, '../pdfs/2022BC_Chapter13_EnergyWBwm.pdf');
    
  const destPdf = path.resolve(__dirname, `../uploads/temp_re_audit_${planId}.pdf`);

  console.log('Using Plan ID:', planId);
  console.log('Source PDF:', sourcePdf);
  console.log('Destination PDF:', destPdf);
  
  if (!fs.existsSync(sourcePdf)) {
    console.error('Source PDF does not exist:', sourcePdf);
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(destPdf), { recursive: true });
  fs.copyFileSync(sourcePdf, destPdf);

  console.log('Running compliance pipeline...');
  const result = await CompliancePipeline.run(planId, destPdf, 'application/pdf');
  console.log('Finished. Score:', result.score);
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error during re-audit:', err);
  process.exit(1);
});
