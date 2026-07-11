import re
from typing import List, Dict, Any

class ContextCompressor:
    """
    Minimizes context token footprint by removing redundant spaces and merging
    identical chunks without summarizing or changing legal definitions.
    """

    def clean_text(self, text: str) -> str:
        """
        Compresses whitespace and removes redundant character sequences.
        """
        # Collapse multiple spaces and newlines
        text = re.sub(r"\s+", " ", text)
        return text.strip()

    def compress_evidence(
        self,
        chunks: List[Dict[str, Any]],
        token_budget: int = 8192
    ) -> List[Dict[str, Any]]:
        """
        Filters and compresses text chunks, merging exact sections.
        """
        compressed_list: List[Dict[str, Any]] = []
        seen_sections = set()

        for chunk in chunks:
            sec_key = (chunk.get("code_book"), chunk.get("section"))
            
            # Skip if we already have the exact code/section text block
            if sec_key in seen_sections:
                continue

            cleaned_text = self.clean_text(chunk.get("chunk_text", ""))
            
            # Copy chunk data and insert cleaned text
            compressed_chunk = dict(chunk)
            compressed_chunk["chunk_text"] = cleaned_text
            
            compressed_list.append(compressed_chunk)
            seen_sections.add(sec_key)

        # Enforce budget truncation if too many chunks (each chunk approx 150 tokens)
        max_chunks = token_budget // 150
        return compressed_list[:max_chunks]
