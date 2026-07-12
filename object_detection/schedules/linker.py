from typing import List, Any
from ..models import SemanticBuildingObject

class ScheduleLinker:
    """
    Links extracted schedules (door, window, room, equipment) to physical
    detected objects (doors, windows, rooms) based on matching tag numbers.
    """

    def link_schedules_to_objects(
        self, 
        building_objects: List[SemanticBuildingObject],
        schedules: List[Any] # List of ParsedTable
    ) -> List[SemanticBuildingObject]:
        """
        Maps schedule table rows to detected objects by matching identifiers (e.g. 'D-1').
        Updates matched object attributes with table column details.
        """
        for table in schedules:
            headers = [h.upper().strip() for h in table.headers]
            
            # Find ID/Mark key column index (e.g. 'MARK', 'DOOR NO.', 'DOOR', 'ID')
            mark_col_idx = -1
            for idx, h in enumerate(headers):
                if any(term in h for term in ("MARK", "DOOR", "WINDOW", "TAG", "NO", "ID", "ROOM")):
                    mark_col_idx = idx
                    break
            
            if mark_col_idx == -1:
                continue

            # Identify target object class for this table type
            target_class = None
            table_type = table.table_type.lower()
            if "door" in table_type:
                target_class = "DOOR"
            elif "window" in table_type:
                target_class = "WINDOW"
            elif "room" in table_type:
                target_class = "ROOM"

            if not target_class:
                continue

            # Match each row
            for row_idx, row in enumerate(table.rows):
                if mark_col_idx >= len(row):
                    continue
                
                row_mark = row[mark_col_idx].strip()
                if not row_mark:
                    continue

                # Search for a matching detected building object
                for b_obj in building_objects:
                    if b_obj.object_class == target_class:
                        obj_tag = b_obj.attributes.get("tag", "").strip()
                        
                        # Match: e.g. door has tag 'D-1' and schedule mark is 'D-1'
                        # Or tag is substring or matches exactly
                        if obj_tag == row_mark or (obj_tag and row_mark and obj_tag.lower() in row_mark.lower()):
                            b_obj.schedule_ref = f"{table.table_type}_row_{row_idx}"
                            
                            # Merge table row values into object attributes
                            # Map headers to values
                            for col_idx, col_val in enumerate(row):
                                if col_idx < len(headers) and col_idx != mark_col_idx:
                                    header_name = headers[col_idx].lower().replace(" ", "_")
                                    b_obj.attributes[header_name] = col_val

        return building_objects
