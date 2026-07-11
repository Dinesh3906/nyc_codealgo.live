import pytest

@pytest.fixture
def mock_old_regulation_text():
    return "The clear opening width of doorways shall be 32 inches minimum."

@pytest.fixture
def mock_new_regulation_text():
    return "The clear opening width of doorways shall be 36 inches minimum."
