from django.urls import path
from .views import (
    all_subscribers, export_all, import_all, subscriber_detail, add_subscriber,
    low_engagement, bulk_delete, groups, group_detail, move_subscribers,
)

urlpatterns = [
    path("all/", all_subscribers),
    path("export/", export_all),
    path("import/", import_all),
    path("add/", add_subscriber),
    path("groups/", groups),
    path("groups/<int:pk>/", group_detail),
    path("low-engagement/", low_engagement),
    path("bulk-delete/", bulk_delete),
    path("move/", move_subscribers),
    path("<uuid:pk>/", subscriber_detail),
]
