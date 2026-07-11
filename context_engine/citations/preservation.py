from typing import List, Dict, Any

class CitationPreserver:
    """
    Builds and maintains a structured citation registry to ensure 100%
    traceability of evidence chunks back to source PDF pages.
    """

    def generate_citation_index(
        self,
        chunks: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Creates a list of citation reference objects with unique keys.
        """
        citations = []
        for idx, chunk in enumerate(chunks):
            cit_id = f"CIT-{idx + 1:02d}"
            citations.append({
                "citation_id": cit_id,
                "chunk_id": chunk.get("chunk_id"),
                "code_book": chunk.get("code_book"),
                "chapter": chunk.get("chapter"),
                "section": chunk.get("section"),
                "page_number": chunk.get("page_number"),
                "filename": chunk.get("filename"),
                "source_pdf": chunk.get("filename") # Fallback to filename
            })

        return citations
