import secrets
from fastapi import Header, HTTPException, status
from app.config import settings


async def verify_internal_service_key(
    x_internal_service_key: str = Header(
        None,
        alias="X-Internal-Service-Key",
        description="Shared secret key for authenticating trusted Express backend calls",
    ),
):
    """
    Security gate restricting the OCR/NLP microservice strictly to the trusted HMS backend.
    Rejects any unauthenticated or external caller.
    """
    expected_secret = settings.OCR_SERVICE_SECRET

    if not expected_secret:
        # In production, an empty secret is a critical configuration failure
        if settings.ENVIRONMENT == "production":
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="OCR_SERVICE_SECRET is not configured in production environment.",
            )
        # Development fallback
        expected_secret = "dev_internal_ocr_secret_2026"

    if not x_internal_service_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Missing X-Internal-Service-Key header.",
        )

    # Constant-time comparison to prevent timing attacks
    if not secrets.compare_digest(x_internal_service_key, expected_secret):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Invalid internal service credential.",
        )

    return True
