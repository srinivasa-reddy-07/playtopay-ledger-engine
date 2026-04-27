from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include("ledger.urls")),

    # Must be LAST — hands all non-API routes to React router
    re_path(r"^.*$", TemplateView.as_view(template_name="index.html")),
]