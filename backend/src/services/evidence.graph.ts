export interface EvidenceNode {
  drawing_element: string;
  detected_object: string;
  measurement: string | number;
  code_section: string;
  rule_evaluation: string;
  gemini_reasoning?: string;
  verdict: string;
}

export class EvidenceGraph {
  /**
   * Generates a traceable evidence graph path node linking the code violation to drawings parameters.
   */
  static buildNode(
    code: string,
    facts: any,
    ruleResult?: any,
    reasoning?: string
  ): EvidenceNode {
    let drawingElement = "RAG Architectural Detail Plan Sheets";
    let detectedObject = "Blueprint Annotation / Design Component";
    let measurement = "Extracted qualitatively via visual analysis";
    let ruleEval = "AI compliance verification against building code context.";

    if (code === 'BC 1009.3') {
      drawingElement = "Exit Stairways Detail Drawings";
      detectedObject = "Egress Exit Staircase";
      measurement = facts.stair_width_inches !== undefined ? `${facts.stair_width_inches} inches` : "Not specified";
      ruleEval = "Stair width must be >= 44 inches if occupant load > 50.";
    } else if (code === 'BC 1008.1.1') {
      drawingElement = "Door Clearance & Plan Openings Schedule";
      detectedObject = "Egress Corridor Door";
      measurement = facts.door_clear_width_inches !== undefined ? `${facts.door_clear_width_inches} inches` : "Not specified";
      ruleEval = "Door clear width must be >= 32 inches.";
    } else if (code === 'BC 1208.2') {
      drawingElement = "Building Section Heights Schedule";
      detectedObject = "Habitable Room Ceilings";
      measurement = facts.ceiling_height_inches !== undefined ? `${facts.ceiling_height_inches} inches` : "Not specified";
      ruleEval = "Habitable ceiling height must be >= 90 inches.";
    } else if (code === 'BC 1208.3') {
      drawingElement = "Habitable Rooms Dimensions Schedule";
      detectedObject = "Habitable Bedroom / Living Space";
      measurement = facts.room_dimensions_feet ? `${facts.room_dimensions_feet.join('x')} feet` : "Not specified";
      ruleEval = "Plan dimensions must be >= 7 feet.";
    } else if (code === 'BC 1006.2.1') {
      drawingElement = "Plan Egress & Exits Schedule";
      detectedObject = "Exit Stairs Count";
      measurement = facts.exit_stairs_count !== undefined ? `${facts.exit_stairs_count} exits` : "Not specified";
      ruleEval = "Minimum 3 exits required for load 501-1000, 4 exits for load > 1000.";
    } else if (code === 'PC 405.3.1') {
      drawingElement = "Bathroom Plumbing Fixtures Detail";
      detectedObject = "Water Closet Toilet";
      measurement = facts.water_closet_spacing_inches !== undefined ? `${facts.water_closet_spacing_inches} inches` : "Not specified";
      ruleEval = "WC clearance must be >= 15 inches from center to wall.";
    } else if (code === 'EC 110.26') {
      drawingElement = "Electrical Room Panel Clear Workspace";
      detectedObject = "Electrical Distribution Panel Workspace";
      measurement = facts.panel_clearance_inches !== undefined ? `${facts.panel_clearance_inches} inches` : "Not specified";
      ruleEval = "Clear working space depth must be >= 36 inches.";
    } else if (code === 'EC 220.1') {
      drawingElement = "Electrical Single-Line Diagram / Schedule";
      detectedObject = "Service Transformer & Feeders";
      measurement = facts.transformer_kva !== undefined ? `${facts.transformer_kva} kVA (Planned: ${facts.planned_electrical_load_kva || 0} kVA)` : "Not specified";
      ruleEval = "Transformer capacity must be >= planned electrical load.";
    } else if (code === 'ZR 23-14') {
      drawingElement = "Zoning Resolution Analysis Schedule";
      detectedObject = "Gross Floor Area & Lot Area";
      measurement = facts.gross_floor_area_sqft !== undefined ? `GFA: ${facts.gross_floor_area_sqft} sqft, Lot: ${facts.lot_area_sqft || 0} sqft` : "Not specified";
      ruleEval = "Floor Area Ratio must be <= allowable FAR.";
    } else if (code === 'ZR 23-22') {
      drawingElement = "Zoning Analysis Residential Schedule";
      detectedObject = "Residential Dwelling Units count";
      measurement = facts.dwelling_units_count !== undefined ? `${facts.dwelling_units_count} units (Allowed: ${facts.allowable_dwelling_units_limit || 0})` : "Not specified";
      ruleEval = "Dwelling units count must be <= allowable zoning density limit.";
    }

    return {
      drawing_element: drawingElement,
      detected_object: detectedObject,
      measurement: measurement,
      code_section: code,
      rule_evaluation: ruleEval,
      gemini_reasoning: reasoning || undefined,
      verdict: ruleResult ? ruleResult.verdict : 'compliant'
    };
  }
}
