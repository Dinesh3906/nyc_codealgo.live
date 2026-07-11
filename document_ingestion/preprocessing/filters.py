import cv2
import numpy as np
from PIL import Image

class ImagePreprocessor:
    """
    Applies computer vision filters to enhance, deskew, and clean raster drawing sheets.
    """

    @staticmethod
    def to_cv2(image: Image.Image) -> np.ndarray:
        """Converts a Pillow image to a NumPy BGR format array."""
        # Convert RGB to BGR
        open_cv_image = np.array(image.convert("RGB"))
        return open_cv_image[:, :, ::-1].copy()

    @staticmethod
    def to_pil(image_np: np.ndarray) -> Image.Image:
        """Converts a NumPy BGR format array to a Pillow RGB image."""
        # Convert BGR to RGB
        rgb_image = cv2.cvtColor(image_np, cv2.COLOR_BGR2RGB)
        return Image.fromarray(rgb_image)

    @classmethod
    def apply_clahe(cls, image_np: np.ndarray, clip_limit: float = 2.0, tile_grid_size: int = 8) -> np.ndarray:
        """
        Applies Contrast Limited Adaptive Histogram Equalization (CLAHE) to enhance thin line profiles.
        """
        # Convert to grayscale
        gray = cv2.cvtColor(image_np, cv2.COLOR_BGR2GRAY)
        
        # Apply CLAHE
        clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(tile_grid_size, tile_grid_size))
        enhanced_gray = clahe.apply(gray)
        
        # Convert back to BGR structure
        return cv2.cvtColor(enhanced_gray, cv2.COLOR_GRAY2BGR)

    @classmethod
    def remove_noise(cls, image_np: np.ndarray) -> np.ndarray:
        """
        Removes salt-and-pepper noise and speckles using bilateral filtering to preserve edge lines.
        """
        # Bilateral filter preserves sharp drawing boundaries while smoothing flat regions
        return cv2.bilateralFilter(image_np, d=9, sigmaColor=75, sigmaSpace=75)

    @classmethod
    def detect_skew_angle(cls, image_np: np.ndarray, max_angle: float = 10.0) -> float:
        """
        Detects the dominant skew angle using Hough line transform coordinates.
        """
        gray = cv2.cvtColor(image_np, cv2.COLOR_BGR2GRAY)
        # Invert colors (drawings are black lines on white paper)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]

        # Use Hough Lines to find lines
        lines = cv2.HoughLinesP(thresh, 1, np.pi / 180, 100, minLineLength=100, maxLineGap=10)
        
        angles = []
        if lines is not None:
            for line in lines:
                coords = line.flatten()
                if len(coords) < 4:
                    continue
                x1, y1, x2, y2 = coords[:4]
                angle = np.degrees(np.arctan2(y2 - y1, x2 - x1))
                # Focus only on horizontal/vertical skew alignments
                if -max_angle <= angle <= max_angle:
                    angles.append(angle)
                elif 90 - max_angle <= angle <= 90 + max_angle:
                    angles.append(angle - 90)
                elif -90 - max_angle <= angle <= -90 + max_angle:
                    angles.append(angle + 90)

        return float(np.median(angles)) if angles else 0.0

    @classmethod
    def rotate_image(cls, image_np: np.ndarray, angle: float) -> np.ndarray:
        """Rotates the image by a specific angle around its center, adding white borders."""
        if abs(angle) < 0.01:
            return image_np

        h, w = image_np.shape[:2]
        center = (w // 2, h // 2)
        
        # Get rotation matrix
        matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
        
        # Calculate bounding box sizing to prevent crop
        cos = np.abs(matrix[0, 0])
        sin = np.abs(matrix[0, 1])
        new_w = int((h * sin) + (w * cos))
        new_h = int((h * cos) + (w * sin))
        
        # Adjust transformation matrix center
        matrix[0, 2] += (new_w / 2) - center[0]
        matrix[1, 2] += (new_h / 2) - center[1]
        
        # Rotate image with white background fill
        return cv2.warpAffine(
            image_np, 
            matrix, 
            (new_w, new_h), 
            flags=cv2.INTER_CUBIC, 
            borderMode=cv2.BORDER_CONSTANT, 
            borderValue=(255, 255, 255)
        )

    @classmethod
    def apply_adaptive_threshold(cls, image_np: np.ndarray) -> np.ndarray:
        """
        Binarizes the image using adaptive Gaussian thresholding to generate clean line outputs.
        """
        gray = cv2.cvtColor(image_np, cv2.COLOR_BGR2GRAY)
        binary = cv2.adaptiveThreshold(
            gray, 
            255, 
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY, 
            11, 
            2
        )
        return cv2.cvtColor(binary, cv2.COLOR_GRAY2BGR)

    @classmethod
    def preprocess_sheet(cls, image: Image.Image, run_deskew: bool = True, run_enhancement: bool = True) -> Image.Image:
        """
        Runs the complete pre-processing pipeline on an input Pillow Image.
        """
        img_np = cls.to_cv2(image)
        
        if run_enhancement:
            img_np = cls.apply_clahe(img_np)
            img_np = cls.remove_noise(img_np)
            
        if run_deskew:
            skew_angle = cls.detect_skew_angle(img_np)
            if abs(skew_angle) > 0.1:
                img_np = cls.rotate_image(img_np, skew_angle)
                
        img_np = cls.apply_adaptive_threshold(img_np)
        
        return cls.to_pil(img_np)
