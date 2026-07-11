import pytest
from aiops.learning.pipeline import ActiveLearningPipeline

def test_active_learning_hard_sample_mining():
    pipeline = ActiveLearningPipeline()
    
    # 5-star rating with no corrections -> should NOT be a hard example
    entry1 = pipeline.ingest_user_feedback(
        job_id="job_01", user_id="u01", user_role="SME",
        rating=5, corrections={}
    )
    assert entry1.is_hard_example is False
    assert len(pipeline.get_hard_examples()) == 0
    
    # 2-star rating -> should be marked as hard example
    entry2 = pipeline.ingest_user_feedback(
        job_id="job_02", user_id="u01", user_role="SME",
        rating=2, corrections={}
    )
    assert entry2.is_hard_example is True
    assert len(pipeline.get_hard_examples()) == 1

def test_active_learning_corrections():
    pipeline = ActiveLearningPipeline()
    
    # 4-star rating but with layout corrections -> should be marked as hard example
    entry = pipeline.ingest_user_feedback(
        job_id="job_03", user_id="u02", user_role="Architect",
        rating=4, corrections={"finding_001": {"correct_value": "60 inches"}}
    )
    
    assert entry.is_hard_example is True
    assert len(pipeline.get_hard_examples()) == 1
