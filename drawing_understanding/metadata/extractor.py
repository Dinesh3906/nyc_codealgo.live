import re
from document_ingestion.models import Page as IngestionPage
from ..models import TitleBlockMetadata, SemanticRegion

class TitleBlockMetadataExtractor:
    """
    Parses and extracts detailed metadata (sheet number, project, date, scale,
    architect/engineer details) from the segmented Title Block region.
    """

    def extract_metadata(self, page: IngestionPage, tb_region: SemanticRegion) -> TitleBlockMetadata:
        """
        Filters text items falling inside the Title Block boundary and runs
        regex heuristics to extract metadata.
        """
        # Filter all text items inside Title Block
        tb_box = tb_region.coordinates
        
        all_text_objs = page.text_objects + [
            type('obj', (object,), {"coordinates": o.coordinates, "text": o.text})()
            for o in page.ocr_objects
        ]

        tb_texts = [
            o for o in all_text_objs
            if o.coordinates.xmin >= tb_box.xmin - 5
            and o.coordinates.xmax <= tb_box.xmax + 5
            and o.coordinates.ymin >= tb_box.ymin - 5
            and o.coordinates.ymax <= tb_box.ymax + 5
        ]

        # Sort top-to-bottom
        tb_texts.sort(key=lambda o: o.coordinates.ymax, reverse=True)
        tb_str_list = [o.text.strip() for o in tb_texts]
        "\n".join(tb_str_list)

        # 1. Sheet Number Extraction
        # Look for sheet tags like A-101, M-202, SEC-01 at the end of the text list (typically bottom-right)
        sheet_number = None
        # Reverse search in sorted list as sheet numbers are usually at the bottom
        for txt in reversed(tb_str_list):
            if match := re.search(r"\b([A-Z]{1,2})[-_\s]*([0-9]{3})\b", txt):
                sheet_number = match.group(0)
                break
        
        # 2. Scale Extraction
        scale = None
        for txt in tb_str_list:
            if match := re.search(r"(?i)\bscale\b[:\s]*([0-9a-zA-Z\"'/\\=\s\-\.]+|\bn\.?t\.?s\.?\b)", txt):
                scale = match.group(1).strip()
                break

        # 3. Date Extraction
        date = None
        for txt in tb_str_list:
            # Match date formats e.g. 12/25/2022, 2022-10-12, OCT 2022
            if match := re.search(r"(?i)\bdate\b[:\s]*([0-9/\\\-\s]+|[A-Z]{3,9}\s+[0-9]{4})", txt):
                date = match.group(1).strip()
                break

        # 4. Architect & Engineer Extraction
        architect = None
        engineer = None
        for i, txt in enumerate(tb_str_list):
            if "architect" in txt.lower():
                # Take next line if current line is just header
                architect = tb_str_list[i+1] if i+1 < len(tb_str_list) else txt
            if "engineer" in txt.lower() or "professional seal" in txt.lower():
                engineer = tb_str_list[i+1] if i+1 < len(tb_str_list) else txt

        # 5. Drawing Title Extraction
        # Look for drawing title keyword hints (e.g. FLOOR PLAN, ELEVATION)
        drawing_title = None
        for txt in tb_str_list:
            if any(term in txt.lower() for term in ["plan", "elevation", "section", "layout", "details", "notes"]):
                # Avoid matching simple sheet numbers or labels
                if len(txt) > 5 and not re.search(r"^[A-Z]-[0-9]{3}$", txt):
                    drawing_title = txt
                    break

        # 6. Revision Tag
        revision = "0"
        for txt in tb_str_list:
            if match := re.search(r"(?i)\brev(?:ision)?\b[:\s]*([0-9]+|[A-Z])", txt):
                revision = match.group(1).strip()
                break

        # 7. Discipline mapping
        discipline = "Architectural"
        if sheet_number:
            prefix = sheet_number[0]
            discipline_map = {
                "A": "Architectural",
                "S": "Structural",
                "M": "Mechanical",
                "E": "Electrical",
                "P": "Plumbing",
                "F": "Fire Protection",
                "C": "Civil"
            }
            discipline = discipline_map.get(prefix, "Architectural")

        return TitleBlockMetadata(
            sheet_number=sheet_number,
            revision=revision,
            drawing_title=drawing_title,
            scale=scale,
            discipline=discipline,
            project=tb_str_list[0] if tb_str_list else "Unknown Project", # Usually top line
            date=date,
            engineer=engineer,
            architect=architect,
            consultant=None,
            version_id=f"v_{revision}"
        )
