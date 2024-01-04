"""Convert a string into a formatted JSON string."""

import json


def format_json(event: dict, __: dict) -> dict:
    """
    Convert a string into a formatted JSON string.

    :param event: AWS event that triggered the function.
    :param __: AWS context of the function.
    :return: The formatted JSON string.
    """
    message = json.loads(event["body"])
    indent = message["indent"]
    input_string = json.loads(message["input_string"])
    sort_keys = message["indent"]

    return {
        "isBase64Encoded": False,
        "statusCode": 200,
        "body": json.dumps(input_string, indent=indent, sort_keys=sort_keys),
    }
