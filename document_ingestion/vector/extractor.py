import uuid
import pdfplumber
from typing import List, Tuple, Dict, Any
from ..models import (
    TextObject, GeometryObject, ImageObject, BoundingBox, 
    CoordinateSystem, CoordinateSystemType, GeometryObjectType
)

class VectorExtractor:
    """
    Extracts high-fidelity vector primitives, text blocks, fonts,
    and embedded images from native PDF streams using pdfplumber.
    """

    def _match_font_details(self, word: Dict[str, Any], chars: List[Dict[str, Any]]) -> Tuple[str, float]:
        """
        Finds the matching font name and font size for a given word
        by querying overlapping character objects.
        """
        word_x0, word_top, word_x1, word_bottom = word["x0"], word["top"], word["x1"], word["bottom"]
        
        matching_chars = [
            c for c in chars
            if c["x0"] >= word_x0 - 1 and c["x1"] <= word_x1 + 1
            and c["top"] >= word_top - 1 and c["bottom"] <= word_bottom + 1
        ]
        
        if not matching_chars:
            return "Unknown-Font", 10.0

        # Retrieve the most common font name and size in matching characters
        fonts = [c.get("fontname", "Unknown-Font") for c in matching_chars]
        sizes = [c.get("size", 10.0) for c in matching_chars]
        
        most_common_font = max(set(fonts), key=fonts.count)
        avg_size = sum(sizes) / len(sizes)
        
        return most_common_font, avg_size

    def extract_page_data(
        self, 
        pdf_path: str, 
        page_idx: int
    ) -> Tuple[List[TextObject], List[GeometryObject], List[ImageObject], Dict[str, Any]]:
        """
        Parses a single vector page and returns native Text, Geometry, and Image objects.
        """
        text_objects: List[TextObject] = []
        geometry_objects: List[GeometryObject] = []
        image_objects: List[ImageObject] = []
        metadata: Dict[str, Any] = {}

        with pdfplumber.open(pdf_path) as pdf:
            if page_idx < 0 or page_idx >= len(pdf.pages):
                raise IndexError(f"Page index {page_idx} is out of bounds for PDF.")

            page = pdf.pages[page_idx]
            
            # Setup Coordinate System
            # Note: pdfplumber uses a top-left origin coordinate system.
            # We map this to PDF coordinates where origin is bottom-left.
            page_width = float(page.width)
            page_height = float(page.height)
            
            coord_sys = CoordinateSystem(
                system_type=CoordinateSystemType.PDF,
                width=page_width,
                height=page_height
            )

            # 1. Extract Text
            words = page.extract_words()
            chars = page.chars

            for word in words:
                font_name, font_size = self._match_font_details(word, chars)
                
                # Convert top-left (pdfplumber) to bottom-left (Standard PDF) coordinate system
                # pdfplumber bounding coordinates: x0, top, x1, bottom
                xmin = float(word["x0"])
                xmax = float(word["x1"])
                ymin = page_height - float(word["bottom"])
                ymax = page_height - float(word["top"])

                text_objects.append(
                    TextObject(
                        id=f"text-{uuid.uuid4()}",
                        page_idx=page_idx,
                        coordinates=BoundingBox(xmin=xmin, ymin=ymin, xmax=xmax, ymax=ymax),
                        coordinate_system=coord_sys,
                        confidence=1.0,
                        source="vector_stream_parser",
                        processing_method="pdf_vector_extraction",
                        text=word["text"],
                        font_name=font_name,
                        font_size=font_size
                    )
                )

            # 2. Extract Geometry - Lines
            for line in page.lines:
                xmin = float(line["x0"])
                xmax = float(line["x1"])
                ymin = page_height - float(line["bottom"])
                ymax = page_height - float(line["top"])
                
                points = [
                    [float(line["x0"]), page_height - float(line["y0"])],
                    [float(line["x1"]), page_height - float(line["y1"])]
                ]

                geometry_objects.append(
                    GeometryObject(
                        id=f"geom-line-{uuid.uuid4()}",
                        page_idx=page_idx,
                        coordinates=BoundingBox(xmin=xmin, ymin=ymin, xmax=xmax, ymax=ymax),
                        coordinate_system=coord_sys,
                        confidence=1.0,
                        source="vector_stream_parser",
                        processing_method="pdf_vector_extraction",
                        geom_type=GeometryObjectType.LINE,
                        points=points,
                        metadata={"linewidth": float(line.get("linewidth", 1.0))}
                    )
                )

            # Extract Geometry - Rectangles
            for rect in page.rects:
                xmin = float(rect["x0"])
                xmax = float(rect["x1"])
                ymin = page_height - float(rect["bottom"])
                ymax = page_height - float(rect["top"])
                
                points = [
                    [xmin, ymin],
                    [xmax, ymin],
                    [xmax, ymax],
                    [xmin, ymax],
                    [xmin, ymin] # Closed loop
                ]

                geometry_objects.append(
                    GeometryObject(
                        id=f"geom-rect-{uuid.uuid4()}",
                        page_idx=page_idx,
                        coordinates=BoundingBox(xmin=xmin, ymin=ymin, xmax=xmax, ymax=ymax),
                        coordinate_system=coord_sys,
                        confidence=1.0,
                        source="vector_stream_parser",
                        processing_method="pdf_vector_extraction",
                        geom_type=GeometryObjectType.RECTANGLE,
                        points=points
                    )
                )

            # Extract Geometry - Polylines and complex Paths
            for path in page.paths:
                # Compile bounds
                pts = []
                xs, ys = [], []
                
                # Check for line and segment operators
                for segment in path.get("segments", []):
                    # Segments typically list points as tuples
                    for pt in segment:
                        if isinstance(pt, (tuple, list)) and len(pt) >= 2:
                            x, y = float(pt[0]), page_height - float(pt[1])
                            pts.append([x, y])
                            xs.append(x)
                            ys.append(y)
                
                if pts:
                    xmin, xmax = min(xs), max(xs)
                    ymin, ymax = min(ys), max(ys)

                    geometry_objects.append(
                        GeometryObject(
                            id=f"geom-path-{uuid.uuid4()}",
                            page_idx=page_idx,
                            coordinates=BoundingBox(xmin=xmin, ymin=ymin, xmax=xmax, ymax=ymax),
                            coordinate_system=coord_sys,
                            confidence=1.0,
                            source="vector_stream_parser",
                            processing_method="pdf_vector_extraction",
                            geom_type=GeometryObjectType.POLYLINE,
                            points=pts
                        )
                    )

            # 3. Extract Embedded Images
            for img in page.images:
                xmin = float(img["x0"])
                xmax = float(img["x1"])
                ymin = page_height - float(img["bottom"])
                ymax = page_height - float(img["top"])

                image_objects.append(
                    ImageObject(
                        id=f"img-embed-{uuid.uuid4()}",
                        page_idx=page_idx,
                        coordinates=BoundingBox(xmin=xmin, ymin=ymin, xmax=xmax, ymax=ymax),
                        coordinate_system=coord_sys,
                        confidence=1.0,
                        source="vector_stream_parser",
                        processing_method="pdf_vector_extraction",
                        image_format="raw_stream",
                        width=int(img["width"]),
                        height=int(img["height"])
                    )
                )

            metadata = {
                "width": page_width,
                "height": page_height,
                "text_object_count": len(text_objects),
                "geometry_object_count": len(geometry_objects),
                "image_object_count": len(image_objects)
            }

        return text_objects, geometry_objects, image_objects, metadata
