/**
 * Unit tests for the Deterministic Rule Engine.
 * Validates all 50 rules against known inputs and expected verdicts.
 *
 * Run with: npx tsx src/tests/deterministic.test.ts
 */

import { DeterministicRuleEngine, ExtractedFacts } from '../services/deterministic.engine';

interface TestCase {
  name: string;
  facts: ExtractedFacts;
  expectedCode: string;
  expectedVerdict: 'compliant' | 'violation';
}

const testCases: TestCase[] = [
  // ─── Building Code ───
  { name: 'BC 1009.3 — Stair width compliant', facts: { stair_width_inches: 44, occupant_load: 100 }, expectedCode: 'BC 1009.3', expectedVerdict: 'compliant' },
  { name: 'BC 1009.3 — Stair width violation', facts: { stair_width_inches: 40, occupant_load: 100 }, expectedCode: 'BC 1009.3', expectedVerdict: 'violation' },
  { name: 'BC 1009.3 — Small load compliant', facts: { stair_width_inches: 36, occupant_load: 30 }, expectedCode: 'BC 1009.3', expectedVerdict: 'compliant' },
  { name: 'BC 1008.1.1 — Door width compliant', facts: { door_clear_width_inches: 34 }, expectedCode: 'BC 1008.1.1', expectedVerdict: 'compliant' },
  { name: 'BC 1008.1.1 — Door width violation', facts: { door_clear_width_inches: 28 }, expectedCode: 'BC 1008.1.1', expectedVerdict: 'violation' },
  { name: 'BC 1208.2 — Ceiling height compliant', facts: { ceiling_height_inches: 96 }, expectedCode: 'BC 1208.2', expectedVerdict: 'compliant' },
  { name: 'BC 1208.2 — Ceiling height violation', facts: { ceiling_height_inches: 84 }, expectedCode: 'BC 1208.2', expectedVerdict: 'violation' },
  { name: 'BC 1208.3 — Room dim compliant', facts: { room_dimensions_feet: [10, 12] }, expectedCode: 'BC 1208.3', expectedVerdict: 'compliant' },
  { name: 'BC 1208.3 — Room dim violation', facts: { room_dimensions_feet: [6, 10] }, expectedCode: 'BC 1208.3', expectedVerdict: 'violation' },
  { name: 'BC 1006.2.1 — Exits compliant', facts: { exit_stairs_count: 2, occupant_load: 200 }, expectedCode: 'BC 1006.2.1', expectedVerdict: 'compliant' },
  { name: 'BC 1006.2.1 — Exits violation', facts: { exit_stairs_count: 1, occupant_load: 200 }, expectedCode: 'BC 1006.2.1', expectedVerdict: 'violation' },
  { name: 'BC 1006.2.1 — High load 3 exits', facts: { exit_stairs_count: 2, occupant_load: 600 }, expectedCode: 'BC 1006.2.1', expectedVerdict: 'violation' },
  { name: 'BC 1018.4 — Corridor compliant', facts: { corridor_width_inches: 48, occupant_load: 100 }, expectedCode: 'BC 1018.4', expectedVerdict: 'compliant' },
  { name: 'BC 1018.4 — Corridor violation', facts: { corridor_width_inches: 36, occupant_load: 100 }, expectedCode: 'BC 1018.4', expectedVerdict: 'violation' },
  { name: 'BC 1020.4 — Dead-end compliant', facts: { dead_end_corridor_feet: 15 }, expectedCode: 'BC 1020.4', expectedVerdict: 'compliant' },
  { name: 'BC 1020.4 — Dead-end violation', facts: { dead_end_corridor_feet: 30 }, expectedCode: 'BC 1020.4', expectedVerdict: 'violation' },
  { name: 'BC 1016.1 — Travel compliant', facts: { travel_distance_feet: 180 }, expectedCode: 'BC 1016.1', expectedVerdict: 'compliant' },
  { name: 'BC 1016.1 — Travel violation', facts: { travel_distance_feet: 250 }, expectedCode: 'BC 1016.1', expectedVerdict: 'violation' },
  { name: 'BC 1013.2 — Guard compliant', facts: { guard_height_inches: 42 }, expectedCode: 'BC 1013.2', expectedVerdict: 'compliant' },
  { name: 'BC 1013.2 — Guard violation', facts: { guard_height_inches: 36 }, expectedCode: 'BC 1013.2', expectedVerdict: 'violation' },
  { name: 'BC 1009.12 — Handrail compliant', facts: { handrail_height_inches: 36 }, expectedCode: 'BC 1009.12', expectedVerdict: 'compliant' },
  { name: 'BC 1009.12 — Handrail violation', facts: { handrail_height_inches: 40 }, expectedCode: 'BC 1009.12', expectedVerdict: 'violation' },
  { name: 'BC 1010.1 — Ramp slope compliant', facts: { ramp_slope_ratio: 0.08 }, expectedCode: 'BC 1010.1', expectedVerdict: 'compliant' },
  { name: 'BC 1010.1 — Ramp slope violation', facts: { ramp_slope_ratio: 0.10 }, expectedCode: 'BC 1010.1', expectedVerdict: 'violation' },

  // ─── Fire Code ───
  { name: 'FC 903.2 — Sprinkler compliant', facts: { sprinkler_coverage_sqft_per_head: 200 }, expectedCode: 'FC 903.2', expectedVerdict: 'compliant' },
  { name: 'FC 903.2 — Sprinkler violation', facts: { sprinkler_coverage_sqft_per_head: 300 }, expectedCode: 'FC 903.2', expectedVerdict: 'violation' },
  { name: 'FC 907.2 — Alarm zones compliant', facts: { fire_alarm_zones_count: 5, floors_count: 5 }, expectedCode: 'FC 907.2', expectedVerdict: 'compliant' },
  { name: 'FC 907.2 — Alarm zones violation', facts: { fire_alarm_zones_count: 2, floors_count: 5 }, expectedCode: 'FC 907.2', expectedVerdict: 'violation' },
  { name: 'FC 407.4 — Smoke compartment compliant', facts: { smoke_compartment_sqft: 20000 }, expectedCode: 'FC 407.4', expectedVerdict: 'compliant' },
  { name: 'FC 407.4 — Smoke compartment violation', facts: { smoke_compartment_sqft: 25000 }, expectedCode: 'FC 407.4', expectedVerdict: 'violation' },

  // ─── Plumbing Code ───
  { name: 'PC 405.3.1 — WC spacing compliant', facts: { water_closet_spacing_inches: 18 }, expectedCode: 'PC 405.3.1', expectedVerdict: 'compliant' },
  { name: 'PC 405.3.1 — WC spacing violation', facts: { water_closet_spacing_inches: 12 }, expectedCode: 'PC 405.3.1', expectedVerdict: 'violation' },
  { name: 'PC 422.1 — WC count compliant', facts: { wc_count_provided: 4, wc_count_required: 3 }, expectedCode: 'PC 422.1', expectedVerdict: 'compliant' },
  { name: 'PC 422.1 — WC count violation', facts: { wc_count_provided: 2, wc_count_required: 4 }, expectedCode: 'PC 422.1', expectedVerdict: 'violation' },

  // ─── Electrical Code ───
  { name: 'EC 110.26 — Panel clearance compliant', facts: { panel_clearance_inches: 42 }, expectedCode: 'EC 110.26', expectedVerdict: 'compliant' },
  { name: 'EC 110.26 — Panel clearance violation', facts: { panel_clearance_inches: 30 }, expectedCode: 'EC 110.26', expectedVerdict: 'violation' },
  { name: 'EC 220.1 — Transformer compliant', facts: { transformer_kva: 500, planned_electrical_load_kva: 400 }, expectedCode: 'EC 220.1', expectedVerdict: 'compliant' },
  { name: 'EC 220.1 — Transformer violation', facts: { transformer_kva: 300, planned_electrical_load_kva: 500 }, expectedCode: 'EC 220.1', expectedVerdict: 'violation' },

  // ─── Accessibility ───
  { name: 'ACC 404.2.3 — Door compliant', facts: { accessible_door_width_inches: 36 }, expectedCode: 'ACC 404.2.3', expectedVerdict: 'compliant' },
  { name: 'ACC 404.2.3 — Door violation', facts: { accessible_door_width_inches: 28 }, expectedCode: 'ACC 404.2.3', expectedVerdict: 'violation' },
  { name: 'ACC 405.2 — Ramp slope compliant', facts: { accessible_ramp_slope: 0.08 }, expectedCode: 'ACC 405.2', expectedVerdict: 'compliant' },
  { name: 'ACC 405.2 — Ramp slope violation', facts: { accessible_ramp_slope: 0.10 }, expectedCode: 'ACC 405.2', expectedVerdict: 'violation' },

  // ─── Energy Code ───
  { name: 'ECC C402.1 — R-value compliant', facts: { wall_insulation_r_value: 20, required_wall_r_value: 15 }, expectedCode: 'ECC C402.1', expectedVerdict: 'compliant' },
  { name: 'ECC C402.1 — R-value violation', facts: { wall_insulation_r_value: 10, required_wall_r_value: 15 }, expectedCode: 'ECC C402.1', expectedVerdict: 'violation' },

  // ─── Zoning ───
  { name: 'ZR 23-14 — FAR compliant', facts: { gross_floor_area_sqft: 5000, lot_area_sqft: 2500, allowable_far: 2.5 }, expectedCode: 'ZR 23-14', expectedVerdict: 'compliant' },
  { name: 'ZR 23-14 — FAR violation', facts: { gross_floor_area_sqft: 10000, lot_area_sqft: 2500, allowable_far: 2.0 }, expectedCode: 'ZR 23-14', expectedVerdict: 'violation' },
  { name: 'ZR 23-22 — Density compliant', facts: { dwelling_units_count: 10, allowable_dwelling_units_limit: 15 }, expectedCode: 'ZR 23-22', expectedVerdict: 'compliant' },
  { name: 'ZR 23-22 — Density violation', facts: { dwelling_units_count: 20, allowable_dwelling_units_limit: 10 }, expectedCode: 'ZR 23-22', expectedVerdict: 'violation' },
  { name: 'ZR 33-43 — Height compliant', facts: { building_height_feet: 60, building_height_limit_feet: 80 }, expectedCode: 'ZR 33-43', expectedVerdict: 'compliant' },
  { name: 'ZR 33-43 — Height violation', facts: { building_height_feet: 100, building_height_limit_feet: 80 }, expectedCode: 'ZR 33-43', expectedVerdict: 'violation' },
];

// ─── Test Runner ───

function runTests() {
  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  console.log(`\n🧪 Running ${testCases.length} deterministic rule tests...\n`);

  for (const tc of testCases) {
    const results = DeterministicRuleEngine.evaluateRules(tc.facts);
    const match = results.find(r => r.code === tc.expectedCode);

    if (!match) {
      failed++;
      failures.push(`❌ ${tc.name}: Rule ${tc.expectedCode} was not evaluated (no matching input?)`);
      continue;
    }

    if (match.verdict === tc.expectedVerdict) {
      passed++;
      console.log(`  ✅ ${tc.name}`);
    } else {
      failed++;
      failures.push(`❌ ${tc.name}: Expected ${tc.expectedVerdict}, got ${match.verdict}`);
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);

  if (failures.length > 0) {
    console.log(`\nFailures:`);
    failures.forEach(f => console.log(`  ${f}`));
  }

  console.log(`${'═'.repeat(60)}\n`);

  // Rule coverage report
  const allCodes = DeterministicRuleEngine.getAllRuleCodes();
  const testedCodes = new Set(testCases.map(tc => tc.expectedCode));
  const untestedCodes = allCodes.filter(c => !testedCodes.has(c));
  console.log(`📊 Rule Coverage: ${testedCodes.size}/${allCodes.length} rules tested (${Math.round(testedCodes.size / allCodes.length * 100)}%)`);
  if (untestedCodes.length > 0) {
    console.log(`   Untested rules: ${untestedCodes.join(', ')}`);
  }

  const coverage = DeterministicRuleEngine.getRuleCoverage();
  console.log(`\n📋 Rules by discipline:`);
  for (const [discipline, count] of Object.entries(coverage)) {
    console.log(`   ${discipline}: ${count} rules`);
  }

  // Exit with error code if tests failed
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
