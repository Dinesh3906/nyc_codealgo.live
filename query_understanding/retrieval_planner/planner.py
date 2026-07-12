from typing import List, Any, Optional
from ..schemas.models import ComplianceRetrievalPlan, MetadataFilter, QueryIntent
from ..parser.query_parser import QueryParser
from ..intent.classifier import IntentClassifier
from ..ontology.engine import OntologyEngine

class ComplianceRetrievalPlanner:
    """
    Formulates a compliance retrieval plan mapping query intents and model context
    to hard filters, soft filters, and search strategies.
    """

    def __init__(self):
        self.parser = QueryParser()
        self.classifier = IntentClassifier()
        self.ontology = OntologyEngine()

    def generate_retrieval_plan(
        self,
        query: str,
        knowledge_model: Optional[Any] = None
    ) -> ComplianceRetrievalPlan:
        """
        Main orchestration logic generating the structured ComplianceRetrievalPlan.
        """
        # 1. Parse Query & Classify Intents
        parsed_query = self.parser.parse_query_string(query)
        intents = self.classifier.classify_intents(query)
        parsed_query.intents = intents

        # 2. Extract Scope from Ontology
        kws = parsed_query.building_components + parsed_query.regulatory_concepts
        scope = self.ontology.extract_applicable_scope(kws)
        
        applicable_codes = list(scope["codes"])
        applicable_chapters = list(scope["chapters"])

        # Fallback to Building Code if no specific book was identified
        if not applicable_codes:
            applicable_codes.append("Building Code")

        # 3. Generate Hard Filters (Exact Matches)
        filters: List[MetadataFilter] = [
            MetadataFilter(key="jurisdiction", value=parsed_query.jurisdiction, filter_type="hard", confidence=1.0),
            MetadataFilter(key="revision_year", value=parsed_query.revision_year, filter_type="hard", confidence=1.0)
        ]
        
        # Add code books as hard filters
        for code in applicable_codes:
            filters.append(MetadataFilter(key="code_book", value=code, filter_type="hard", confidence=0.95))

        # 4. Generate Soft Filters (Context-Aware occupancy boosters)
        # Check occupancy from query first
        occ_val = parsed_query.occupancy
        
        # Context-aware enhancement: if not in query, check dominant occupancy in building model
        if not occ_val and knowledge_model:
            # Safely check calculated metrics or storeys
            if hasattr(knowledge_model, "calculated_metrics"):
                metrics = knowledge_model.calculated_metrics
            elif isinstance(knowledge_model, dict) and "calculated_metrics" in knowledge_model:
                metrics = knowledge_model["calculated_metrics"]
            else:
                metrics = {}
            
            # If the model has spaces, boost by occupancy classification of the project
            # (We default to business occupancy if available)
            if metrics.get("total_occupant_load", 0) > 0:
                # We boost standard business occupancy
                occ_val = "business"

        if occ_val:
            filters.append(
                MetadataFilter(
                    key="occupancy_classification",
                    value=occ_val,
                    filter_type="soft",
                    confidence=0.85
                )
            )

        if parsed_query.discipline:
            filters.append(
                MetadataFilter(
                    key="discipline",
                    value=parsed_query.discipline,
                    filter_type="soft",
                    confidence=0.90
                )
            )

        # 5. Determine Retrieval Strategy
        # Lexical search for direct section/chapter number mentions (e.g. "Chapter 10" or "1004.1.2")
        # Hybrid search for compliance checks (combining semantic concept and components)
        # Semantic search for general text queries
        query_lower = query.lower()
        if re.search(r"\b(section|chapter|table)\b|\b\d{3,4}\.\d\b", query_lower):
            strategy = "lexical"
            top_k = 3
            reasoning = "Query contains direct section numbers or table indicators. Prioritized lexical search."
        elif any(i in intents for i in (QueryIntent.COMPLIANCE_CHECK, QueryIntent.ACCESSIBILITY_REVIEW, QueryIntent.FIRE_REVIEW)):
            strategy = "hybrid"
            top_k = 6
            reasoning = "Query demands compliance or technical design review. Deploying hybrid keyword + dense vector search."
        else:
            strategy = "semantic"
            top_k = 5
            reasoning = "Conceptual open-ended query. Defaulting to dense semantic search."

        # Generate warnings
        warnings = []
        if len(applicable_codes) > 1:
            warnings.append("Multi-discipline query detected. Search scope spans multiple code books.")
        if not parsed_query.building_components and not parsed_query.regulatory_concepts:
            warnings.append("Query does not contain recognized building components or regulatory concepts. Search confidence may be reduced.")

        return ComplianceRetrievalPlan(
            query=query,
            parsed_query=parsed_query,
            applicable_codes=applicable_codes,
            applicable_chapters=applicable_chapters,
            metadata_filters=filters,
            retrieval_strategy=strategy,
            top_k=top_k,
            confidence=0.88 if not warnings else 0.70,
            reasoning=reasoning,
            warnings=warnings
        )
import re
