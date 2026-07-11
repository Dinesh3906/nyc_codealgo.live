from typing import Dict, Any, List, Set

class OntologyEngine:
    """
    Manages mappings, abbreviations, and synonym resolutions to translate
    unstructured query terms to code book references and chapters.
    """

    # Concept Dictionary
    # Concept -> {synonyms: list, discipline: str, code_book: str, chapter: str}
    CONCEPT_ONTOLOGY = {
        "egress": {
            "synonyms": ["exit", "travel path", "walking path", "corridor", "dead end"],
            "discipline": "Architectural",
            "code_book": "Building Code",
            "chapter": "Chapter 10"
        },
        "stair": {
            "synonyms": ["stairway", "riser", "tread", "flight", "handrail"],
            "discipline": "Architectural",
            "code_book": "Building Code",
            "chapter": "Chapter 10"
        },
        "toilet": {
            "synonyms": ["wc", "water closet", "restroom", "lavatory", "bathroom"],
            "discipline": "Plumbing",
            "code_book": "Plumbing Code",
            "chapter": "Chapter 4"
        },
        "sprinkler": {
            "synonyms": ["fire suppression", "standpipe", "nozzle"],
            "discipline": "Fire Protection",
            "code_book": "Fire Code",
            "chapter": "Chapter 9"
        },
        "smoke detector": {
            "synonyms": ["sd", "fire alarm", "detector", "sensor"],
            "discipline": "Fire Protection",
            "code_book": "Fire Code",
            "chapter": "Chapter 9"
        },
        "wheelchair": {
            "synonyms": ["ada", "accessibility", "clearance", "turning radius", "barrier free"],
            "discipline": "Accessibility",
            "code_book": "Building Code",
            "chapter": "Chapter 11"
        },
        "ramp": {
            "synonyms": ["slope", "incline", "ada ramp"],
            "discipline": "Accessibility",
            "code_book": "Building Code",
            "chapter": "Chapter 11"
        },
        "ventilation": {
            "synonyms": ["hvac", "exhaust", "duct", "diffuser", "intake"],
            "discipline": "Mechanical",
            "code_book": "Mechanical Code",
            "chapter": "Chapter 4"
        }
    }

    def resolve_concept(self, term: str) -> Dict[str, Any]:
        """
        Translates a raw keyword term to its mapped ontology concept details.
        Matches exact concept keys or any of their listed synonyms.
        """
        term_lower = term.lower().strip()
        
        # Check direct match
        if term_lower in self.CONCEPT_ONTOLOGY:
            return self.CONCEPT_ONTOLOGY[term_lower]

        # Check synonym match
        for concept, details in self.CONCEPT_ONTOLOGY.items():
            if term_lower in details["synonyms"]:
                return details
            # Check partial substring matches
            for syn in details["synonyms"]:
                if syn in term_lower or term_lower in syn:
                    return details
            if concept in term_lower or term_lower in concept:
                return details

        return {}

    def extract_applicable_scope(self, keywords: List[str]) -> Dict[str, Set[str]]:
        """
        Processes a list of query keywords and accumulates matching code books,
        chapters, and disciplines.
        """
        codes = set()
        chapters = set()
        disciplines = set()

        for kw in keywords:
            resolved = self.resolve_concept(kw)
            if resolved:
                codes.add(resolved["code_book"])
                chapters.add(resolved["chapter"])
                disciplines.add(resolved["discipline"])

        return {
            "codes": codes,
            "chapters": chapters,
            "disciplines": disciplines
        }
