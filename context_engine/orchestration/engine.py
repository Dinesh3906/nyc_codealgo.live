from typing import List, Dict, Any

class EvidenceOrchestrator:
    """
    Groups and formats evidence chunks by code book and regulatory type
    (requirements, exceptions, definitions).
    """

    def group_evidence_chunks(
        self,
        chunks: List[Dict[str, Any]]
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Organizes raw evidence chunks into categories for logical LLM presentation.
        """
        groups: Dict[str, List[Dict[str, Any]]] = {
            "requirements": [],
            "exceptions": [],
            "definitions": [],
            "cross_references": []
        }

        for chunk in chunks:
            cov_type = chunk.get("coverage_type", "primary_requirement")
            
            # Map schema type to group key
            if cov_type == "exception":
                group_key = "exceptions"
            elif cov_type == "definition":
                group_key = "definitions"
            elif cov_type == "cross_reference":
                group_key = "cross_references"
            else:
                group_key = "requirements"

            groups[group_key].append({
                "chunk_id": chunk.get("chunk_id"),
                "code_book": chunk.get("code_book"),
                "section": chunk.get("section"),
                "text": chunk.get("chunk_text")
            })

        return groups
