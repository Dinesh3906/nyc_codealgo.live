import pytest
from reporting.exports.writer import ExportWriter

def test_markdown_rendering(mock_compliance_report):
    writer = ExportWriter()
    
    md = writer.render_markdown(
        "Test Title", "FAIL", "Some Summary",
        mock_compliance_report["findings"]
    )
    
    assert "# Test Title" in md
    assert "**Overall Audit Verdict: FAIL**" in md
    assert "| FIND-001 | toilet | **PASS** |" in md

def test_html_rendering(mock_compliance_report):
    writer = ExportWriter()
    
    html = writer.render_html(
        "Test Title", "FAIL", "Some Summary",
        {"PASS": 1, "FAIL": 1}, mock_compliance_report["findings"]
    )
    
    assert "<!DOCTYPE html>" in html
    assert "Test Title" in html
    assert "FIND-001" in html
    assert "FIND-002" in html

def test_csv_rendering(mock_compliance_report):
    writer = ExportWriter()
    
    csv_str = writer.render_csv(mock_compliance_report["findings"])
    
    assert "Finding ID,Category,Component" in csv_str
    assert "FIND-001,accessibility,toilet" in csv_str
