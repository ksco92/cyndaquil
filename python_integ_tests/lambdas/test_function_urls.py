"""Test the lambda function URLs work."""

import glob
import json

import requests
from botocore.client import BaseClient


def test_functions(lambda_client: BaseClient) -> None:
    """
    Test the lambda function URLs work.

    :param lambda_client: Main client for Lambda operations.
    :return:
    """
    endpoint = "https://api.webutils.xyz"
    for file in glob.glob("../lib/configs/lambdas/*.json"):
        with open(file) as f:
            function_metadata = json.load(f)

        function_name = file.split("/")[-1].split(".")[0]
        test_event = function_metadata["test_event"]

        response = requests.post(f"{endpoint}/{function_name}", json=test_event)

        assert response.status_code == 200
