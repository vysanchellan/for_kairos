"""URL root. Everything lives under the versioned ``/api/v1/`` prefix."""

from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.core.views import HealthView, OrganiserDirectoryView

api_v1 = [
    path("health/", HealthView.as_view(), name="health"),
    path("organisers/", OrganiserDirectoryView.as_view(), name="organiser-directory"),
    path("", include("apps.events.urls")),
    path("", include("apps.registrations.urls")),
    path("", include("apps.activity.urls")),
]

urlpatterns = [
    path("api/v1/", include(api_v1)),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
]

handler400 = "apps.core.handlers.json_bad_request"
handler403 = "apps.core.handlers.json_forbidden"
handler404 = "apps.core.handlers.json_not_found"
handler500 = "apps.core.handlers.json_server_error"
