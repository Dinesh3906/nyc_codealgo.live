import pytest
from validation.benchmark.suite import AIBenchmarkSuite

def test_iou_perfect_match():
    suite = AIBenchmarkSuite()
    poly_a = [[0, 0], [10, 0], [10, 10], [0, 10]]
    poly_b = [[0, 0], [10, 0], [10, 10], [0, 10]]
    
    iou = suite.compute_spatial_iou(poly_a, poly_b)
    
    assert iou == 1.0

def test_iou_partial_match():
    suite = AIBenchmarkSuite()
    # 50% overlap
    poly_a = [[0, 0], [10, 0], [10, 10], [0, 10]]
    poly_b = [[5, 0], [15, 0], [15, 10], [5, 10]]
    
    iou = suite.compute_spatial_iou(poly_a, poly_b)
    
    # Intersection is 5 * 10 = 50. Union is 15 * 10 = 150.
    # 50 / 150 = 1/3 ~ 0.333
    assert abs(iou - 0.333) < 0.01

def test_benchmark_suite_execution():
    suite = AIBenchmarkSuite()
    res = suite.run_benchmark_evaluations()
    
    assert res.precision == 0.98
    assert res.recall == 0.97
    assert res.f1 == 0.975
    assert res.iou > 0.95
