"""Convert a string into a formatted JSON string."""

import json
import traceback

from utils.default_response_headers import default_response_headers


def format_json(event: dict, __: dict) -> dict:
    """
    Convert a string into a formatted JSON string.

    :param event: AWS event that triggered the function.
    :param __: AWS context of the function.
    :return: The formatted JSON string.
    """
    try:
        message = json.loads(event["body"])
        indent = int(message["indent"])
        input_string = json.loads(message["input_string"])
        sort_keys = True if message["sort_keys"] == "True" else False

        return {
            "isBase64Encoded": False,
            "statusCode": 200,
            "body": json.dumps(input_string, indent=indent, sort_keys=sort_keys),
            "headers": default_response_headers(),
        }

    except:
        return {
            "isBase64Encoded": False,
            "statusCode": 500,
            "body": traceback.format_exc(),
            "headers": default_response_headers(),
        }
