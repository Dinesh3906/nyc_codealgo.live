from typing import List, Dict, Any
from document_ingestion.models import Page as IngestionPage
from ..models import ParsedLegend, SemanticRegion
from ..config import settings

class LegendParser:
    """
    Parses and extracts symbol descriptions, abbreviation dictionaries,
    and legend notes from segmented legend regions.
    """

    def parse_legend(self, page: IngestionPage, legend_region: SemanticRegion) -> ParsedLegend:
        """
        Groups text items inside the legend region coordinates into symbol-description
        dictionary pairs and abbreviation mappings.
        """
        box = legend_region.coordinates
        
        all_text_objs = page.text_objects + [
            type('obj', (object,), {"coordinates": o.coordinates, "text": o.text})()
            for o in page.ocr_objects
        ]

        # Filter items inside region boundary
        legend_items = [
            o for o in all_text_objs
            if o.coordinates.xmin >= box.xmin - 5
            and o.coordinates.xmax <= box.xmax + 5
            and o.coordinates.ymin >= box.ymin - 5
            and o.coordinates.ymax <= box.ymax + 5
        ]

        if not legend_items:
            return ParsedLegend()

        # Sort top-to-bottom
        legend_items.sort(key=lambda o: o.coordinates.ymax, reverse=True)

        symbol_dict: Dict[str, str] = {}
        abbrev_dict: Dict[str, str] = {}
        notes: List[str] = []

        # Group into rows based on vertical proximity
        rows_list: List[List[Any]] = []
        for item in legend_items:
            # Skip if text is simply header name
            if "legend" in item.text.lower() and len(item.text) > 10:
                continue
                
            placed = False
            item_y_center = (item.coordinates.ymin + item.coordinates.ymax) / 2.0
            
            for row in rows_list:
                row_y_center = sum((r.coordinates.ymin + r.coordinates.ymax) / 2.0 for r in row) / len(row)
                if abs(item_y_center - row_y_center) <= settings.TABLE_ROW_GAP_TOLERANCE_PTS:
                    row.append(item)
                    placed = True
                    break
            
            if not placed:
                rows_list.append([item])

        # Sort each row left-to-right
        for row in rows_list:
            row.sort(key=lambda o: o.coordinates.xmin)

        # Process each row to match key-value legend entries
        for row in rows_list:
            if len(row) == 2:
                key_text = row[0].text.strip()
                val_text = row[1].text.strip()
                
                # Check if key is a standard abbreviation (short, uppercase)
                if len(key_text) <= 5 and key_text.isupper() and key_text.isalpha():
                    abbrev_dict[key_text] = val_text
                else:
                    symbol_dict[key_text] = val_text
            elif len(row) == 1:
                notes.append(row[0].text.strip())
            else:
                # Group multiple cells in row (first cell is key, join remainder as value)
                key_text = row[0].text.strip()
                val_text = " ".join([r.text.strip() for r in row[1:]])
                symbol_dict[key_text] = val_text

        return ParsedLegend(
            symbol_dictionary=symbol_dict,
            abbreviation_dictionary=abbrev_dict,
            notes=notes
        )
