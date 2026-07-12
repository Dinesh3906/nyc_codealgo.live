import re
from ..schemas.models import ParsedQuery
from ..ontology.engine import OntologyEngine

class QueryParser:
    """
    Parses natural language query strings to extract building elements,
    measurements, occupancy mentions, and regulatory parameters.
    """

    def __init__(self):
        self.ontology = OntologyEngine()

    def parse_query_string(self, query: str) -> ParsedQuery:
        """
        Tokenizes and evaluates query text to extract semantic entities.
        """
        query_lower = query.lower().strip()
        
        building_components = []
        regulatory_concepts = []
        measurements = []
        occupancy = None

        # 1. Component Extraction (Regex search)
        components_map = {
            r"\bstair(way|s)?\b": "stair",
            r"\bdoor(s)?\b": "door",
            r"\bwall(s)?\b": "wall",
            r"\bwindow(s)?\b": "window",
            r"\bcorridor(s)?\b": "corridor",
            r"\b(restroom|wc|toilet|lavatory)\b": "toilet",
            r"\bsprinkler(s)?\b": "sprinkler",
            r"\b(smoke detector|sd|fire alarm)\b": "smoke detector",
            r"\bramp(s)?\b": "ramp",
            r"\b(hvac|ventilation|diffuser)\b": "ventilation"
        }
        for pattern, comp in components_map.items():
            if re.search(pattern, query_lower):
                building_components.append(comp)

        # 2. Measurement Extraction
        measurements_map = {
            r"\bwidth\b": "width",
            r"\bheight\b": "height",
            r"\blength\b": "length",
            r"\bslope\b": "slope",
            r"\bclearance\b": "clearance",
            r"\bradius\b": "radius",
            r"\barea\b": "area",
            r"\bvolume\b": "volume",
            r"\bthickness\b": "thickness"
        }
        for pattern, meas in measurements_map.items():
            if re.search(pattern, query_lower):
                measurements.append(meas)

        # 3. Regulatory Concept Extraction
        concepts_map = {
            r"\b(egress|exit|travel path|travel distance)\b": "egress",
            r"\b(fire protection|fire suppression|fire rating|fire wall)\b": "fire protection",
            r"\b(wheelchair|ada|accessible|accessibility)\b": "accessibility",
            r"\b(occupant load|capacity|occupancy)\b": "occupancy capacity",
            r"\bdead\s*end\b": "dead end"
        }
        for pattern, conc in concepts_map.items():
            if re.search(pattern, query_lower):
                regulatory_concepts.append(conc)

        # 4. Occupancy Mention
        occupancy_map = {
            "classroom": "educational_classroom",
            "school": "educational_classroom",
            "office": "business",
            "business": "business",
            "apartment": "residential",
            "residential": "residential",
            "mercantile": "mercantile",
            "retail": "mercantile",
            "assembly": "assembly_unconcentrated"
        }
        for term, occ in occupancy_map.items():
            if term in query_lower:
                occupancy = occ
                break

        # 5. Extract Jurisdiction and Revision Year (if matched, e.g. "NYC 2022")
        jurisdiction = "NYC"
        if "nyc" in query_lower:
            jurisdiction = "NYC"
        
        revision_year = "2022"
        if match := re.search(r"\b(2014|2022|2024)\b", query_lower):
            revision_year = match.group(0)

        # Accumulate keywords for ontology book checks
        kws = building_components + regulatory_concepts
        scope = self.ontology.extract_applicable_scope(kws)
        
        resolved_discipline = list(scope["disciplines"])[0] if scope["disciplines"] else None

        return ParsedQuery(
            building_components=building_components,
            regulatory_concepts=regulatory_concepts,
            measurements=measurements,
            occupancy=occupancy,
            discipline=resolved_discipline,
            jurisdiction=jurisdiction,
            building_type=None,
            revision_year=revision_year
        )
