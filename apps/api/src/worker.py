"""The Cloudflare Python Worker entry point.

It runs only inside the Workers runtime (`pywrangler dev`), where the
`workers` and `asgi` modules exist, so it is outside the tested package.
"""

import asgi
from workers import WorkerEntrypoint

from soccer_cards_api.app import create_app

app = create_app()


class Default(WorkerEntrypoint):
    """Hands each request to the FastAPI app through the ASGI adapter."""

    async def fetch(self, request: object) -> object:
        """Answer one request."""
        return await asgi.fetch(app, request, self.env)
