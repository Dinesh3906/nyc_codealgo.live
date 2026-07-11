import pytest
from query_understanding.ontology.engine import OntologyEngine

def test_synonym_resolution():
    engine = OntologyEngine()
    
    # "wc" synonym matches toilet concept (Plumbing Code Chapter 4)
    res = engine.resolve_concept("wc")
    assert res["discipline"] == "Plumbing"
    assert res["code_book"] == "Plumbing Code"
    assert res["chapter"] == "Chapter 4"
    
    # "incline" synonym matches ramp concept (Building Code Chapter 11)
    res = engine.resolve_concept("incline")
    assert res["discipline"] == "Accessibility"
    assert res["code_book"] == "Building Code"
    assert res["chapter"] == "Chapter 11"

def test_scope_accumulation():
    engine = OntologyEngine()
    
    scope = engine.extract_applicable_scope(["wc", "sprinkler"])
    
    assert "Plumbing Code" in scope["codes"]
    assert "Fire Code" in scope["codes"]
    assert "Chapter 4" in scope["chapters"]
    assert "Chapter 9" in scope["chapters"]
