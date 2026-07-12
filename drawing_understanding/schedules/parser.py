from typing import List, Any, Tuple
from document_ingestion.models import Page as IngestionPage
from ..models import ParsedTable, SemanticRegion
from ..config import settings

class ScheduleTableParser:
    """
    Reconstructs tables from unstructured text objects within segmented schedule regions
    by clustering them along spatial grids (rows and columns).
    """

    def parse_table(self, page: IngestionPage, sched_region: SemanticRegion) -> ParsedTable:
        """
        Parses text objects falling inside the schedule region coordinates and builds
        a structured ParsedTable object.
        """
        box = sched_region.coordinates
        
        all_text_objs = page.text_objects + [
            type('obj', (object,), {"coordinates": o.coordinates, "text": o.text})()
            for o in page.ocr_objects
        ]

        # Filter items inside region boundary
        table_items = [
            o for o in all_text_objs
            if o.coordinates.xmin >= box.xmin - 5
            and o.coordinates.xmax <= box.xmax + 5
            and o.coordinates.ymin >= box.ymin - 5
            and o.coordinates.ymax <= box.ymax + 5
        ]

        if not table_items:
            return ParsedTable(table_type="unknown_schedule")

        # Sort top-to-bottom (highest ymax is first)
        table_items.sort(key=lambda o: o.coordinates.ymax, reverse=True)

        # 1. Group items into Rows based on vertical overlap
        rows_list: List[List[Any]] = []
        for item in table_items:
            # Skip if text is simply header name (usually containing the word 'schedule')
            if "schedule" in item.text.lower():
                continue
                
            placed = False
            item_y_center = (item.coordinates.ymin + item.coordinates.ymax) / 2.0
            
            for row in rows_list:
                # Calculate average y-center of current row elements
                row_y_center = sum((r.coordinates.ymin + r.coordinates.ymax) / 2.0 for r in row) / len(row)
                if abs(item_y_center - row_y_center) <= settings.TABLE_ROW_GAP_TOLERANCE_PTS:
                    row.append(item)
                    placed = True
                    break
            
            if not placed:
                rows_list.append([item])

        # Sort each row horizontally (xmin left-to-right)
        for row in rows_list:
            row.sort(key=lambda o: o.coordinates.xmin)

        # 2. Extract Column Bounds
        # We group x-starting coordinates across all cells to define column ranges
        x_coords = [o.coordinates.xmin for row in rows_list for o in row]
        x_coords.sort()

        col_ranges: List[Tuple[float, float]] = []
        for x in x_coords:
            placed = False
            for idx, (xmin, xmax) in enumerate(col_ranges):
                if abs(x - xmin) <= settings.TABLE_COL_GAP_TOLERANCE_PTS:
                    col_ranges[idx] = (min(xmin, x), max(xmax, x))
                    placed = True
                    break
            if not placed:
                col_ranges.append((x, x))

        col_ranges.sort(key=lambda r: r[0])

        # 3. Build Grid Matrix
        grid: List[List[str]] = []
        for row in rows_list:
            grid_row = [""] * len(col_ranges)
            for item in row:
                item_x = item.coordinates.xmin
                # Find matching column index
                best_col_idx = 0
                min_dist = float("inf")
                for col_idx, (xmin, xmax) in enumerate(col_ranges):
                    dist = min(abs(item_x - xmin), abs(item_x - xmax))
                    if dist < min_dist:
                        min_dist = dist
                        best_col_idx = col_idx
                
                # Append text to cell
                if grid_row[best_col_idx]:
                    grid_row[best_col_idx] += " " + item.text
                else:
                    grid_row[best_col_idx] = item.text
            
            grid.append(grid_row)

        # 4. Separate Headers and Rows
        headers: List[str] = []
        data_rows: List[List[str]] = []
        
        if grid:
            headers = grid[0]
            data_rows = grid[1:]

        # 5. Determine Table Type
        # Identify schedule title
        table_type = "unknown_schedule"
        combined_text = " ".join([o.text.lower() for o in table_items])
        if "door" in combined_text:
            table_type = "door_schedule"
        elif "window" in combined_text:
            table_type = "window_schedule"
        elif "finish" in combined_text:
            table_type = "finish_schedule"
        elif "room" in combined_text:
            table_type = "room_schedule"
        elif "equipment" in combined_text:
            table_type = "equipment_schedule"
        elif "material" in combined_text:
            table_type = "material_schedule"

        return ParsedTable(
            table_type=table_type,
            headers=headers,
            rows=data_rows,
            metadata={
                "row_count": len(data_rows),
                "col_count": len(col_ranges)
            }
        )
