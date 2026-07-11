import csv
import io
from typing import List, Dict, Any
from ..config import settings

class ExportWriter:
    """
    Renders compliance reports into HTML dashboards, Markdown outlines,
    and tabular CSV spreadsheets.
    """

    def render_markdown(
        self,
        report_title: str,
        verdict: str,
        exec_summary: str,
        findings: List[Dict[str, Any]]
    ) -> str:
        """
        Renders report into a Markdown string.
        """
        lines = [
            f"# {report_title}",
            f"**Overall Audit Verdict: {verdict}**",
            "",
            "## Executive Summary",
            exec_summary,
            "",
            "## Detailed Findings Checklist",
            "| ID | Component | Decision | Measurement | Actual | Required | Section | Citation |",
            "|---|---|---|---|---|---|---|---|",
        ]

        for f in findings:
            f_id = f.get("finding_id")
            comp = f.get("component")
            dec = f.get("decision")
            meas = f.get("measurement")
            act = f.get("actual_value")
            req = f.get("required_value")
            sec = f.get("applicable_section")
            cit = f.get("verified_citation_id", "N/A")
            
            lines.append(
                f"| {f_id} | {comp} | **{dec}** | {meas} | {act} | {req} | {sec} | {cit} |"
            )

        return "\n".join(lines)

    def render_html(
        self,
        report_title: str,
        verdict: str,
        exec_summary: str,
        scorecard: Dict[str, int],
        findings: List[Dict[str, Any]]
    ) -> str:
        """
        Renders report into a beautiful, styled HTML dashboard.
        """
        # Determine color for verdict card
        v_color = settings.COLOR_PASS
        if verdict == "FAIL":
            v_color = settings.COLOR_FAIL
        elif verdict == "REQUIRES_HUMAN_REVIEW":
            v_color = settings.COLOR_REVIEW
        elif verdict == "WARNING":
            v_color = settings.COLOR_WARNING

        # Build findings rows
        rows = []
        for f in findings:
            dec = f.get("decision", "UNKNOWN")
            dec_color = settings.COLOR_PASS
            if dec == "FAIL":
                dec_color = settings.COLOR_FAIL
            elif dec == "REQUIRES_HUMAN_REVIEW":
                dec_color = settings.COLOR_REVIEW
            elif dec == "WARNING":
                dec_color = settings.COLOR_WARNING

            rows.append(f"""
            <tr>
                <td><strong>{f.get("finding_id")}</strong></td>
                <td>{f.get("component")}</td>
                <td><span style="background-color: {dec_color}; color: white; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">{dec}</span></td>
                <td>{f.get("measurement")}</td>
                <td>{f.get("actual_value")}</td>
                <td>{f.get("required_value")}</td>
                <td>{f.get("applicable_section")}</td>
                <td><span style="font-family: monospace;">{f.get("verified_citation_id", "N/A")}</span></td>
            </tr>
            """)

        rows_html = "\n".join(rows)

        html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{report_title}</title>
    <style>
        body {{ font-family: 'Helvetica Neue', Arial, sans-serif; margin: 40px; color: #2c3e50; line-height: 1.6; }}
        header {{ border-bottom: 2px solid #ecf0f1; padding-bottom: 20px; margin-bottom: 30px; }}
        h1 {{ margin: 0; color: #2c3e50; font-size: 26px; }}
        .verdict-card {{ background-color: {v_color}; color: white; padding: 20px; border-radius: 6px; margin-bottom: 25px; }}
        .verdict-card h2 {{ margin: 0; font-size: 18px; font-weight: normal; }}
        .verdict-card h3 {{ margin: 5px 0 0 0; font-size: 32px; }}
        .scorecard {{ display: flex; gap: 15px; margin-bottom: 30px; }}
        .scorecard-item {{ flex: 1; border: 1px solid #e2e8f0; padding: 15px; border-radius: 6px; text-align: center; }}
        .scorecard-item h4 {{ margin: 0; font-size: 12px; color: #718096; text-transform: uppercase; }}
        .scorecard-item p {{ margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #2d3748; }}
        .summary {{ background-color: #f7fafc; padding: 20px; border-radius: 6px; margin-bottom: 30px; border-left: 4px solid #4a5568; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 15px; }}
        th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #ecf0f1; }}
        th {{ background-color: #f8fafc; font-size: 13px; color: #4a5568; text-transform: uppercase; letter-spacing: 0.5px; }}
        td {{ font-size: 14px; }}
        tr:hover {{ background-color: #f8fafc; }}
        footer {{ margin-top: 50px; text-align: center; font-size: 12px; color: #a0aec0; border-top: 1px solid #e2e8f0; padding-top: 15px; }}
    </style>
</head>
<body>
    <header>
        <h1>{report_title}</h1>
        <p style="margin: 5px 0 0 0; font-size: 14px; color: #718096;">PermitIQ Automated Auditing Services</p>
    </header>

    <div class="verdict-card">
        <h2>Overall Audit Status</h2>
        <h3>{verdict}</h3>
    </div>

    <div class="scorecard">
        <div class="scorecard-item">
            <h4>Passed Checks</h4>
            <p>{scorecard.get("PASS", 0)}</p>
        </div>
        <div class="scorecard-item">
            <h4>Violations</h4>
            <p style="color: {settings.COLOR_FAIL};">{scorecard.get("FAIL", 0)}</p>
        </div>
        <div class="scorecard-item">
            <h4>Human Reviews</h4>
            <p style="color: {settings.COLOR_REVIEW};">{scorecard.get("REQUIRES_HUMAN_REVIEW", 0)}</p>
        </div>
    </div>

    <div class="summary">
        <h3 style="margin-top: 0; color: #2d3748;">Executive Summary</h3>
        <p style="margin: 0; font-size: 15px;">{exec_summary}</p>
    </div>

    <h2>Detailed Findings Checklist</h2>
    <table>
        <thead>
            <tr>
                <th>ID</th>
                <th>Component</th>
                <th>Status</th>
                <th>Measurement</th>
                <th>Actual</th>
                <th>Required</th>
                <th>Section</th>
                <th>Citation Reference</th>
            </tr>
        </thead>
        <tbody>
            {rows_html}
        </tbody>
    </table>

    <footer>
        {settings.BRANDING_FOOTER.format(page=1)}
    </footer>
</body>
</html>
"""
        return html

    def render_csv(
        self,
        findings: List[Dict[str, Any]]
    ) -> str:
        """
        Renders report into a tabular CSV string.
        """
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write CSV Header
        writer.writerow([
            "Finding ID", "Category", "Component", "Decision", "Severity",
            "Measurement", "Actual Value", "Required Value", "Difference",
            "Applicable Code Book", "Applicable Section", "Verified Citation ID", "Explanation"
        ])
        
        for f in findings:
            writer.writerow([
                f.get("finding_id"),
                f.get("category"),
                f.get("component"),
                f.get("decision"),
                f.get("severity"),
                f.get("measurement"),
                f.get("actual_value"),
                f.get("required_value"),
                f.get("difference"),
                f.get("applicable_code_book"),
                f.get("applicable_section"),
                f.get("verified_citation_id", "N/A"),
                f.get("explanation")
            ])
            
        return output.getvalue()
