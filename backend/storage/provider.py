import os
import shutil
from typing import BinaryIO
from ..config import settings

class StorageProvider:
    """
    Configurable file storage layer.
    Supports local filesystem writes and simulates AWS S3 uploads.
    """

    def __init__(self):
        self.provider = settings.STORAGE_PROVIDER.lower()
        self.local_dir = settings.LOCAL_STORAGE_DIR

        # Ensure local dir exists
        if not os.path.exists(self.local_dir):
            os.makedirs(self.local_dir)

    def save_file(self, file_name: str, file_data: BinaryIO) -> str:
        """
        Saves uploaded PDF data to the configured storage target.
        Returns the absolute filepath or S3 URL.
        """
        if self.provider == "s3":
            # Mock S3 Upload block
            try:
                import boto3
                # In production, initialize boto3 s3 client and upload
                # s3 = boto3.client('s3')
                # s3.upload_fileobj(file_data, settings.S3_BUCKET_NAME, file_name)
                return f"s3://{settings.S3_BUCKET_NAME}/{file_name}"
            except Exception:
                # Fallback to local on connection failures
                pass

        # Local storage write
        dest_path = os.path.join(self.local_dir, file_name)
        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(file_data, buffer)

        return os.path.abspath(dest_path)
