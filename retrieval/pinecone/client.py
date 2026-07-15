import asyncio
from typing import Any, Dict, List

import requests

from ..config import settings
from ..corpus import CorpusRecord
from ..schemas.models import RetrievalCandidate


class PineconeRetriever:
    """
    Retriever class encapsulating semantic query operations over Pinecone.

    Requires a real embedding endpoint plus Pinecone data-plane host.
    """

    async def query_semantic_index(
        self,
        query: str,
        filters: Dict[str, Any],
        top_k: int = 5
    ) -> List[RetrievalCandidate]:
        """
        Executes an async semantic search over the configured Pinecone index.
        Filters candidate chunks by hard metadata parameters and returns ranked
        evidence candidates.
        """
        self._validate_production_config()
        vector = await asyncio.to_thread(self._embed_query, query)
        response = await asyncio.to_thread(self._query_pinecone, vector, filters, top_k)
        return self._parse_pinecone_matches(response.get("matches", []))

    def _validate_production_config(self) -> None:
        missing = []
        if not settings.PINECONE_API_KEY:
            missing.append("PINECONE_API_KEY")
        if not settings.PINECONE_INDEX_HOST:
            missing.append("PINECONE_INDEX_HOST")
        if not settings.EMBEDDING_ENDPOINT:
            missing.append("EMBEDDING_ENDPOINT")
        if missing:
            raise RuntimeError(
                "Semantic retrieval requires production configuration: "
                + ", ".join(missing)
            )

    def _embed_query(self, query: str) -> List[float]:
        headers = {"Content-Type": "application/json"}
        if settings.EMBEDDING_API_KEY:
            headers["Authorization"] = f"Bearer {settings.EMBEDDING_API_KEY}"

        response = requests.post(
            settings.EMBEDDING_ENDPOINT,
            json={"input": query},
            headers=headers,
            timeout=settings.RETRIEVER_TIMEOUT_MS / 1000,
        )
        response.raise_for_status()
        payload = response.json()

        embedding = payload.get("embedding") or payload.get("vector")
        if embedding is None and isinstance(payload.get("data"), list) and payload["data"]:
            embedding = payload["data"][0].get("embedding")

        if not isinstance(embedding, list) or not embedding:
            raise RuntimeError("Embedding endpoint did not return a non-empty embedding vector.")

        return [float(value) for value in embedding]

    def _query_pinecone(
        self,
        vector: List[float],
        filters: Dict[str, Any],
        top_k: int,
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "vector": vector,
            "topK": top_k,
            "includeMetadata": True,
        }
        if settings.PINECONE_NAMESPACE:
            payload["namespace"] = settings.PINECONE_NAMESPACE
        if filters:
            payload["filter"] = {
                key: {"$eq": value}
                for key, value in filters.items()
                if value is not None
            }

        response = requests.post(
            f"{settings.PINECONE_INDEX_HOST.rstrip('/')}/query",
            json=payload,
            headers={
                "Api-Key": settings.PINECONE_API_KEY,
                "Content-Type": "application/json",
            },
            timeout=settings.RETRIEVER_TIMEOUT_MS / 1000,
        )
        response.raise_for_status()
        return response.json()

    def _parse_pinecone_matches(self, matches: List[Dict[str, Any]]) -> List[RetrievalCandidate]:
        candidates: List[RetrievalCandidate] = []
        for idx, match in enumerate(matches):
            metadata = match.get("metadata") or {}
            chunk_text = (
                metadata.get("chunk_text")
                or metadata.get("text")
                or metadata.get("page_content")
                or metadata.get("content")
            )
            if not chunk_text:
                continue

            record: CorpusRecord = {
                "chunk_id": str(metadata.get("chunk_id") or match.get("id") or f"pinecone-{idx + 1}"),
                "chunk_text": str(chunk_text),
                "document_id": str(metadata.get("document_id") or metadata.get("source_id") or metadata.get("source") or "unknown"),
                "filename": str(metadata.get("filename") or metadata.get("source") or "unknown"),
                "page_number": int(metadata.get("page_number") or metadata.get("page") or 1),
                "code_book": str(metadata.get("code_book") or metadata.get("code") or "unknown"),
                "chapter": str(metadata.get("chapter") or "unknown"),
                "section": str(metadata.get("section") or metadata.get("section_number") or "unknown"),
                "subsection": metadata.get("subsection"),
                "discipline": metadata.get("discipline"),
                "occupancy_type": metadata.get("occupancy_type"),
                "jurisdiction": str(metadata.get("jurisdiction") or "NYC"),
                "revision_year": str(metadata.get("revision_year") or metadata.get("year") or "unknown"),
            }
            candidates.append(
                self._candidate_from_record(
                    record,
                    idx + 1,
                    round(float(match.get("score", 0.0)), 3),
                )
            )
        return candidates

    def _candidate_from_record(
        self,
        item: CorpusRecord,
        rank: int,
        confidence: float,
    ) -> RetrievalCandidate:
        return RetrievalCandidate(
            chunk_id=item["chunk_id"],
            chunk_text=item["chunk_text"],
            document_id=item["document_id"],
            filename=item["filename"],
            page_number=item["page_number"],
            code_book=item["code_book"],
            chapter=item["chapter"],
            section=item["section"],
            subsection=item["subsection"],
            discipline=item["discipline"],
            occupancy_type=item["occupancy_type"],
            jurisdiction=item["jurisdiction"],
            revision_year=item["revision_year"],
            pinecone_rank=rank,
            fusion_score=0.0,
            confidence=confidence,
            retrieval_sources=["pinecone"],
        )
