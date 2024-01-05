"""Get the domain name for the TS configuration."""


def get_domain_name() -> str:
    """Get the domain name for the TS configuration."""
    with open("../lib/configs/domainName.ts", "w") as f:
        content = f.read().split("\n")[0]

    return content.split("'")[-2]
