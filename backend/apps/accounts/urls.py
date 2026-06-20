from django.urls import path
from .views import (
    RegisterView, MeView, ChangePasswordView, email_providers, test_email,
    AdminUserListView, AdminUserDetailView, db_export,
)

urlpatterns = [
    path("register/", RegisterView.as_view()),
    path("me/", MeView.as_view()),
    path("change-password/", ChangePasswordView.as_view()),
    path("email-providers/", email_providers),
    path("test-email/", test_email),
    # admin-only
    path("users/", AdminUserListView.as_view()),
    path("users/<int:pk>/", AdminUserDetailView.as_view()),
    path("db-export/", db_export),
]
