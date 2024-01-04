"""Main integ test fixtures and configs."""

import boto3
import pytest
from botocore.client import BaseClient


@pytest.fixture
def lambda_client() -> BaseClient:
    """Create a client for Lambda operations."""
    client = boto3.client("lambda")
    return client
