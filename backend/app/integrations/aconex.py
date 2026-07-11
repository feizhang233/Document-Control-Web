from typing import Protocol
class AconexClient(Protocol):
    """Extension contract; intentionally not implemented in version one."""
    def fetch_packages(self) -> list[dict]: ...
