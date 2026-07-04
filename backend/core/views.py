from rest_framework.decorators import api_view
from rest_framework.exceptions import NotFound


@api_view(["GET", "POST", "PUT", "PATCH", "DELETE"])
def api_not_found(request, *args, **kwargs):
    """Catch-all for unmatched /api/ paths so API consumers always get
    the JSON error envelope, never an HTML 404 page."""
    raise NotFound()
