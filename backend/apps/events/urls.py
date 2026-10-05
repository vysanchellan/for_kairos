from django.urls import path

from apps.events import views

urlpatterns = [
    path("events/", views.EventCollectionView.as_view(), name="event-list"),
    path("events/<str:reference>/", views.EventDetailView.as_view(), name="event-detail"),
    path("organiser/events/", views.OrganiserEventListView.as_view(), name="organiser-event-list"),
    path("organiser/stats/", views.OrganiserStatsView.as_view(), name="organiser-stats"),
    path("admin/events/", views.AdminEventListView.as_view(), name="admin-event-list"),
    path("admin/stats/", views.AdminStatsView.as_view(), name="admin-stats"),
    path(
        "admin/events/<str:reference>/publish/",
        views.AdminPublishEventView.as_view(),
        name="admin-event-publish",
    ),
    path(
        "admin/events/<str:reference>/reject/",
        views.AdminRejectEventView.as_view(),
        name="admin-event-reject",
    ),
]
