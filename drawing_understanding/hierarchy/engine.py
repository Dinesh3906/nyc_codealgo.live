import uuid
import re
from typing import List, Dict, Any, Set
from document_ingestion.models import Page as IngestionPage, BoundingBox
from ..models import DocumentRelationship, DocumentRelationshipType, DrawingHierarchyNode, SemanticPage

class HierarchyRelationshipEngine:
    """
    Constructs viewport layout trees and links pages via cross-sheet
    references, section tags, detail calls, and schedule mappings.
    """

    def extract_page_hierarchy(self, page: IngestionPage, page_id: str) -> List[DrawingHierarchyNode]:
        """
        Identifies viewport boundary regions on a page and returns the hierarchy node tree.
        """
        nodes: List[DrawingHierarchyNode] = []
        width = page.width
        height = page.height

        # Create root sheet node
        sheet_node_id = f"node-sheet-{page_id}"
        sheet_node = DrawingHierarchyNode(
            id=sheet_node_id,
            node_type="sheet",
            label=f"Sheet Page {page.index}",
            coordinates=BoundingBox(xmin=0.0, ymin=0.0, xmax=width, ymax=height),
            parent_id=None,
            children_ids=[]
        )

        all_text_objs = page.text_objects + [
            type('obj', (object,), {"coordinates": o.coordinates, "text": o.text})()
            for o in page.ocr_objects
        ]

        # Heuristic: Find Viewport labels (often text like "DETAIL 1" or "SECTION A-A" or "PLAN VIEW")
        # Viewports typically occupy quadrants or segments. We group coordinate boxes around labels.
        label_patterns = [
            r"(?i)\bdetail\s*[0-9A-Z]\b", r"(?i)\bsection\s*[A-Z]-[A-Z]\b",
            r"(?i)\bfirst\s*floor\s*plan\b", r"(?i)\bkey\s*plan\b"
        ]

        viewport_idx = 1
        for obj in all_text_objs:
            is_label = any(re.search(pat, obj.text) for pat in label_patterns)
            if is_label:
                # Construct mock viewport quadrant box around label (typically extending upwards)
                # Bounding box coordinates
                lbl_box = obj.coordinates
                xmin = max(0.0, lbl_box.xmin - 100)
                xmax = min(width, lbl_box.xmax + 100)
                ymin = lbl_box.ymin
                ymax = min(height, lbl_box.ymax + 200)

                vp_id = f"node-vp-{uuid.uuid4()}"
                vp_node = DrawingHierarchyNode(
                    id=vp_id,
                    node_type="viewport",
                    label=obj.text.strip(),
                    coordinates=BoundingBox(xmin=xmin, ymin=ymin, xmax=xmax, ymax=ymax),
                    parent_id=sheet_node_id,
                    children_ids=[]
                )
                nodes.append(vp_node)
                sheet_node.children_ids.append(vp_id)
                viewport_idx += 1

        nodes.insert(0, sheet_node)
        return nodes

    def extract_relationships(
        self, 
        pages: List[SemanticPage], 
        sheet_id_to_page_idx: Dict[str, int]
    ) -> List[DocumentRelationship]:
        """
        Analyzes all text content across pages to resolve cross-sheet reference links.
        """
        relationships: List[DocumentRelationship] = []
        known_sheet_numbers = set(sheet_id_to_page_idx.keys())

        for source_page in pages:
            # Aggregate all text elements on page
            combined_texts: List[str] = []
            if source_page.metadata.get("raw_text_list"):
                combined_texts = source_page.metadata["raw_text_list"]

            source_sheet_num = source_page.title_block.sheet_number if source_page.title_block else None
            if not source_sheet_num:
                continue

            for txt in combined_texts:
                # 1. Search for simple sheet mentions e.g. "SEE SHEET A-501" or just "A-501"
                for target_sheet in known_sheet_numbers:
                    if target_sheet == source_sheet_num:
                        continue
                    
                    # Exact sheet number match in text
                    pattern = rf"\b{re.escape(target_sheet)}\b"
                    if re.search(pattern, txt):
                        target_page_idx = sheet_id_to_page_idx[target_sheet]
                        
                        rel_id = f"rel-{uuid.uuid4()}"
                        relationships.append(
                            DocumentRelationship(
                                id=rel_id,
                                source_id=f"page_{source_page.index}",
                                target_id=f"page_{target_page_idx}",
                                rel_type=DocumentRelationshipType.REFERENCED_BY,
                                confidence=0.90,
                                citation_text=txt.strip()
                            )
                        )

                # 2. Search for detail callouts e.g. "5/A-501" or "Detail 5 on A-501"
                callout_matches = re.findall(r"\b([0-9A-Z]+)\s*/\s*([A-Z]{1,2})[-_\s]*([0-9]{3})\b", txt)
                for detail_num, disc, num in callout_matches:
                    target_sheet = f"{disc}-{num}"
                    if target_sheet in known_sheet_numbers:
                        target_page_idx = sheet_id_to_page_idx[target_sheet]
                        rel_id = f"rel-callout-{uuid.uuid4()}"
                        relationships.append(
                            DocumentRelationship(
                                id=rel_id,
                                source_id=f"page_{source_page.index}",
                                target_id=f"page_{target_page_idx}",
                                rel_type=DocumentRelationshipType.DETAIL_ON,
                                confidence=0.95,
                                citation_text=txt.strip()
                            )
                        )

            # 3. Schedule Applicability e.g. "Door Schedule" applying to "Floor Plan" sheets
            is_schedule = "schedule" in [c.value for c in source_page.classifications]
            if is_schedule:
                for target_page in pages:
                    if target_page.index == source_page.index:
                        continue
                    is_plan = "floor_plan" in [c.value for c in target_page.classifications]
                    if is_plan:
                        rel_id = f"rel-sched-map-{uuid.uuid4()}"
                        relationships.append(
                            DocumentRelationship(
                                id=rel_id,
                                source_id=f"page_{source_page.index}",
                                target_id=f"page_{target_page.index}",
                                rel_type=DocumentRelationshipType.APPLIES_TO,
                                confidence=0.85,
                                citation_text="Automatic schedule applicability routing"
                            )
                        )

        # Deduplicate relationships based on source, target, and type
        deduplicated: List[DocumentRelationship] = []
        seen = set()
        for rel in relationships:
            key = (rel.source_id, rel.target_id, rel.rel_type)
            if key not in seen:
                seen.add(key)
                deduplicated.append(rel)

        return deduplicated
