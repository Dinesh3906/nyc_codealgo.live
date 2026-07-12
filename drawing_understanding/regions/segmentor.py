import uuid
from typing import List
from document_ingestion.models import Page as IngestionPage, BoundingBox
from ..models import SemanticRegion, RegionType
from ..config import settings

class LayoutSegmentor:
    """
    Segments the page coordinates into structured zones (Title Block, Schedules,
    Legends, Notes, and Canvas Viewports) using spatial layout heuristics.
    """

    def segment_page(self, page: IngestionPage) -> List[SemanticRegion]:
        """
        Segments page bounding boxes and returns a list of SemanticRegion objects.
        """
        width = page.width
        height = page.height
        regions: List[SemanticRegion] = []
        
        # 1. Segment Title Block
        # We classify if the title block is vertical (on the right) or horizontal (on the bottom)
        # We look at the concentration of text blocks in the right margin vs bottom margin
        all_text_objs = page.text_objects + [
            # Adapt OCRObject to resemble TextObject properties
            type('obj', (object,), {"coordinates": o.coordinates, "text": o.text})()
            for o in page.ocr_objects
        ]
        
        right_count = sum(1 for o in all_text_objs if o.coordinates.xmin >= width * 0.78)
        bottom_count = sum(1 for o in all_text_objs if o.coordinates.ymax <= height * 0.18)

        is_right_title_block = right_count >= bottom_count
        
        if is_right_title_block:
            tb_coords = BoundingBox(
                xmin=width * (1 - settings.TITLE_BLOCK_RIGHT_WIDTH_RATIO),
                ymin=0.0,
                xmax=width,
                ymax=height
            )
        else:
            tb_coords = BoundingBox(
                xmin=0.0,
                ymin=0.0,
                xmax=width,
                ymax=height * settings.TITLE_BLOCK_BOTTOM_HEIGHT_RATIO
            )

        regions.append(
            SemanticRegion(
                id=f"region-tb-{uuid.uuid4()}",
                region_type=RegionType.TITLE_BLOCK,
                coordinates=tb_coords,
                polygon=[
                    [tb_coords.xmin, tb_coords.ymin],
                    [tb_coords.xmax, tb_coords.ymin],
                    [tb_coords.xmax, tb_coords.ymax],
                    [tb_coords.xmin, tb_coords.ymax]
                ],
                confidence=0.95
            )
        )

        # 2. Segment Notes Region
        # Search for General Notes header
        notes_header = None
        for obj in all_text_objs:
            if re_match := re.search(r"\bgeneral\s*notes\b|\bnotes\s*:\b", obj.text.lower()):
                notes_header = obj
                break

        if notes_header:
            # Gather text objects aligned in a column below or around the header
            notes_x0 = notes_header.coordinates.xmin
            column_width = width * settings.GENERAL_NOTES_WIDTH_RATIO
            
            # Group all text items falling in notes vertical column
            notes_items = [
                o for o in all_text_objs
                if abs(o.coordinates.xmin - notes_x0) <= column_width / 2.0
                and o.coordinates.ymax <= notes_header.coordinates.ymax + 20
            ]
            
            if notes_items:
                xmin = min(o.coordinates.xmin for o in notes_items)
                ymin = min(o.coordinates.ymin for o in notes_items)
                xmax = max(o.coordinates.xmax for o in notes_items)
                ymax = max(o.coordinates.ymax for o in notes_items)

                regions.append(
                    SemanticRegion(
                        id=f"region-notes-{uuid.uuid4()}",
                        region_type=RegionType.NOTES,
                        coordinates=BoundingBox(xmin=xmin, ymin=ymin, xmax=xmax, ymax=ymax),
                        polygon=[[xmin, ymin], [xmax, ymin], [xmax, ymax], [xmin, ymax]],
                        confidence=0.85
                    )
                )

        # 3. Segment Schedule Regions
        # Search for schedule headers (e.g. door schedule)
        schedule_headers = [
            o for o in all_text_objs
            if "schedule" in o.text.lower() and o.coordinates.xmin < width * 0.78 # Keep outside title block
        ]

        for sh in schedule_headers:
            # Group surrounding text blocks (grid elements)
            grid_items = [
                o for o in all_text_objs
                if abs(o.coordinates.xmin - sh.coordinates.xmin) <= 300
                and abs(o.coordinates.ymin - sh.coordinates.ymin) <= 250
            ]
            
            if len(grid_items) > 5:
                xmin = min(o.coordinates.xmin for o in grid_items)
                ymin = min(o.coordinates.ymin for o in grid_items)
                xmax = max(o.coordinates.xmax for o in grid_items)
                ymax = max(o.coordinates.ymax for o in grid_items)

                regions.append(
                    SemanticRegion(
                        id=f"region-sched-{uuid.uuid4()}",
                        region_type=RegionType.SCHEDULE,
                        coordinates=BoundingBox(xmin=xmin, ymin=ymin, xmax=xmax, ymax=ymax),
                        polygon=[[xmin, ymin], [xmax, ymin], [xmax, ymax], [xmin, ymax]],
                        confidence=0.90
                    )
                )

        # 4. Segment Legend Regions
        legend_headers = [
            o for o in all_text_objs
            if "legend" in o.text.lower() and o.coordinates.xmin < width * 0.78
        ]

        for lh in legend_headers:
            legend_items = [
                o for o in all_text_objs
                if abs(o.coordinates.xmin - lh.coordinates.xmin) <= 200
                and abs(o.coordinates.ymin - lh.coordinates.ymin) <= 200
            ]
            
            if len(legend_items) > 3:
                xmin = min(o.coordinates.xmin for o in legend_items)
                ymin = min(o.coordinates.ymin for o in legend_items)
                xmax = max(o.coordinates.xmax for o in legend_items)
                ymax = max(o.coordinates.ymax for o in legend_items)

                regions.append(
                    SemanticRegion(
                        id=f"region-leg-{uuid.uuid4()}",
                        region_type=RegionType.LEGEND,
                        coordinates=BoundingBox(xmin=xmin, ymin=ymin, xmax=xmax, ymax=ymax),
                        polygon=[[xmin, ymin], [xmax, ymin], [xmax, ymax], [xmin, ymax]],
                        confidence=0.90
                    )
                )

        # 5. Canvas Viewport (Remainder of sheet area)
        # Define canvas as the large area remaining after removing the title block
        if is_right_title_block:
            canvas_coords = BoundingBox(
                xmin=0.0,
                ymin=0.0,
                xmax=tb_coords.xmin,
                ymax=height
            )
        else:
            canvas_coords = BoundingBox(
                xmin=0.0,
                ymin=tb_coords.ymax,
                xmax=width,
                ymax=height
            )

        regions.append(
            SemanticRegion(
                id=f"region-canvas-{uuid.uuid4()}",
                region_type=RegionType.DRAWING_CANVAS,
                coordinates=canvas_coords,
                polygon=[
                    [canvas_coords.xmin, canvas_coords.ymin],
                    [canvas_coords.xmax, canvas_coords.ymin],
                    [canvas_coords.xmax, canvas_coords.ymax],
                    [canvas_coords.xmin, canvas_coords.ymax]
                ],
                confidence=0.98
            )
        )

        return regions
import re
