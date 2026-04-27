from django.urls import path
from .views import DashboardView, PayoutRequestView

urlpatterns = [
    path("payouts/", PayoutRequestView.as_view(), name="payout-request"),
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
]
