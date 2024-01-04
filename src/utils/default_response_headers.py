"""Default response headers for Lambda functions."""


def default_response_headers():
    """Default response headers for Lambda functions."""
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }
