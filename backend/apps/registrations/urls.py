from django.urls import path

from apps.registrations.views import EventRegistrationsView

urlpatterns = [
    path(
        "events/<str:reference>/registrations/",
        EventRegistrationsView.as_view(),
        name="event-registrations",
    ),
]
