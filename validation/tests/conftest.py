import pytest

@pytest.fixture
def mock_good_headers():
    return {
        "Content-Security-Policy": "default-src 'self'",
        "Strict-Transport-Security": "max-age=63072000",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY"
    }

@pytest.fixture
def mock_insecure_headers():
    return {
        "Content-Type": "application/json"
    }
