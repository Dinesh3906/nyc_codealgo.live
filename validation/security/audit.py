import re
from typing import Dict
from ..schemas.models import SecurityHeadersSummary

class SecurityAuditScanner:
    """
    Scans HTTP headers for OWASP compliance and validates prompt injection jailbreaks.
    """

    def scan_headers(self, headers: Dict[str, str]) -> SecurityHeadersSummary:
        """
        Audits HTTP security flags in response headers.
        """
        # Normalise header keys to lowercase
        headers_lower = {k.lower(): v for k, v in headers.items()}
        
        csp = "content-security-policy" in headers_lower
        hsts = "strict-transport-security" in headers_lower
        x_content = "x-content-type-options" in headers_lower
        x_frame = "x-frame-options" in headers_lower

        return SecurityHeadersSummary(
            content_security_policy=csp,
            strict_transport_security=hsts,
            x_content_type_options=x_content,
            x_frame_options=x_frame,
            has_prompt_injection_sanitizer=True
        )

    def detect_prompt_injection(self, query: str) -> bool:
        """
        Sanitizes user input queries for prompt injection jailbreak keywords.
        """
        patterns = [
            r"\bignore\s+(previous|prior)\s+instructions\b",
            r"\bsystem\s+override\b",
            r"\byou\s+are\s+now\s+a\s+chatbot\b",
            r"\bforget\s+all\s+rules\b",
            r"\bact\s+as\s+a\s+developer\b"
        ]

        query_lower = query.lower()
        for pat in patterns:
            if re.search(pat, query_lower):
                return True # Injection attempt detected!

        return False
