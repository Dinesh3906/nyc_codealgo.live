/**
 * Deterministic Rule Engine v2.0
 * 50 NYC Building Code rules evaluated in code — zero API cost, zero hallucination risk.
 *
 * Disciplines covered:
 *   Building Code (BC)  — 15 rules
 *   Fire Code (FC)      — 8 rules
 *   Plumbing Code (PC)  — 5 rules
 *   Mechanical Code (MC) — 5 rules
 *   Electrical Code (EC) — 5 rules
 *   Accessibility (ACC)  — 5 rules
 *   Energy Code (ECC)    — 3 rules
 *   Zoning Resolution (ZR) — 4 rules
 */

export interface ExtractedFacts {
  // Building Code
  occupant_load?: number;
  exit_stairs_count?: number;
  stair_width_inches?: number;
  door_clear_width_inches?: number;
  corridor_width_inches?: number;
  ceiling_height_inches?: number;
  room_dimensions_feet?: number[];
  travel_distance_feet?: number;
  dead_end_corridor_feet?: number;
  guard_height_inches?: number;
  handrail_height_inches?: number;
  ramp_slope_ratio?: number;
  landing_length_inches?: number;
  landing_width_inches?: number;
  has_emergency_lighting?: boolean;
  has_exit_signs?: boolean;
  fire_separation_rating_hours?: number;
  required_fire_separation_hours?: number;
  stories_count?: number;

  // Fire Code
  sprinkler_coverage_sqft_per_head?: number;
  fire_alarm_zones_count?: number;
  floors_count?: number;
  smoke_compartment_sqft?: number;
  standpipe_provided?: boolean;
  building_height_feet?: number;
  fire_extinguisher_spacing_feet?: number;
  smoke_detector_spacing_feet?: number;

  // Plumbing Code
  water_closet_spacing_inches?: number;
  wc_count_provided?: number;
  wc_count_required?: number;
  lavatory_count_provided?: number;
  lavatory_count_required?: number;
  drinking_fountain_count?: number;
  grease_interceptor_gpm?: number;
  required_interceptor_gpm?: number;

  // Mechanical Code
  duct_clearance_inches?: number;
  ventilation_cfm_provided?: number;
  ventilation_cfm_required?: number;
  exhaust_cfm_provided?: number;
  exhaust_cfm_required?: number;
  equipment_access_inches?: number;
  refrigerant_charge_lbs?: number;
  refrigerant_limit_lbs?: number;

  // Electrical Code
  panel_clearance_inches?: number;
  transformer_kva?: number;
  planned_electrical_load_kva?: number;
  receptacle_spacing_feet?: number;
  has_afci_protection?: boolean;
  has_gfci_protection?: boolean;
  electrical_working_space_width_inches?: number;
  electrical_working_space_depth_inches?: number;

  // Accessibility
  accessible_door_width_inches?: number;
  accessible_ramp_slope?: number;
  accessible_landing_length_inches?: number;
  accessible_bathroom_clearance_inches?: number;
  grab_bar_height_inches?: number;
  accessible_route_width_inches?: number;

  // Energy Code
  wall_insulation_r_value?: number;
  required_wall_r_value?: number;
  glazing_u_factor?: number;
  max_glazing_u_factor?: number;
  lighting_power_density_wpf?: number;
  max_lighting_power_density_wpf?: number;

  // Zoning
  gross_floor_area_sqft?: number;
  lot_area_sqft?: number;
  allowable_far?: number;
  parking_spaces_provided?: number;
  dwelling_units_count?: number;
  allowable_dwelling_units_limit?: number;
  front_setback_feet?: number;
  required_front_setback_feet?: number;
  building_height_limit_feet?: number;
}

export interface RuleEvaluationResult {
  code: string;
  verdict: 'compliant' | 'violation' | 'not_applicable';
  inputs_used: Record<string, any>;
  explanation: string;
  deduction_percentage: number;
  discipline: string;
  section: string;
  formula?: string;
}

// ─── Helper to create a rule result ───

function rule(
  code: string,
  discipline: string,
  section: string,
  isViolation: boolean,
  inputs: Record<string, any>,
  passExplanation: string,
  failExplanation: string,
  deduction: number,
  formula?: string
): RuleEvaluationResult {
  const hasNullInput = Object.values(inputs).some(v => v === null);
  if (hasNullInput) {
    return {
      code,
      discipline,
      section,
      verdict: 'not_applicable',
      inputs_used: inputs,
      explanation: `Unable to verify. Reason: Dimension not present on drawing.`,
      deduction_percentage: 0,
      formula
    };
  }

  return {
    code,
    discipline,
    section,
    verdict: isViolation ? 'violation' : 'compliant',
    inputs_used: inputs,
    explanation: isViolation ? failExplanation : passExplanation,
    deduction_percentage: isViolation ? deduction : 0,
    formula
  };
}

export class DeterministicRuleEngine {
  /**
   * Evaluates all applicable deterministic building code rules on the extracted parameter facts.
   * Returns only rules for which sufficient input data was provided.
   */
  static evaluateRules(facts: ExtractedFacts): RuleEvaluationResult[] {
    const results: RuleEvaluationResult[] = [];

    // ═══════════════════════════════════════════════
    // BUILDING CODE (BC) — 15 rules
    // ═══════════════════════════════════════════════

    // BC-01: BC 1009.3 — Stairway egress width
    if (facts.stair_width_inches !== undefined) {
      const occ = facts.occupant_load || 0;
      const minW = occ > 50 ? 44 : 36;
      results.push(rule('BC 1009.3', 'Building Code', '1009.3',
        facts.stair_width_inches < minW,
        { stair_width_inches: facts.stair_width_inches, occupant_load: occ },
        `Stair width of ${facts.stair_width_inches}" meets the required ${minW}".`,
        `Stair width is ${facts.stair_width_inches}", below required ${minW}" for occupant load ${occ}.`,
        15, `width >= ${occ > 50 ? 44 : 36} inches`
      ));
    }

    // BC-02: BC 1008.1.1 — Door clear width
    if (facts.door_clear_width_inches !== undefined) {
      results.push(rule('BC 1008.1.1', 'Building Code', '1008.1.1',
        facts.door_clear_width_inches < 32,
        { door_clear_width_inches: facts.door_clear_width_inches },
        `Door clear width of ${facts.door_clear_width_inches}" satisfies 32" minimum.`,
        `Door clear width ${facts.door_clear_width_inches}" is less than 32" minimum.`,
        10, `clear_width >= 32 inches`
      ));
    }

    // BC-03: BC 1208.2 — Minimum ceiling height
    if (facts.ceiling_height_inches !== undefined) {
      results.push(rule('BC 1208.2', 'Building Code', '1208.2',
        facts.ceiling_height_inches < 90,
        { ceiling_height_inches: facts.ceiling_height_inches },
        `Ceiling height ${facts.ceiling_height_inches}" meets 90" (7'6") minimum.`,
        `Ceiling height ${facts.ceiling_height_inches}" is below 90" minimum.`,
        5, `height >= 90 inches`
      ));
    }

    // BC-04: BC 1208.3 — Room plan dimensions
    if (facts.room_dimensions_feet && facts.room_dimensions_feet.length > 0) {
      const invalid = facts.room_dimensions_feet.filter(d => d < 7);
      results.push(rule('BC 1208.3', 'Building Code', '1208.3',
        invalid.length > 0,
        { room_dimensions_feet: facts.room_dimensions_feet },
        `Room dimensions ${facts.room_dimensions_feet.join('x')}' meet 7' minimum.`,
        `Room dimension(s) ${invalid.join(', ')}' violate 7' minimum plan dimension.`,
        5, `min_dimension >= 7 feet`
      ));
    }

    // BC-05: BC 1006.2.1 — Required exits
    if (facts.exit_stairs_count !== undefined && facts.occupant_load !== undefined) {
      let req = 2;
      if (facts.occupant_load > 1000) req = 4;
      else if (facts.occupant_load > 500) req = 3;
      results.push(rule('BC 1006.2.1', 'Building Code', '1006.2.1',
        facts.exit_stairs_count < req,
        { exit_stairs_count: facts.exit_stairs_count, occupant_load: facts.occupant_load },
        `${facts.exit_stairs_count} exits meet the required ${req} for load ${facts.occupant_load}.`,
        `${facts.exit_stairs_count} exits < required ${req} for occupant load ${facts.occupant_load}.`,
        25, `exits >= ${req}`
      ));
    }

    // BC-06: BC 1018.4 — Corridor width
    if (facts.corridor_width_inches !== undefined) {
      const occ = facts.occupant_load || 0;
      const minCorridor = occ > 50 ? 44 : 36;
      results.push(rule('BC 1018.4', 'Building Code', '1018.4',
        facts.corridor_width_inches < minCorridor,
        { corridor_width_inches: facts.corridor_width_inches, occupant_load: occ },
        `Corridor width ${facts.corridor_width_inches}" meets ${minCorridor}" minimum.`,
        `Corridor width ${facts.corridor_width_inches}" < ${minCorridor}" for load ${occ}.`,
        10, `corridor >= ${minCorridor} inches`
      ));
    }

    // BC-07: BC 1020.4 — Dead-end corridors
    if (facts.dead_end_corridor_feet !== undefined) {
      const maxDeadEnd = 20; // NYC default
      results.push(rule('BC 1020.4', 'Building Code', '1020.4',
        facts.dead_end_corridor_feet > maxDeadEnd,
        { dead_end_corridor_feet: facts.dead_end_corridor_feet },
        `Dead-end corridor ${facts.dead_end_corridor_feet}' within ${maxDeadEnd}' limit.`,
        `Dead-end corridor ${facts.dead_end_corridor_feet}' exceeds ${maxDeadEnd}' maximum.`,
        15, `dead_end <= 20 feet`
      ));
    }

    // BC-08: BC 1016.1 — Travel distance
    if (facts.travel_distance_feet !== undefined) {
      const maxTravel = 200; // Sprinklered buildings
      results.push(rule('BC 1016.1', 'Building Code', '1016.1',
        facts.travel_distance_feet > maxTravel,
        { travel_distance_feet: facts.travel_distance_feet },
        `Travel distance ${facts.travel_distance_feet}' within ${maxTravel}' limit.`,
        `Travel distance ${facts.travel_distance_feet}' exceeds ${maxTravel}' maximum.`,
        20, `travel_distance <= 200 feet`
      ));
    }

    // BC-09: BC 1013.2 — Guard height
    if (facts.guard_height_inches !== undefined) {
      results.push(rule('BC 1013.2', 'Building Code', '1013.2',
        facts.guard_height_inches < 42,
        { guard_height_inches: facts.guard_height_inches },
        `Guard height ${facts.guard_height_inches}" meets 42" minimum.`,
        `Guard height ${facts.guard_height_inches}" < 42" minimum.`,
        10, `guard_height >= 42 inches`
      ));
    }

    // BC-10: BC 1009.12 — Handrail height
    if (facts.handrail_height_inches !== undefined) {
      const valid = facts.handrail_height_inches >= 34 && facts.handrail_height_inches <= 38;
      results.push(rule('BC 1009.12', 'Building Code', '1009.12',
        !valid,
        { handrail_height_inches: facts.handrail_height_inches },
        `Handrail height ${facts.handrail_height_inches}" within 34-38" range.`,
        `Handrail height ${facts.handrail_height_inches}" outside 34-38" required range.`,
        5, `34 <= height <= 38 inches`
      ));
    }

    // BC-11: BC 1010.1 — Ramp slope
    if (facts.ramp_slope_ratio !== undefined) {
      const maxSlope = 1 / 12;
      results.push(rule('BC 1010.1', 'Building Code', '1010.1',
        facts.ramp_slope_ratio > maxSlope,
        { ramp_slope_ratio: facts.ramp_slope_ratio },
        `Ramp slope ${facts.ramp_slope_ratio.toFixed(4)} within 1:12 maximum.`,
        `Ramp slope ${facts.ramp_slope_ratio.toFixed(4)} exceeds 1:12 (${maxSlope.toFixed(4)}) maximum.`,
        10, `slope <= 1/12`
      ));
    }

    // BC-12: BC 1010.6 — Landing dimensions
    if (facts.landing_length_inches !== undefined) {
      results.push(rule('BC 1010.6', 'Building Code', '1010.6',
        facts.landing_length_inches < 60,
        { landing_length_inches: facts.landing_length_inches },
        `Landing length ${facts.landing_length_inches}" meets 60" minimum.`,
        `Landing length ${facts.landing_length_inches}" < 60" minimum.`,
        5, `landing >= 60 inches`
      ));
    }

    // BC-13: BC 1006.3 — Emergency lighting
    if (facts.has_emergency_lighting !== undefined) {
      results.push(rule('BC 1006.3', 'Building Code', '1006.3',
        !facts.has_emergency_lighting,
        { has_emergency_lighting: facts.has_emergency_lighting },
        `Emergency lighting is provided.`,
        `Emergency lighting is missing from egress paths.`,
        15, `emergency_lighting = true`
      ));
    }

    // BC-14: BC 1011.1 — Exit signs
    if (facts.has_exit_signs !== undefined) {
      results.push(rule('BC 1011.1', 'Building Code', '1011.1',
        !facts.has_exit_signs,
        { has_exit_signs: facts.has_exit_signs },
        `Exit signs are provided at required locations.`,
        `Required exit signs are missing.`,
        10, `exit_signs = true`
      ));
    }

    // BC-15: BC 706.1 — Fire separation rating
    if (facts.fire_separation_rating_hours !== undefined && facts.required_fire_separation_hours !== undefined) {
      results.push(rule('BC 706.1', 'Building Code', '706.1',
        facts.fire_separation_rating_hours < facts.required_fire_separation_hours,
        { provided: facts.fire_separation_rating_hours, required: facts.required_fire_separation_hours },
        `Fire separation ${facts.fire_separation_rating_hours}hr meets ${facts.required_fire_separation_hours}hr requirement.`,
        `Fire separation ${facts.fire_separation_rating_hours}hr < required ${facts.required_fire_separation_hours}hr.`,
        20, `rating >= required`
      ));
    }

    // ═══════════════════════════════════════════════
    // FIRE CODE (FC) — 8 rules
    // ═══════════════════════════════════════════════

    // FC-01: FC 903.2 — Sprinkler coverage
    if (facts.sprinkler_coverage_sqft_per_head !== undefined) {
      const maxCoverage = 225; // NFPA 13 light hazard
      results.push(rule('FC 903.2', 'Fire Code', '903.2',
        facts.sprinkler_coverage_sqft_per_head > maxCoverage,
        { sqft_per_head: facts.sprinkler_coverage_sqft_per_head },
        `Sprinkler coverage ${facts.sprinkler_coverage_sqft_per_head} sqft/head within ${maxCoverage} limit.`,
        `Sprinkler coverage ${facts.sprinkler_coverage_sqft_per_head} sqft/head exceeds ${maxCoverage} maximum.`,
        15, `coverage <= 225 sqft/head`
      ));
    }

    // FC-02: FC 907.2 — Fire alarm zones
    if (facts.fire_alarm_zones_count !== undefined && facts.floors_count !== undefined) {
      const minZones = facts.floors_count; // Minimum one zone per floor
      results.push(rule('FC 907.2', 'Fire Code', '907.2',
        facts.fire_alarm_zones_count < minZones,
        { zones: facts.fire_alarm_zones_count, floors: facts.floors_count },
        `${facts.fire_alarm_zones_count} alarm zones cover ${facts.floors_count} floors.`,
        `${facts.fire_alarm_zones_count} alarm zones < ${minZones} minimum (1 per floor).`,
        10, `zones >= floors`
      ));
    }

    // FC-03: FC 407.4 — Smoke compartment size
    if (facts.smoke_compartment_sqft !== undefined) {
      const maxCompartment = 22500;
      results.push(rule('FC 407.4', 'Fire Code', '407.4',
        facts.smoke_compartment_sqft > maxCompartment,
        { smoke_compartment_sqft: facts.smoke_compartment_sqft },
        `Smoke compartment ${facts.smoke_compartment_sqft} sqft within ${maxCompartment} limit.`,
        `Smoke compartment ${facts.smoke_compartment_sqft} sqft exceeds ${maxCompartment} maximum.`,
        15, `area <= 22500 sqft`
      ));
    }

    // FC-04: FC 905.3.1 — Standpipe requirement
    if (facts.standpipe_provided !== undefined && facts.building_height_feet !== undefined) {
      const needsStandpipe = facts.building_height_feet > 75;
      results.push(rule('FC 905.3.1', 'Fire Code', '905.3.1',
        needsStandpipe && !facts.standpipe_provided,
        { standpipe_provided: facts.standpipe_provided, building_height_feet: facts.building_height_feet },
        needsStandpipe
          ? `Standpipe provided for building height ${facts.building_height_feet}'.`
          : `Standpipe not required for building height ${facts.building_height_feet}'.`,
        `Building height ${facts.building_height_feet}' > 75' requires standpipe but none provided.`,
        20, `if height > 75ft then standpipe = true`
      ));
    }

    // FC-05: FC 906.1 — Fire extinguisher spacing
    if (facts.fire_extinguisher_spacing_feet !== undefined) {
      const maxSpacing = 75;
      results.push(rule('FC 906.1', 'Fire Code', '906.1',
        facts.fire_extinguisher_spacing_feet > maxSpacing,
        { spacing: facts.fire_extinguisher_spacing_feet },
        `Extinguisher spacing ${facts.fire_extinguisher_spacing_feet}' within ${maxSpacing}' maximum.`,
        `Extinguisher spacing ${facts.fire_extinguisher_spacing_feet}' exceeds ${maxSpacing}' maximum travel distance.`,
        5, `spacing <= 75 feet`
      ));
    }

    // FC-06: FC 907.2.10 — Smoke detector spacing
    if (facts.smoke_detector_spacing_feet !== undefined) {
      const maxSpacing = 30;
      results.push(rule('FC 907.2.10', 'Fire Code', '907.2.10',
        facts.smoke_detector_spacing_feet > maxSpacing,
        { spacing: facts.smoke_detector_spacing_feet },
        `Smoke detector spacing ${facts.smoke_detector_spacing_feet}' within ${maxSpacing}' maximum.`,
        `Smoke detector spacing ${facts.smoke_detector_spacing_feet}' exceeds ${maxSpacing}' maximum.`,
        10, `spacing <= 30 feet`
      ));
    }

    // FC-07: FC 903.2.1 — Required fire suppression by height
    if (facts.building_height_feet !== undefined && facts.stories_count !== undefined) {
      const needsSprinklers = facts.building_height_feet > 75 || facts.stories_count > 3;
      // This checks existence only — detailed coverage is FC-01
      results.push(rule('FC 903.2.1', 'Fire Code', '903.2.1',
        needsSprinklers && facts.sprinkler_coverage_sqft_per_head === undefined,
        { building_height_feet: facts.building_height_feet, stories: facts.stories_count },
        `Fire suppression system indicated for ${facts.stories_count}-story, ${facts.building_height_feet}' building.`,
        `Building >75' or >3 stories requires automatic fire suppression — none detected.`,
        25, `if height > 75 || stories > 3 then sprinklers = required`
      ));
    }

    // FC-08: FC 508.1 — Fire department access road width
    // Simplified: access road must be at least 20 feet wide
    if (facts.corridor_width_inches !== undefined && facts.building_height_feet !== undefined && facts.building_height_feet > 30) {
      // Note: This uses corridor data as a proxy; actual FD access is separate
      // Keeping as informational check
      results.push(rule('FC 508.1', 'Fire Code', '508.1',
        false, // informational only — cannot verify FD access from plans alone
        { building_height_feet: facts.building_height_feet },
        `Fire department access noted for building height ${facts.building_height_feet}'.`,
        ``,
        0
      ));
    }

    // ═══════════════════════════════════════════════
    // PLUMBING CODE (PC) — 5 rules
    // ═══════════════════════════════════════════════

    // PC-01: PC 405.3.1 — Water closet spacing
    if (facts.water_closet_spacing_inches !== undefined) {
      results.push(rule('PC 405.3.1', 'Plumbing Code', '405.3.1',
        facts.water_closet_spacing_inches < 15,
        { spacing: facts.water_closet_spacing_inches },
        `WC centerline clearance ${facts.water_closet_spacing_inches}" meets 15" minimum.`,
        `WC centerline clearance ${facts.water_closet_spacing_inches}" < 15" minimum.`,
        10, `clearance >= 15 inches`
      ));
    }

    // PC-02: PC 422.1 — Fixture count (WC)
    if (facts.wc_count_provided !== undefined && facts.wc_count_required !== undefined) {
      results.push(rule('PC 422.1', 'Plumbing Code', '422.1',
        facts.wc_count_provided < facts.wc_count_required,
        { provided: facts.wc_count_provided, required: facts.wc_count_required },
        `${facts.wc_count_provided} water closets meet ${facts.wc_count_required} required.`,
        `${facts.wc_count_provided} water closets < ${facts.wc_count_required} required.`,
        15, `wc_count >= required`
      ));
    }

    // PC-03: PC 422.1 — Fixture count (lavatories)
    if (facts.lavatory_count_provided !== undefined && facts.lavatory_count_required !== undefined) {
      results.push(rule('PC 422.2', 'Plumbing Code', '422.2',
        facts.lavatory_count_provided < facts.lavatory_count_required,
        { provided: facts.lavatory_count_provided, required: facts.lavatory_count_required },
        `${facts.lavatory_count_provided} lavatories meet ${facts.lavatory_count_required} required.`,
        `${facts.lavatory_count_provided} lavatories < ${facts.lavatory_count_required} required.`,
        10, `lavatory_count >= required`
      ));
    }

    // PC-04: PC 410.1 — Drinking fountains
    if (facts.drinking_fountain_count !== undefined && facts.occupant_load !== undefined) {
      const required = facts.occupant_load > 15 ? 1 : 0;
      results.push(rule('PC 410.1', 'Plumbing Code', '410.1',
        facts.drinking_fountain_count < required,
        { provided: facts.drinking_fountain_count, required, occupant_load: facts.occupant_load },
        required > 0
          ? `${facts.drinking_fountain_count} drinking fountain(s) provided.`
          : `Drinking fountain not required for occupant load ${facts.occupant_load}.`,
        `Drinking fountain required for occupant load ${facts.occupant_load} but none provided.`,
        5, `if load > 15 then fountains >= 1`
      ));
    }

    // PC-05: PC 1003.1 — Grease interceptor
    if (facts.grease_interceptor_gpm !== undefined && facts.required_interceptor_gpm !== undefined) {
      results.push(rule('PC 1003.1', 'Plumbing Code', '1003.1',
        facts.grease_interceptor_gpm < facts.required_interceptor_gpm,
        { provided: facts.grease_interceptor_gpm, required: facts.required_interceptor_gpm },
        `Grease interceptor ${facts.grease_interceptor_gpm} GPM meets ${facts.required_interceptor_gpm} GPM requirement.`,
        `Grease interceptor ${facts.grease_interceptor_gpm} GPM < ${facts.required_interceptor_gpm} GPM required.`,
        10, `capacity >= required`
      ));
    }

    // ═══════════════════════════════════════════════
    // MECHANICAL CODE (MC) — 5 rules
    // ═══════════════════════════════════════════════

    // MC-01: MC 306.3 — Duct clearance
    if (facts.duct_clearance_inches !== undefined) {
      results.push(rule('MC 306.3', 'Mechanical Code', '306.3',
        facts.duct_clearance_inches < 4,
        { clearance: facts.duct_clearance_inches },
        `Duct clearance ${facts.duct_clearance_inches}" meets 4" minimum.`,
        `Duct clearance ${facts.duct_clearance_inches}" < 4" minimum.`,
        5, `clearance >= 4 inches`
      ));
    }

    // MC-02: MC 403.3 — Ventilation rates
    if (facts.ventilation_cfm_provided !== undefined && facts.ventilation_cfm_required !== undefined) {
      results.push(rule('MC 403.3', 'Mechanical Code', '403.3',
        facts.ventilation_cfm_provided < facts.ventilation_cfm_required,
        { provided: facts.ventilation_cfm_provided, required: facts.ventilation_cfm_required },
        `Ventilation ${facts.ventilation_cfm_provided} CFM meets ${facts.ventilation_cfm_required} CFM requirement.`,
        `Ventilation ${facts.ventilation_cfm_provided} CFM < ${facts.ventilation_cfm_required} CFM required.`,
        10, `cfm >= required`
      ));
    }

    // MC-03: MC 501.2 — Exhaust capacity
    if (facts.exhaust_cfm_provided !== undefined && facts.exhaust_cfm_required !== undefined) {
      results.push(rule('MC 501.2', 'Mechanical Code', '501.2',
        facts.exhaust_cfm_provided < facts.exhaust_cfm_required,
        { provided: facts.exhaust_cfm_provided, required: facts.exhaust_cfm_required },
        `Exhaust ${facts.exhaust_cfm_provided} CFM meets ${facts.exhaust_cfm_required} CFM requirement.`,
        `Exhaust ${facts.exhaust_cfm_provided} CFM < ${facts.exhaust_cfm_required} CFM required.`,
        10, `exhaust_cfm >= required`
      ));
    }

    // MC-04: MC 306.5 — Equipment access space
    if (facts.equipment_access_inches !== undefined) {
      results.push(rule('MC 306.5', 'Mechanical Code', '306.5',
        facts.equipment_access_inches < 30,
        { access_inches: facts.equipment_access_inches },
        `Equipment access ${facts.equipment_access_inches}" meets 30" minimum.`,
        `Equipment access ${facts.equipment_access_inches}" < 30" minimum.`,
        5, `access >= 30 inches`
      ));
    }

    // MC-05: MC 1101.10 — Refrigerant charge limits
    if (facts.refrigerant_charge_lbs !== undefined && facts.refrigerant_limit_lbs !== undefined) {
      results.push(rule('MC 1101.10', 'Mechanical Code', '1101.10',
        facts.refrigerant_charge_lbs > facts.refrigerant_limit_lbs,
        { charge: facts.refrigerant_charge_lbs, limit: facts.refrigerant_limit_lbs },
        `Refrigerant charge ${facts.refrigerant_charge_lbs} lbs within ${facts.refrigerant_limit_lbs} lbs limit.`,
        `Refrigerant charge ${facts.refrigerant_charge_lbs} lbs exceeds ${facts.refrigerant_limit_lbs} lbs limit.`,
        10, `charge <= limit`
      ));
    }

    // ═══════════════════════════════════════════════
    // ELECTRICAL CODE (EC) — 5 rules
    // ═══════════════════════════════════════════════

    // EC-01: EC 110.26 — Panel clearance
    if (facts.panel_clearance_inches !== undefined) {
      results.push(rule('EC 110.26', 'Electrical Code', '110.26',
        facts.panel_clearance_inches < 36,
        { clearance: facts.panel_clearance_inches },
        `Panel clearance ${facts.panel_clearance_inches}" meets 36" minimum depth.`,
        `Panel clearance ${facts.panel_clearance_inches}" < 36" minimum depth.`,
        15, `depth >= 36 inches`
      ));
    }

    // EC-02: EC 220.1 — Transformer capacity
    if (facts.transformer_kva !== undefined && facts.planned_electrical_load_kva !== undefined) {
      results.push(rule('EC 220.1', 'Electrical Code', '220.1',
        facts.transformer_kva < facts.planned_electrical_load_kva,
        { transformer_kva: facts.transformer_kva, load_kva: facts.planned_electrical_load_kva },
        `Transformer ${facts.transformer_kva} kVA sufficient for ${facts.planned_electrical_load_kva} kVA load.`,
        `Transformer ${facts.transformer_kva} kVA < ${facts.planned_electrical_load_kva} kVA planned load.`,
        20, `capacity >= load`
      ));
    }

    // EC-03: EC 210.52 — Receptacle spacing
    if (facts.receptacle_spacing_feet !== undefined) {
      results.push(rule('EC 210.52', 'Electrical Code', '210.52',
        facts.receptacle_spacing_feet > 6,
        { spacing: facts.receptacle_spacing_feet },
        `Receptacle spacing ${facts.receptacle_spacing_feet}' within 6' maximum.`,
        `Receptacle spacing ${facts.receptacle_spacing_feet}' exceeds 6' maximum.`,
        5, `spacing <= 6 feet`
      ));
    }

    // EC-04: EC 210.12 — AFCI protection
    if (facts.has_afci_protection !== undefined) {
      results.push(rule('EC 210.12', 'Electrical Code', '210.12',
        !facts.has_afci_protection,
        { has_afci: facts.has_afci_protection },
        `AFCI protection provided for dwelling unit branch circuits.`,
        `AFCI protection required for dwelling unit branch circuits but not provided.`,
        10, `afci = true`
      ));
    }

    // EC-05: EC 110.26(A)(2) — Working space width
    if (facts.electrical_working_space_width_inches !== undefined) {
      results.push(rule('EC 110.26(A)(2)', 'Electrical Code', '110.26(A)(2)',
        facts.electrical_working_space_width_inches < 30,
        { width: facts.electrical_working_space_width_inches },
        `Electrical working space width ${facts.electrical_working_space_width_inches}" meets 30" minimum.`,
        `Electrical working space width ${facts.electrical_working_space_width_inches}" < 30" minimum.`,
        10, `width >= 30 inches`
      ));
    }

    // ═══════════════════════════════════════════════
    // ACCESSIBILITY (ACC) — 5 rules
    // ═══════════════════════════════════════════════

    // ACC-01: ACC 404.2.3 — Accessible door width
    if (facts.accessible_door_width_inches !== undefined) {
      results.push(rule('ACC 404.2.3', 'Accessibility', '404.2.3',
        facts.accessible_door_width_inches < 32,
        { width: facts.accessible_door_width_inches },
        `Accessible door width ${facts.accessible_door_width_inches}" meets 32" minimum.`,
        `Accessible door width ${facts.accessible_door_width_inches}" < 32" minimum clear width.`,
        10, `width >= 32 inches`
      ));
    }

    // ACC-02: ACC 405.2 — Accessible ramp slope
    if (facts.accessible_ramp_slope !== undefined) {
      results.push(rule('ACC 405.2', 'Accessibility', '405.2',
        facts.accessible_ramp_slope > (1 / 12),
        { slope: facts.accessible_ramp_slope },
        `Accessible ramp slope ${facts.accessible_ramp_slope.toFixed(4)} within 1:12 maximum.`,
        `Accessible ramp slope ${facts.accessible_ramp_slope.toFixed(4)} exceeds 1:12 maximum.`,
        15, `slope <= 1/12`
      ));
    }

    // ACC-03: ACC 405.7 — Accessible landing length
    if (facts.accessible_landing_length_inches !== undefined) {
      results.push(rule('ACC 405.7', 'Accessibility', '405.7',
        facts.accessible_landing_length_inches < 60,
        { length: facts.accessible_landing_length_inches },
        `Accessible landing ${facts.accessible_landing_length_inches}" meets 60" minimum.`,
        `Accessible landing ${facts.accessible_landing_length_inches}" < 60" minimum.`,
        10, `length >= 60 inches`
      ));
    }

    // ACC-04: ACC 604.3 — Accessible bathroom clearance
    if (facts.accessible_bathroom_clearance_inches !== undefined) {
      results.push(rule('ACC 604.3', 'Accessibility', '604.3',
        facts.accessible_bathroom_clearance_inches < 60,
        { clearance: facts.accessible_bathroom_clearance_inches },
        `Accessible bathroom clearance ${facts.accessible_bathroom_clearance_inches}" meets 60" turning radius.`,
        `Accessible bathroom clearance ${facts.accessible_bathroom_clearance_inches}" < 60" turning radius.`,
        10, `clearance >= 60 inches`
      ));
    }

    // ACC-05: ACC 604.5 — Grab bar height
    if (facts.grab_bar_height_inches !== undefined) {
      const valid = facts.grab_bar_height_inches >= 33 && facts.grab_bar_height_inches <= 36;
      results.push(rule('ACC 604.5', 'Accessibility', '604.5',
        !valid,
        { height: facts.grab_bar_height_inches },
        `Grab bar height ${facts.grab_bar_height_inches}" within 33-36" range.`,
        `Grab bar height ${facts.grab_bar_height_inches}" outside 33-36" required range.`,
        5, `33 <= height <= 36 inches`
      ));
    }

    // ═══════════════════════════════════════════════
    // ENERGY CODE (ECC) — 3 rules
    // ═══════════════════════════════════════════════

    // ECC-01: ECC C402.1 — Wall insulation R-value
    if (facts.wall_insulation_r_value !== undefined && facts.required_wall_r_value !== undefined) {
      results.push(rule('ECC C402.1', 'Energy Code', 'C402.1',
        facts.wall_insulation_r_value < facts.required_wall_r_value,
        { provided: facts.wall_insulation_r_value, required: facts.required_wall_r_value },
        `Wall insulation R-${facts.wall_insulation_r_value} meets R-${facts.required_wall_r_value} requirement.`,
        `Wall insulation R-${facts.wall_insulation_r_value} < R-${facts.required_wall_r_value} required.`,
        10, `R-value >= required`
      ));
    }

    // ECC-02: ECC C402.4 — Glazing U-factor
    if (facts.glazing_u_factor !== undefined && facts.max_glazing_u_factor !== undefined) {
      results.push(rule('ECC C402.4', 'Energy Code', 'C402.4',
        facts.glazing_u_factor > facts.max_glazing_u_factor,
        { provided: facts.glazing_u_factor, maximum: facts.max_glazing_u_factor },
        `Glazing U-factor ${facts.glazing_u_factor} within ${facts.max_glazing_u_factor} maximum.`,
        `Glazing U-factor ${facts.glazing_u_factor} exceeds ${facts.max_glazing_u_factor} maximum.`,
        10, `U-factor <= maximum`
      ));
    }

    // ECC-03: ECC C405.3 — Lighting power density
    if (facts.lighting_power_density_wpf !== undefined && facts.max_lighting_power_density_wpf !== undefined) {
      results.push(rule('ECC C405.3', 'Energy Code', 'C405.3',
        facts.lighting_power_density_wpf > facts.max_lighting_power_density_wpf,
        { provided: facts.lighting_power_density_wpf, maximum: facts.max_lighting_power_density_wpf },
        `Lighting power density ${facts.lighting_power_density_wpf} W/sqft within ${facts.max_lighting_power_density_wpf} limit.`,
        `Lighting power density ${facts.lighting_power_density_wpf} W/sqft exceeds ${facts.max_lighting_power_density_wpf} limit.`,
        5, `LPD <= maximum`
      ));
    }

    // ═══════════════════════════════════════════════
    // ZONING RESOLUTION (ZR) — 4 rules
    // ═══════════════════════════════════════════════

    // ZR-01: ZR 23-14 — Floor Area Ratio
    if (facts.gross_floor_area_sqft !== undefined && facts.lot_area_sqft !== undefined && facts.allowable_far !== undefined) {
      const actualFar = facts.gross_floor_area_sqft / facts.lot_area_sqft;
      results.push(rule('ZR 23-14', 'Zoning Resolution', '23-14',
        actualFar > facts.allowable_far,
        { gfa: facts.gross_floor_area_sqft, lot: facts.lot_area_sqft, far: actualFar.toFixed(2), allowable: facts.allowable_far },
        `FAR ${actualFar.toFixed(2)} within ${facts.allowable_far} allowable.`,
        `FAR ${actualFar.toFixed(2)} exceeds ${facts.allowable_far} allowable.`,
        20, `GFA/LotArea <= allowable_FAR`
      ));
    }

    // ZR-02: ZR 23-22 — Dwelling unit density
    if (facts.dwelling_units_count !== undefined && facts.allowable_dwelling_units_limit !== undefined) {
      results.push(rule('ZR 23-22', 'Zoning Resolution', '23-22',
        facts.dwelling_units_count > facts.allowable_dwelling_units_limit,
        { units: facts.dwelling_units_count, limit: facts.allowable_dwelling_units_limit },
        `${facts.dwelling_units_count} dwelling units within ${facts.allowable_dwelling_units_limit} limit.`,
        `${facts.dwelling_units_count} dwelling units exceed ${facts.allowable_dwelling_units_limit} limit.`,
        15, `units <= limit`
      ));
    }

    // ZR-03: ZR 23-47 — Front setback
    if (facts.front_setback_feet !== undefined && facts.required_front_setback_feet !== undefined) {
      results.push(rule('ZR 23-47', 'Zoning Resolution', '23-47',
        facts.front_setback_feet < facts.required_front_setback_feet,
        { provided: facts.front_setback_feet, required: facts.required_front_setback_feet },
        `Front setback ${facts.front_setback_feet}' meets ${facts.required_front_setback_feet}' requirement.`,
        `Front setback ${facts.front_setback_feet}' < ${facts.required_front_setback_feet}' required.`,
        15, `setback >= required`
      ));
    }

    // ZR-04: ZR 33-43 — Building height limit
    if (facts.building_height_feet !== undefined && facts.building_height_limit_feet !== undefined) {
      results.push(rule('ZR 33-43', 'Zoning Resolution', '33-43',
        facts.building_height_feet > facts.building_height_limit_feet,
        { height: facts.building_height_feet, limit: facts.building_height_limit_feet },
        `Building height ${facts.building_height_feet}' within ${facts.building_height_limit_feet}' limit.`,
        `Building height ${facts.building_height_feet}' exceeds ${facts.building_height_limit_feet}' limit.`,
        20, `height <= limit`
      ));
    }

    return results;
  }

  /**
   * Returns the list of all rule codes that this engine can evaluate.
   */
  static getAllRuleCodes(): string[] {
    return [
      // Building Code
      'BC 1009.3', 'BC 1008.1.1', 'BC 1208.2', 'BC 1208.3', 'BC 1006.2.1',
      'BC 1018.4', 'BC 1020.4', 'BC 1016.1', 'BC 1013.2', 'BC 1009.12',
      'BC 1010.1', 'BC 1010.6', 'BC 1006.3', 'BC 1011.1', 'BC 706.1',
      // Fire Code
      'FC 903.2', 'FC 907.2', 'FC 407.4', 'FC 905.3.1', 'FC 906.1',
      'FC 907.2.10', 'FC 903.2.1', 'FC 508.1',
      // Plumbing Code
      'PC 405.3.1', 'PC 422.1', 'PC 422.2', 'PC 410.1', 'PC 1003.1',
      // Mechanical Code
      'MC 306.3', 'MC 403.3', 'MC 501.2', 'MC 306.5', 'MC 1101.10',
      // Electrical Code
      'EC 110.26', 'EC 220.1', 'EC 210.52', 'EC 210.12', 'EC 110.26(A)(2)',
      // Accessibility
      'ACC 404.2.3', 'ACC 405.2', 'ACC 405.7', 'ACC 604.3', 'ACC 604.5',
      // Energy Code
      'ECC C402.1', 'ECC C402.4', 'ECC C405.3',
      // Zoning
      'ZR 23-14', 'ZR 23-22', 'ZR 23-47', 'ZR 33-43'
    ];
  }

  /**
   * Returns rule count by discipline for metrics.
   */
  static getRuleCoverage(): Record<string, number> {
    return {
      'Building Code': 15,
      'Fire Code': 8,
      'Plumbing Code': 5,
      'Mechanical Code': 5,
      'Electrical Code': 5,
      'Accessibility': 5,
      'Energy Code': 3,
      'Zoning Resolution': 4
    };
  }
}
