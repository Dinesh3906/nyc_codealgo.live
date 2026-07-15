from typing import List, Dict, Any
from ..config import settings
from ..schemas.models import ComplianceFinding

class DeterministicRuleEngine:
    """
    Authoritative processor for quantitative engineering calculations.
    Evaluates geometry clearances, egress capacities, and dimensions against code limits.
    """

    def evaluate_building_model(
        self,
        building_model: Dict[str, Any],
        query: str
    ) -> List[ComplianceFinding]:
        """
        Scans building model storey spaces and door features.
        Runs deterministic PASS/FAIL calculations.
        """
        findings: List[ComplianceFinding] = []
        
        project = building_model.get("project", {})
        storeys = project.get("storeys", {})

        finding_counter = 1

        for storey_id, storey in storeys.items():
            spaces = storey.get("spaces", {})
            for space_id, space in spaces.items():
                name = space.get("name", "")
                space_type = space.get("space_type", "")
                
                # Check query relevance
                query_lower = query.lower()
                is_wc_query = any(w in query_lower for w in ("toilet", "wc", "bathroom", "restroom"))
                is_stair_query = any(w in query_lower for w in ("stair", "exit", "egress", "width"))

                # 1. Evaluate Wheelchair turning clearance inside Restrooms
                if is_wc_query and ("restroom" in name.lower() or "toilet" in name.lower() or "bath" in name.lower()):
                    clearance = space.get("wheelchair_turning_clearance_inches", 0)
                    required = settings.MIN_WC_TURNING_RADIUS_INCHES
                    
                    diff = clearance - required
                    decision = "PASS" if diff >= 0 else "FAIL"
                    
                    findings.append(
                        ComplianceFinding(
                            finding_id=f"FIND-{finding_counter:03d}",
                            category="accessibility",
                            component="toilet",
                            decision=decision,
                            severity="HIGH" if decision == "FAIL" else "INFO",
                            measurement="wheelchair turning radius",
                            required_value=f"{required} inches",
                            actual_value=f"{clearance} inches",
                            difference=f"{diff:+.1f} inches",
                            applicable_code_book="Building Code",
                            applicable_section="1109.2",
                            evidence=f"Turning space in Restroom {name} measures {clearance} inches.",
                            confidence=1.0,
                            explanation=(
                                f"Restroom turning clearance must be at least {required} inches "
                                f"to allow standard 360-degree wheelchair rotation."
                            ),
                            recommendation="Increase restroom dimensions if turning space measures below 60 inches."
                        )
                    )
                    finding_counter += 1

                # 2. Evaluate Doors width clearance
                doors = space.get("doors", [])
                for d in doors:
                    d_id = d.get("id", "door")
                    required = settings.MIN_DOOR_WIDTH_INCHES

                    w = d.get("width_inches")
                    if w is None:
                        findings.append(
                            ComplianceFinding(
                                finding_id=f"FIND-{finding_counter:03d}",
                                category="accessibility",
                                component="door",
                                decision="REQUIRES_HUMAN_REVIEW",
                                severity="HIGH",
                                measurement="door clear opening width",
                                required_value=f"{required} inches",
                                actual_value="not measured",
                                difference="unknown",
                                applicable_code_book="Building Code",
                                applicable_section="1105.1",
                                evidence=f"Door {d_id} in space {name} has no measured width in the drawing model.",
                                confidence=0.0,
                                explanation="Door accessibility cannot be verified without a measured clear opening width.",
                                recommendation="Extract the door clear width from a dimension string, door schedule, or verified geometry."
                            )
                        )
                        finding_counter += 1
                        continue
                    
                    diff = w - required
                    decision = "PASS" if diff >= 0 else "FAIL"
                    
                    findings.append(
                        ComplianceFinding(
                            finding_id=f"FIND-{finding_counter:03d}",
                            category="accessibility",
                            component="door",
                            decision=decision,
                            severity="HIGH" if decision == "FAIL" else "INFO",
                            measurement="door clear opening width",
                            required_value=f"{required} inches",
                            actual_value=f"{w} inches",
                            difference=f"{diff:+.1f} inches",
                            applicable_code_book="Building Code",
                            applicable_section="1105.1",
                            evidence=f"Door {d_id} in space {name} measures {w} inches.",
                            confidence=1.0,
                            explanation=f"Doors in accessible pathways must provide a clear opening width of at least {required} inches.",
                            recommendation="Replace door frame or door slab if width is below 32 inches."
                        )
                    )
                    finding_counter += 1

                # 3. Evaluate Stair exit widths (Egress rules)
                if is_stair_query and (space_type == "STAIR" or "stair" in name.lower()):
                    occ_load = space.get("occupant_load", 0)
                    width = space.get("actual_exit_width_inches")
                    
                    # Exception adjustment: if occupant load < 50, required width is 36 inches, otherwise 44
                    required = settings.MIN_STAIR_WIDTH_INCHES
                    exception_applied = False
                    if occ_load is not None and occ_load < settings.MIN_STAIR_WIDTH_EXCEPTION_LOAD:
                        required = settings.MIN_STAIR_WIDTH_EXCEPTION_INCHES
                        exception_applied = True

                    if width is None:
                        findings.append(
                            ComplianceFinding(
                                finding_id=f"FIND-{finding_counter:03d}",
                                category="egress",
                                component="stair",
                                decision="REQUIRES_HUMAN_REVIEW",
                                severity="HIGH",
                                measurement="stair width",
                                required_value=f"{required} inches" + (" (Exception for load < 50)" if exception_applied else ""),
                                actual_value="not measured",
                                difference="unknown",
                                applicable_code_book="Building Code",
                                applicable_section="1011.2",
                                evidence=f"Stair {name} has no measured aggregate exit width in the drawing model.",
                                confidence=0.0,
                                explanation="Stair egress width cannot be verified without measured exit width evidence.",
                                recommendation="Extract stair or exit width from dimension strings, schedules, or verified plan geometry."
                            )
                        )
                        finding_counter += 1
                        continue

                    diff = width - required
                    decision = "PASS" if diff >= 0 else "FAIL"
                    
                    findings.append(
                        ComplianceFinding(
                            finding_id=f"FIND-{finding_counter:03d}",
                            category="egress",
                            component="stair",
                            decision=decision,
                            severity="HIGH" if decision == "FAIL" else "INFO",
                            measurement="stair width",
                            required_value=f"{required} inches" + (" (Exception for load < 50)" if exception_applied else ""),
                            actual_value=f"{width} inches",
                            difference=f"{diff:+.1f} inches",
                            applicable_code_book="Building Code",
                            applicable_section="1011.2",
                            evidence=f"Stair {name} measures {width} inches serving occupant load of {occ_load}.",
                            confidence=1.0,
                            explanation=(
                                f"Stairways must be at least 44 inches wide. "
                                f"Exception allowed: 36 inches is compliant if the stairs serve less than 50 people."
                            ),
                            recommendation="Widen stairwell flight if actual width is less than required value."
                        )
                    )
                    finding_counter += 1

        return findings
