from django.urls import include, path, re_path

from core.views import api_not_found

urlpatterns = [
    path("api/", include("submissions.urls")),
    re_path(r"^api/", api_not_found),
]
