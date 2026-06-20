from rest_framework.routers import DefaultRouter
from .views import CampaignViewSet, ResourceViewSet

router = DefaultRouter()
router.register('resources', ResourceViewSet, basename='resources')
router.register('', CampaignViewSet, basename='campaigns')
urlpatterns = router.urls
