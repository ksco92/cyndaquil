"""Test the output of the functions."""

import glob
import importlib
import json


def test_functions() -> None:
    """Test the output of the functions."""
    for file in glob.glob("../lib/configs/lambdas/*.json"):
        with open(file) as f:
            function_metadata = json.load(f)

        expected_result = function_metadata["expected_result"]
        event = {
            "body": json.dumps(function_metadata["test_event"]),
        }

        function_name = file.split("/")[-1].split(".")[0]
        module = importlib.import_module(f"lambdas.{function_name}")
        method = getattr(module, function_name, None)

        result = method(event, {})

        assert result["body"] == expected_result
