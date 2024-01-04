"""Convert a list of strings into a single SQL compatible IN clause."""

import json


def query_in_clause_generator(event: dict, __: dict) -> dict:
    """
    Convert a list of strings into a single SQL compatible IN clause.

    :param event: AWS event that triggered the function.
    :param __: AWS context of the function.
    :return: The formatted list of strings.
    """
    message = json.loads(event["body"])
    strings = message["strings"]
    list_of_strings = strings.split("\n")
    formatted_strings = ",".join([f"'{i}'" for i in list_of_strings if i != ""])

    return {
        "isBase64Encoded": False,
        "statusCode": 200,
        "body": f"in ({formatted_strings})",
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        },
    }
