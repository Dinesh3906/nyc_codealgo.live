import os
import shutil
from typing import BinaryIO
from ..config import settings

class StorageProvider:
    """
    Configurable file storage layer.
    Supports local filesystem writes and real AWS S3 uploads.
    """

    def __init__(self):
        self.provider = settings.STORAGE_PROVIDER.lower()
        self.local_dir = settings.LOCAL_STORAGE_DIR

        if self.provider == "local" and not os.path.exists(self.local_dir):
            os.makedirs(self.local_dir)

    def save_file(self, file_name: str, file_data: BinaryIO) -> str:
        """
        Saves uploaded PDF data to the configured storage target.
        Returns the absolute filepath or S3 URL.
        """
        safe_name = os.path.basename(file_name)
        if not safe_name:
            raise ValueError("Uploaded file name is empty.")

        if self.provider == "s3":
            try:
                import boto3
            except ImportError as exc:
                raise RuntimeError("boto3 is required when STORAGE_PROVIDER=s3.") from exc

            if not settings.S3_BUCKET_NAME:
                raise RuntimeError("S3_BUCKET_NAME must be configured when STORAGE_PROVIDER=s3.")

            s3 = boto3.client("s3")
            s3.upload_fileobj(file_data, settings.S3_BUCKET_NAME, safe_name)
            return f"s3://{settings.S3_BUCKET_NAME}/{safe_name}"

        if self.provider != "local":
            raise RuntimeError(f"Unsupported STORAGE_PROVIDER configured: {self.provider}")

        # Local storage write
        dest_path = os.path.join(self.local_dir, safe_name)
        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(file_data, buffer)

        return os.path.abspath(dest_path)
