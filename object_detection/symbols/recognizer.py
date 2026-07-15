import uuid
from typing import List, Dict
from document_ingestion.models import Page as IngestionPage, BoundingBox
from ..models import SemanticBuildingObject

class SymbolRecognizerEngine:
    """
    Identifies fire safety, mechanical, and electrical symbols by matching
    text codes and coordinate shapes against extracted legend dictionaries.
    """

    SYMBOL_CLASS_MAPPING = {
        "smoke detector": "SMOKE_DETECTOR",
        "fire extinguisher": "FIRE_EXTINGUISHER",
        "sprinkler": "SPRINKLER",
        "exit sign": "EXIT_SIGN",
        "light fixture": "LIGHT_FIXTURE",
        "electrical outlet": "ELECTRICAL_OUTLET",
        "water closet": "PLUMBING_FIXTURE",
        "sink": "PLUMBING_FIXTURE",
        "hvac diffuser": "HVAC_DIFFUSER"
    }

    def recognize_symbols(
        self, 
        page: IngestionPage, 
        legend_symbols: Dict[str, str], 
        page_idx: int
    ) -> List[SemanticBuildingObject]:
        """
        Scans text entries on a page, cross-references them with the legend symbol
        dictionary, and instantiates semantic symbol objects at their coordinates.
        """
        detected_symbols: List[SemanticBuildingObject] = []
        
        # Sanitize inputs
        from document_ingestion.models import TextObject, OCRObject
        text_objects = [
            TextObject(**t) if isinstance(t, dict) else t
            for t in page.text_objects
        ]
        ocr_objects = [
            OCRObject(**o) if isinstance(o, dict) else o
            for o in (getattr(page, "ocr_objects", []) or [])
        ]

        all_text_objs = text_objects + [
            type('obj', (object,), {"coordinates": o.coordinates, "text": o.text, "id": o.id})()
            for o in ocr_objects
        ]

        # Combine abbreviation maps and symbol maps from legend for mapping lookups
        legend_lookup = {k.lower().strip(): v.lower().strip() for k, v in legend_symbols.items()}

        for obj in all_text_objs:
            txt_clean = obj.text.strip().lower()
            
            # Match condition 1: Text matches a legend entry exactly
            # Match condition 2: Text contains symbols or words matching typical categories
            matched_description = None
            if txt_clean in legend_lookup:
                matched_description = legend_lookup[txt_clean]
            else:
                # Check for substring matches in legend values
                for leg_key, leg_val in legend_lookup.items():
                    if leg_key in txt_clean or txt_clean in leg_key:
                        matched_description = leg_val
                        break
            
            if matched_description:
                # Map description to class
                mapped_class = "UNKNOWN_SYMBOL"
                for desc_key, cls_val in self.SYMBOL_CLASS_MAPPING.items():
                    if desc_key in matched_description:
                        mapped_class = cls_val
                        break
                
                # Check if it was mapped. If so, build symbol building object
                if mapped_class != "UNKNOWN_SYMBOL" or len(txt_clean) <= 3:
                    lbl_box = obj.coordinates
                    # Small offset box representing the symbol icon coordinates
                    xmin = lbl_box.xmin - 5
                    xmax = lbl_box.xmax + 5
                    ymin = lbl_box.ymin - 5
                    ymax = lbl_box.ymax + 5
                    
                    detected_symbols.append(
                        SemanticBuildingObject(
                            id=f"obj-symbol-{uuid.uuid4()}",
                            object_class=mapped_class,
                            subtype=txt_clean.upper(),
                            coordinates=BoundingBox(xmin=xmin, ymin=ymin, xmax=xmax, ymax=ymax),
                            polygon=[[xmin, ymin], [xmax, ymin], [xmax, ymax], [xmin, ymax]],
                            confidence=0.82,
                            page_idx=page_idx,
                            attributes={
                                "legend_description": matched_description,
                                "label": obj.text.strip()
                            },
                            source_refs=[obj.id]
                        )
                    )

        return detected_symbols
