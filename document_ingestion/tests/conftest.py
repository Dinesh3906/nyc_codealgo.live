import pytest
import pypdf
from unittest.mock import MagicMock

@pytest.fixture
def mock_pypdf_page():
    """Generates a mock pypdf PageObject with text and resource streams."""
    page = MagicMock(spec=pypdf.PageObject)
    page.extract_text.return_value = "FIRST FLOOR PLAN - ELECTRICAL LAYOUT"
    page.get_contents.return_value = MagicMock()
    page.get_contents.return_value.get_data.return_value = b" m 10 10 l 100 100 S m 20 20 l 200 200 S m 30 30 l 300 300 S "
    
    # Mock resources dictionary containing an image
    page.__contains__.return_value = True
    page.__getitem__.side_effect = lambda k: {
        "/Resources": {
            "/XObject": {
                "Img1": MagicMock(get=lambda sk: "/Image" if sk == "/Subtype" else None)
            }
        }
    }.get(k, {})
    
    return page

@pytest.fixture
def mock_pdf_path(tmp_path):
    """Creates a dummy text file posing as a PDF for validation tests."""
    pdf_file = tmp_path / "test_doc.pdf"
    pdf_file.write_bytes(b"%PDF-1.7\n%dummy pdf stream")
    return str(pdf_file)
