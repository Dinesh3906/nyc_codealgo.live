from typing import Dict, Any, List
from ..config import settings

class PromptBuilder:
    """
    Assembles system context, relevant building facts, retrieved regulations,
    and output schema instructions into structured markdown prompts.
    """

    def format_building_facts(self, building_model: Dict[str, Any], query: str) -> str:
        """
        Extracts and formats building facts relevant to the query context.
        """
        if not building_model:
            return "No building facts provided."

        facts = []
        # Safely extract metrics
        metrics = building_model.get("calculated_metrics", {})
        total_load = metrics.get("total_occupant_load")
        total_area = metrics.get("total_area_sq_ft")

        if total_load:
            facts.append(f"- Project Total Occupant Load: {total_load} occupants")
        if total_area:
            facts.append(f"- Project Total Floor Area: {total_area} sq ft")

        # Parse storeys
        project = building_model.get("project", {})
        storeys = project.get("storeys", {})
        for s_id, storey in storeys.items():
            level = storey.get("level_index", 0)
            spaces = storey.get("spaces", {})
            for space_id, space in spaces.items():
                name = space.get("name", "")
                area = space.get("area_sq_feet", 0)
                load = space.get("occupant_load", 0)
                clearance = space.get("wheelchair_turning_clearance_inches", 0)
                
                # Check query topic relevance
                query_lower = query.lower()
                is_wc = "toilet" in query_lower or "wc" in query_lower or "bathroom" in query_lower
                is_stair = "stair" in query_lower or "exit" in query_lower or "egress" in query_lower

                if is_wc and ("restroom" in name.lower() or "toilet" in name.lower() or "bath" in name.lower()):
                    facts.append(f"- Space '{name}': Area {area} sq ft, WC turning clearance {clearance} inches")
                elif is_stair and ("stair" in name.lower() or "office" in name.lower() or "exit" in name.lower()):
                    facts.append(f"- Space '{name}': Area {area} sq ft, Occupant load {load} people")

        return "\n".join(facts) if facts else "No specific building metrics matched the query topic."

    def build_prompts(
        self,
        query: str,
        building_facts_summary: str,
        groups: Dict[str, List[Dict[str, Any]]],
        citations: List[Dict[str, Any]],
        template_type: str = "compliance_review"
    ) -> Dict[str, str]:
        """
        Generates system and user prompts using matching templates.
        """
        # Format evidence groups as markdown text
        evidence_str_list = []
        for g_key, items in groups.items():
            if not items:
                continue
            evidence_str_list.append(f"### {g_key.capitalize()}")
            for item in items:
                evidence_str_list.append(
                    f"- [{item['code_book']} Section {item['section']}]: {item['text']}"
                )
        evidence_groups_str = "\n".join(evidence_str_list)

        # Format citations as markdown text
        citations_str_list = []
        for cit in citations:
            citations_str_list.append(
                f"- {cit['citation_id']}: {cit['code_book']} Section {cit['section']} (Page {cit['page_number']}, File: {cit['filename']})"
            )
        citations_str = "\n".join(citations_str_list)

        # Retrieve system template
        tpl = settings.PROMPT_TEMPLATES.get(template_type, settings.PROMPT_TEMPLATES["compliance_review"])
        
        system_prompt = tpl.format(
            system_persona=settings.SYSTEM_PERSONA,
            building_facts=building_facts_summary,
            evidence_groups=evidence_groups_str,
            citations=citations_str
        )

        user_prompt = f"Perform compliance auditing for user query: '{query}'"

        return {
            "system_prompt": system_prompt,
            "user_prompt": user_prompt
        }
