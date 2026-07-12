from reranking.backfill.engine import RerankingPipeline

def test_pipeline_selection_loop(mock_candidate_set):
    pipeline = RerankingPipeline()
    
    # Run the ranking pipeline
    final_chunks = pipeline.run_reranking_pipeline(
        mock_candidate_set.query,
        mock_candidate_set.candidates
    )
    
    # We should have all 3 mock chunks, sorted by combined score
    assert len(final_chunks) == 3
    assert final_chunks[0].chunk_id in ("c_stair_1", "c_stair_2", "c_toilet_1") # Should be the highest scoring
    
    # Test conflict detection (conflict should trigger as c_stair_1 and c_stair_2 differ in dimensions on the same section)
    assert any(c.conflict_info.get("has_conflict", False) for c in final_chunks)
