import assert from 'assert';
import { SchedulerService, GlobalFacts } from '../services/scheduler.service';

async function runRegressionTests() {
  console.log('🔄 Starting Global Fact Engine Precondition & Jurisdiction Regression Tests...');

  const mockPlanData = {
    housePlanText: "Sample Plan content"
  };

  const mockPlanFacts = {};
  const mockPageRoutes: any[] = [];
  const mockCacheResult = { fileUri: '', fileResourceName: '', isCached: false };
  const mockPreUploadedPages = new Map();
  const mockAdminChunks: any[] = [];
  const mockDeterministicResults: any[] = [];

  // Test Case 1: Maryland Project
  console.log('Test Case 1: Maryland project should be skipped (Not Applicable)...');
  const marylandFacts: GlobalFacts = {
    project_name: "Ocean City Single Family",
    project_address: "123 Ocean Drive",
    city: "Ocean City",
    state: "MD",
    country: "US",
    jurisdiction: "Ocean City",
    applicable_code_set: "IBC",
    document_type: "Construction Documents",
    occupancy: "R-3",
    construction_type: "V-B",
    building_height_feet: 35,
    story_count: 3,
    basement: false,
    building_use: "Residential",
    review_scope: "Building"
  };

  const mdResult = await (SchedulerService as any).executeStepAudit(
    "test-plan-md",
    "test.pdf",
    mockPlanData,
    "building_code",
    mockPageRoutes,
    mockCacheResult,
    "application/pdf",
    mockPreUploadedPages,
    mockPlanFacts,
    0.95,
    mockAdminChunks,
    mockDeterministicResults,
    marylandFacts
  );

  assert.strictEqual(mdResult.status, 'compliant', 'Maryland step should not return violations');
  assert(mdResult.summary.includes('Not Applicable'), 'Maryland step should return Not Applicable');
  assert(mdResult.summary.includes('outside NYC jurisdiction'), 'Maryland step should state jurisdiction reason');
  console.log('  ✓ Pass: Maryland project successfully skipped with "Not Applicable".');

  // Test Case 2: Florida Project
  console.log('Test Case 2: Florida project should be skipped (Not Applicable)...');
  const floridaFacts: GlobalFacts = {
    ...marylandFacts,
    city: "Miami",
    state: "FL",
    jurisdiction: "Miami-Dade"
  };

  const flResult = await (SchedulerService as any).executeStepAudit(
    "test-plan-fl",
    "test.pdf",
    mockPlanData,
    "building_code",
    mockPageRoutes,
    mockCacheResult,
    "application/pdf",
    mockPreUploadedPages,
    mockPlanFacts,
    0.95,
    mockAdminChunks,
    mockDeterministicResults,
    floridaFacts
  );

  assert.strictEqual(flResult.status, 'compliant', 'Florida step should not return violations');
  assert(flResult.summary.includes('Not Applicable'), 'Florida step should return Not Applicable');
  console.log('  ✓ Pass: Florida project successfully skipped with "Not Applicable".');

  // Test Case 3: Marketing Drawing
  console.log('Test Case 3: Marketing drawing should not receive permit violations...');
  const marketingFacts: GlobalFacts = {
    ...marylandFacts,
    city: "New York",
    state: "NY",
    jurisdiction: "NYC DOB",
    document_type: "Marketing Drawing"
  };

  const marketingResult = await (SchedulerService as any).executeStepAudit(
    "test-plan-marketing",
    "test.pdf",
    mockPlanData,
    "building_code",
    mockPageRoutes,
    mockCacheResult,
    "application/pdf",
    mockPreUploadedPages,
    mockPlanFacts,
    0.95,
    mockAdminChunks,
    mockDeterministicResults,
    marketingFacts
  );

  assert.strictEqual(marketingResult.status, 'compliant', 'Marketing drawing step should not return violations');
  assert(marketingResult.summary.includes('Not Applicable'), 'Marketing drawing step should return Not Applicable');
  assert(marketingResult.summary.includes('Marketing Drawing'), 'Marketing drawing step should state document type reason');
  console.log('  ✓ Pass: Marketing drawing successfully bypassed permit violations.');

  console.log('\n🎉 All Global Fact Engine Precondition & Jurisdiction Regression Tests passed successfully!');
}

runRegressionTests().catch(err => {
  console.error('✗ Regression tests failed:', err);
  process.exit(1);
});
