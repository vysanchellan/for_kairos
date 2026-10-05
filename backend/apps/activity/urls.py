from django.urls import path

from apps.activity.views import ActivityFeedView

urlpatterns = [
    path("admin/activity/", ActivityFeedView.as_view(), name="activity-feed"),
]
