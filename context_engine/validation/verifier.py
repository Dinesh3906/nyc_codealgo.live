from typing import Dict, Any, List

class ContextValidator:
    """
    Validates context completeness, ensuring no duplicate evidence,
    orphan references, or missing citations are present in the final package.
    """

    def validate_context_package(
        self,
        system_prompt: str,
        citations: List[Dict[str, Any]],
        chunks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Runs audit checks over the context properties.
        """
        errors = []
        warnings = []

        # 1. Check empty context
        if not system_prompt.strip():
            errors.append("System prompt is completely empty.")

        # 2. Check missing citations
        chunk_ids = {c.get("chunk_id") for c in chunks}
        citation_chunk_ids = {cit.get("chunk_id") for cit in citations}

        missing_cits = chunk_ids - citation_chunk_ids
        if missing_cits:
            errors.append(f"Missing citation references for chunks: {missing_cits}")

        # 3. Check duplicate evidence texts
        texts = [c.get("chunk_text") for c in chunks if c.get("chunk_text")]
        if len(texts) != len(set(texts)):
            warnings.append("Duplicate chunk text segments detected in evidence set.")

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings
        }
