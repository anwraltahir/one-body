from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import admin_api

router = DefaultRouter()
router.register('projects', views.ProjectViewSet, basename='project')
router.register('donations', views.DonationViewSet, basename='donation')

urlpatterns = [
    path('health/', views.HealthView.as_view(), name='health'),
    path('categories/', views.CategoriesView.as_view(), name='categories'),
    path('settings/', views.SiteSettingsView.as_view(), name='site_settings'),
    path('pages/', views.PageContentView.as_view(), name='pages'),
    path('pages/<slug:key>/', views.PageContentView.as_view(), name='page_detail'),
    path('donations/create/', views.CreateDonationView.as_view(), name='donation_create'),
    path('direct-donations/', views.DirectDonationCreateView.as_view(), name='direct_donation_create'),

    # Admin control panel API
    path('admin/dashboard/', admin_api.AdminDashboardView.as_view()),
    path('admin/projects/', admin_api.AdminProjectsView.as_view()),
    path('admin/projects/<int:pk>/<str:action>/', admin_api.AdminProjectActionView.as_view()),
    path('admin/donations/', admin_api.AdminDonationsView.as_view()),
    path('admin/donations/<int:pk>/<str:action>/', admin_api.AdminDonationActionView.as_view()),
    path('admin/transfers/', admin_api.AdminTransfersView.as_view()),
    path('admin/transfers/<int:pk>/<str:action>/', admin_api.AdminTransferActionView.as_view()),
    path('admin/users/', admin_api.AdminUsersView.as_view()),
    path('admin/users/<int:pk>/', admin_api.AdminUserActionView.as_view()),
    path('admin/banks/', admin_api.AdminBankAccountsView.as_view()),
    path('admin/banks/<int:pk>/', admin_api.AdminBankAccountsView.as_view()),
    path('admin/notifications/', admin_api.AdminNotificationsView.as_view()),
    path('admin/reports/', admin_api.AdminReportsView.as_view()),

    path('', include(router.urls)),
]
