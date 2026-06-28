/**
 * Cross-Reference Relationship Graph for NYC Codes.
 * Maps and documents the dependency links and cross-citations between disciplines.
 */

export interface CodeRelation {
  sourceDiscipline: string;
  targetDiscipline: string;
  referencingSection: string;
  description: string;
}

export class CrossReferenceGraph {
  private static relationships: CodeRelation[] = [
    {
      sourceDiscipline: "building_code",
      targetDiscipline: "fire_code",
      referencingSection: "BC Chapter 9",
      description: "Automatic sprinkler systems and fire alarm systems cross-reference Fire Code (FC) guidelines."
    },
    {
      sourceDiscipline: "building_code",
      targetDiscipline: "plumbing_code",
      referencingSection: "BC Chapter 29",
      description: "Minimum plumbing fixture counts are mapped to PC Chapter 4 fixture ratios."
    },
    {
      sourceDiscipline: "building_code",
      targetDiscipline: "mechanical_code",
      referencingSection: "BC Chapter 28",
      description: "HVAC and air systems clearances cross-reference MC ventilating parameters."
    },
    {
      sourceDiscipline: "building_code",
      targetDiscipline: "energy_code",
      referencingSection: "BC Chapter 13",
      description: "Building envelope thermal parameters cross-reference Energy Conservation Code (ECC)."
    },
    {
      sourceDiscipline: "building_code",
      targetDiscipline: "electrical_code",
      referencingSection: "BC Chapter 27",
      description: "Power wiring, panels, and equipment safety standards cross-reference NYC Electrical Code (EC)."
    },
    {
      sourceDiscipline: "fire_code",
      targetDiscipline: "building_code",
      referencingSection: "FC Section 1027",
      description: "Means of egress maintenance, clearances, and locked doors map directly to BC Chapter 10 egress widths."
    },
    {
      sourceDiscipline: "mechanical_code",
      targetDiscipline: "energy_code",
      referencingSection: "MC Chapter 6",
      description: "Duct insulation and HVAC efficiency coefficients map to Energy Conservation Code envelope guidelines."
    },
    {
      sourceDiscipline: "plumbing_code",
      targetDiscipline: "building_code",
      referencingSection: "PC Chapter 4",
      description: "Fixture quantities require occupant load calculations defined in BC Chapter 10."
    }
  ];

  /**
   * Retrieves all cross-referenced disciplines for a given starting discipline.
   */
  static getCrossReferences(discipline: string): string[] {
    return this.relationships
      .filter(r => r.sourceDiscipline === discipline)
      .map(r => r.targetDiscipline);
  }

  /**
   * Returns the entire static relationship catalog.
   */
  static getRelationships(): CodeRelation[] {
    return this.relationships;
  }
}
