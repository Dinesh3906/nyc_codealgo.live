import pytest
import numpy as np
from PIL import Image
from document_ingestion.preprocessing.filters import ImagePreprocessor

def test_cv2_conversion():
    # Create simple pillow image
    img = Image.new("RGB", (100, 100), color="white")
    img_np = ImagePreprocessor.to_cv2(img)
    
    assert isinstance(img_np, np.ndarray)
    assert img_np.shape == (100, 100, 3)
    # White BGR pixel
    assert np.all(img_np == 255)

def test_image_preprocessing():
    # Create simple image containing black line on white background (skewed)
    img_np = np.ones((200, 200, 3), dtype=np.uint8) * 255
    # Draw a line at angle
    cv2_img = cv2_draw_dummy_line(img_np)
    
    pil_img = ImagePreprocessor.to_pil(cv2_img)
    processed = ImagePreprocessor.preprocess_sheet(pil_img, run_deskew=True, run_enhancement=False)
    
    assert isinstance(processed, Image.Image)
    assert processed.size[0] >= 200

def cv2_draw_dummy_line(img):
    import cv2
    # Draw a line from (50, 60) to (150, 70) -> Slight skew
    return cv2.line(img, (50, 60), (150, 70), (0, 0, 0), 2)
