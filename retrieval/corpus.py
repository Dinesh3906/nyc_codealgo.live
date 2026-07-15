import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from .config import settings


CorpusRecord = Dict[str, Any]


def _coerce_record(raw: Dict[str, Any], index: int) -> CorpusRecord:
    chunk_text = (
        raw.get("chunk_text")
        or raw.get("text")
        or raw.get("page_content")
        or raw.get("content")
    )
    if not chunk_text:
        raise ValueError(f"Corpus record {index} is missing chunk_text/text/content.")

    chunk_id = raw.get("chunk_id") or raw.get("id")
    if not chunk_id:
        raise ValueError(f"Corpus record {index} is missing chunk_id/id.")

    return {
        "chunk_id": str(chunk_id),
        "chunk_text": str(chunk_text),
        "document_id": str(raw.get("document_id") or raw.get("source_id") or raw.get("filename") or "unknown"),
        "filename": str(raw.get("filename") or raw.get("source") or raw.get("document_id") or "unknown"),
        "page_number": int(raw.get("page_number") or raw.get("page") or 1),
        "code_book": str(raw.get("code_book") or raw.get("code") or "unknown"),
        "chapter": str(raw.get("chapter") or "unknown"),
        "section": str(raw.get("section") or raw.get("section_number") or "unknown"),
        "subsection": raw.get("subsection"),
        "discipline": raw.get("discipline"),
        "occupancy_type": raw.get("occupancy_type"),
        "jurisdiction": str(raw.get("jurisdiction") or "NYC"),
        "revision_year": str(raw.get("revision_year") or raw.get("year") or "unknown"),
    }


def load_code_corpus(corpus_path: Optional[str] = None) -> List[CorpusRecord]:
    """
    Loads a retrieval corpus from a JSON or JSONL file.

    This is intentionally file-backed so production deployments can point BM25
    at an indexed artifact generated from the same regulatory source set used
    for Pinecone ingestion. The function does not fall back to embedded sample
    records.
    """
    configured_path = corpus_path or settings.CODE_CORPUS_PATH
    if not configured_path:
        raise RuntimeError(
            "CODE_CORPUS_PATH is not configured. Generate a regulatory corpus artifact "
            "during ingestion and point this service at it."
        )

    path = Path(configured_path)
    if not path.exists():
        raise RuntimeError(f"Configured CODE_CORPUS_PATH does not exist: {path}")

    if path.suffix.lower() == ".jsonl":
        with path.open("r", encoding="utf-8") as fh:
            raw_records = [json.loads(line) for line in fh if line.strip()]
    else:
        with path.open("r", encoding="utf-8") as fh:
            payload = json.load(fh)
        raw_records = payload.get("chunks") if isinstance(payload, dict) else payload

    if not isinstance(raw_records, list) or not raw_records:
        raise RuntimeError("Configured retrieval corpus is empty or malformed.")

    return [_coerce_record(record, idx) for idx, record in enumerate(raw_records)]
