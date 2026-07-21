from django.contrib import admin
from django.contrib.auth import get_user_model
from django.db.models import Sum


def _dashboard_context():
    from apps.charity.models import DirectDonation, Donation, Project

    User = get_user_model()
    donations_sum = (
        Donation.objects.filter(status='success').aggregate(total=Sum('amount'))['total'] or 0
    )
    return {
        'projects_total': Project.objects.count(),
        'projects_active': Project.objects.filter(status='active').count(),
        'projects_pending': Project.objects.filter(status='pending').count(),
        'donations_count': Donation.objects.count(),
        'donations_sum': f'{donations_sum:,.0f}',
        'transfers_total': DirectDonation.objects.count(),
        'transfers_pending': DirectDonation.objects.filter(status='pending').count(),
        'users_total': User.objects.count(),
        'users_staff': User.objects.filter(is_staff=True).count(),
    }


_original_index = admin.site.index


def _custom_index(request, extra_context=None):
    extra_context = extra_context or {}
    try:
        extra_context['dashboard'] = _dashboard_context()
    except Exception:
        # During migrations / empty DB, still render admin
        extra_context['dashboard'] = {
            'projects_total': 0,
            'projects_active': 0,
            'projects_pending': 0,
            'donations_count': 0,
            'donations_sum': '0',
            'transfers_total': 0,
            'transfers_pending': 0,
            'users_total': 0,
            'users_staff': 0,
        }
    return _original_index(request, extra_context=extra_context)


def configure_admin():
    """Brand default admin site and attach dashboard stats."""
    admin.site.site_header = 'الجسد الواحد — الإدارة'
    admin.site.site_title = 'الجسد الواحد'
    admin.site.index_title = 'لوحة التحكم'
    admin.site.site_url = '/'
    admin.site.enable_nav_sidebar = True
    admin.site.index = _custom_index
