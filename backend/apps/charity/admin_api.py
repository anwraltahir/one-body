"""
Professional admin control API — superuser / staff / role=admin only.
"""
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count, Sum, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    AdminNotification,
    BankAccount,
    Category,
    ContactMessage,
    DirectDonation,
    Donation,
    Project,
    SiteSettings,
)
from .serializers import (
    AdminNotificationSerializer,
    BankAccountSerializer,
    DonationSerializer,
    ProjectSerializer,
    apply_donation_to_project,
)

User = get_user_model()


class IsPlatformAdmin(permissions.BasePermission):
    """Superuser, staff, or role=admin."""

    def has_permission(self, request, view):
        u = request.user
        return bool(
            u
            and u.is_authenticated
            and (u.is_superuser or u.is_staff or getattr(u, 'role', None) == 'admin')
        )


class IsSuperUserOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


class AdminDashboardView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        donations_ok = Donation.objects.filter(status='success')
        donations_pending = Donation.objects.filter(status='pending')
        donations_sum = donations_ok.aggregate(t=Sum('amount'))['t'] or Decimal('0')
        pending_sum = donations_pending.aggregate(t=Sum('amount'))['t'] or Decimal('0')
        transfers_pending = DirectDonation.objects.filter(status='pending')
        transfers_sum = transfers_pending.aggregate(t=Sum('amount'))['t'] or Decimal('0')

        by_category = list(
            Project.objects.values('category')
            .annotate(count=Count('id'), raised=Sum('current_amount'))
            .order_by('-count')
        )
        recent_days = list(
            Donation.objects.filter(status='success', created_at__gte=timezone.now() - timezone.timedelta(days=30))
            .annotate(day=TruncDate('created_at'))
            .values('day')
            .annotate(total=Sum('amount'), count=Count('id'))
            .order_by('day')
        )

        return Response({
            'projects': {
                'total': Project.objects.count(),
                'pending': Project.objects.filter(status='pending').count(),
                'active': Project.objects.filter(status='active').count(),
                'inactive': Project.objects.filter(status='inactive').count(),
                'completed': Project.objects.filter(status='completed').count(),
                'rejected': Project.objects.filter(status='rejected').count(),
            },
            'donations': {
                'total': Donation.objects.count(),
                'pending': donations_pending.count(),
                'success': donations_ok.count(),
                'failed': Donation.objects.filter(status='failed').count(),
                'verifiedSum': float(donations_sum),
                'pendingSum': float(pending_sum),
            },
            'transfers': {
                'total': DirectDonation.objects.count(),
                'pending': transfers_pending.count(),
                'pendingSum': float(transfers_sum),
                'approved': DirectDonation.objects.filter(status='approved').count(),
            },
            'users': {
                'total': User.objects.count(),
                'active': User.objects.filter(is_active=True).count(),
                'staff': User.objects.filter(Q(is_staff=True) | Q(role='admin')).count(),
                'superusers': User.objects.filter(is_superuser=True).count(),
            },
            'notificationsUnread': AdminNotification.objects.filter(is_read=False).count(),
            'messagesNew': ContactMessage.objects.filter(status='new').count(),
            'byCategory': [
                {
                    'category': r['category'] or '—',
                    'count': r['count'],
                    'raised': float(r['raised'] or 0),
                }
                for r in by_category
            ],
            'dailyDonations': [
                {
                    'day': r['day'].isoformat() if r['day'] else None,
                    'total': float(r['total'] or 0),
                    'count': r['count'],
                }
                for r in recent_days
            ],
            'bankAccounts': BankAccount.objects.filter(is_active=True).count(),
        })


class AdminProjectsView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        qs = Project.objects.select_related('creator').all()
        status_param = request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)
        search = request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(title__icontains=search)
                | Q(description__icontains=search)
                | Q(creator_name__icontains=search)
            )
        qs = qs.order_by('-created_at')[:200]
        return Response(ProjectSerializer(qs, many=True).data)


class AdminProjectActionView(APIView):
    permission_classes = [IsPlatformAdmin]

    def post(self, request, pk, action):
        try:
            project = Project.objects.get(pk=pk)
        except Project.DoesNotExist:
            return Response({'detail': 'المشروع غير موجود'}, status=404)

        notes = request.data.get('adminNotes') or request.data.get('admin_notes') or ''
        if notes:
            project.admin_notes = notes

        action = action.lower()
        if action == 'approve':
            project.status = 'active'
        elif action == 'reject':
            project.status = 'rejected'
        elif action in ('deactivate', 'pause', 'stop'):
            project.status = 'inactive'
        elif action in ('activate', 'resume'):
            project.status = 'active'
        elif action == 'complete':
            project.status = 'completed'
        elif action == 'feature':
            project.is_featured = True
        elif action == 'unfeature':
            project.is_featured = False
        else:
            return Response({'detail': f'إجراء غير معروف: {action}'}, status=400)

        project.save()
        return Response(ProjectSerializer(project).data)


class AdminDonationsView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        qs = Donation.objects.select_related('project', 'donor', 'bank_account').all()
        status_param = request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)
        qs = qs.order_by('-created_at')[:300]
        return Response(DonationSerializer(qs, many=True, context={'request': request}).data)


class AdminDonationActionView(APIView):
    permission_classes = [IsPlatformAdmin]

    def post(self, request, pk, action):
        try:
            donation = Donation.objects.select_related('project').get(pk=pk)
        except Donation.DoesNotExist:
            return Response({'detail': 'التبرع غير موجود'}, status=404)

        notes = request.data.get('adminNotes') or request.data.get('admin_notes') or ''
        action = action.lower()

        if action in ('approve', 'verify'):
            donation.status = 'success'
            donation.reviewed_by = request.user
            donation.reviewed_at = timezone.now()
            if notes:
                donation.admin_notes = notes
            donation.save()
            apply_donation_to_project(donation)
            donation.refresh_from_db()
        elif action in ('reject',):
            donation.status = 'failed'
            donation.reviewed_by = request.user
            donation.reviewed_at = timezone.now()
            if notes:
                donation.admin_notes = notes
            donation.save()
        else:
            return Response({'detail': f'إجراء غير معروف: {action}'}, status=400)

        return Response(DonationSerializer(donation, context={'request': request}).data)


class AdminTransfersView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        qs = DirectDonation.objects.select_related('bank_account', 'project').all()
        status_param = request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)
        qs = qs.order_by('-created_at')[:200]
        data = []
        for t in qs:
            receipt = ''
            if t.receipt_file:
                receipt = t.receipt_file.url
            elif t.receipt_image:
                receipt = t.receipt_image
            data.append({
                'id': t.id,
                'donationType': t.donation_type,
                'amount': float(t.amount),
                'donorName': t.donor_name,
                'donorPhone': t.donor_phone,
                'status': t.status,
                'receiptImage': receipt,
                'projectId': t.project_id,
                'projectTitle': t.project.title if t.project_id else '',
                'bankAccountName': str(t.bank_account) if t.bank_account_id else '',
                'createdAt': t.created_at,
                'adminNotes': t.admin_notes,
            })
        return Response(data)


class AdminTransferActionView(APIView):
    permission_classes = [IsPlatformAdmin]

    def post(self, request, pk, action):
        try:
            transfer = DirectDonation.objects.select_related('project').get(pk=pk)
        except DirectDonation.DoesNotExist:
            return Response({'detail': 'التحويل غير موجود'}, status=404)

        notes = request.data.get('adminNotes') or ''
        action = action.lower()

        if action in ('approve', 'verify'):
            transfer.status = 'approved'
            transfer.reviewed_by = request.user
            transfer.reviewed_at = timezone.now()
            if notes:
                transfer.admin_notes = notes
            transfer.save()
            # If linked to a project, credit it
            if transfer.project_id and not transfer.amount_applied:
                with transaction.atomic():
                    from django.db.models import F
                    Project.objects.filter(pk=transfer.project_id).update(
                        current_amount=F('current_amount') + transfer.amount,
                        donor_count=F('donor_count') + 1,
                    )
                    transfer.amount_applied = True
                    transfer.save(update_fields=['amount_applied'])
        elif action == 'reject':
            transfer.status = 'rejected'
            transfer.reviewed_by = request.user
            transfer.reviewed_at = timezone.now()
            if notes:
                transfer.admin_notes = notes
            transfer.save()
        else:
            return Response({'detail': f'إجراء غير معروف: {action}'}, status=400)

        return Response({'id': transfer.id, 'status': transfer.status})


class AdminUsersView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        qs = User.objects.all().order_by('-date_joined')[:300]
        search = request.query_params.get('search')
        if search:
            qs = User.objects.filter(
                Q(email__icontains=search)
                | Q(display_name__icontains=search)
                | Q(phone__icontains=search)
            ).order_by('-date_joined')[:300]
        return Response([
            {
                'uid': str(u.pk),
                'email': u.email,
                'displayName': u.display_name,
                'phone': u.phone,
                'role': u.role,
                'isActive': u.is_active,
                'isStaff': u.is_staff,
                'isSuperuser': u.is_superuser,
                'dateJoined': u.date_joined,
                'lastLogin': u.last_login,
                'projectsCount': u.projects.count(),
                'donationsCount': u.donations.count(),
            }
            for u in qs
        ])


class AdminUserActionView(APIView):
    permission_classes = [IsPlatformAdmin]

    def patch(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'المستخدم غير موجود'}, status=404)

        # Only superuser can promote to superuser / demote staff of others
        data = request.data
        if 'isActive' in data or 'is_active' in data:
            val = data.get('isActive', data.get('is_active'))
            if user.is_superuser and user.pk == request.user.pk:
                return Response({'detail': 'لا يمكن تعطيل حسابك كسوبر يوزر'}, status=400)
            user.is_active = bool(val)

        if 'role' in data:
            if not request.user.is_superuser:
                return Response({'detail': 'تعيين الأدوار للسوبر يوزر فقط'}, status=403)
            role = data['role']
            if role not in ('user', 'admin'):
                return Response({'detail': 'دور غير صالح'}, status=400)
            user.role = role
            if role == 'admin':
                user.is_staff = True
            elif not user.is_superuser:
                user.is_staff = False

        if 'isStaff' in data or 'is_staff' in data:
            if not request.user.is_superuser:
                return Response({'detail': 'صلاحية staff للسوبر يوزر فقط'}, status=403)
            user.is_staff = bool(data.get('isStaff', data.get('is_staff')))

        if 'displayName' in data or 'display_name' in data:
            user.display_name = data.get('displayName') or data.get('display_name') or user.display_name

        if 'phone' in data:
            user.phone = data.get('phone') or ''

        user.save()
        return Response({
            'uid': str(user.pk),
            'email': user.email,
            'displayName': user.display_name,
            'phone': user.phone,
            'role': user.role,
            'isActive': user.is_active,
            'isStaff': user.is_staff,
            'isSuperuser': user.is_superuser,
        })


class AdminBankAccountsView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        qs = BankAccount.objects.all().order_by('sort_order', 'bank_name')
        return Response(BankAccountSerializer(qs, many=True).data)

    def post(self, request):
        ser = BankAccountSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        obj = ser.save()
        return Response(BankAccountSerializer(obj).data, status=201)

    def patch(self, request, pk=None):
        if pk is None:
            return Response({'detail': 'مطلوب id'}, status=400)
        try:
            obj = BankAccount.objects.get(pk=pk)
        except BankAccount.DoesNotExist:
            return Response({'detail': 'غير موجود'}, status=404)
        ser = BankAccountSerializer(obj, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)

    def delete(self, request, pk=None):
        if pk is None:
            return Response({'detail': 'مطلوب id'}, status=400)
        BankAccount.objects.filter(pk=pk).delete()
        return Response(status=204)


class AdminNotificationsView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        qs = AdminNotification.objects.all()[:100]
        unread = AdminNotification.objects.filter(is_read=False).count()
        return Response({
            'unread': unread,
            'items': AdminNotificationSerializer(qs, many=True).data,
        })

    def post(self, request):
        """Mark notifications as read. Body: { ids: [] } or { all: true }"""
        if request.data.get('all'):
            AdminNotification.objects.filter(is_read=False).update(is_read=True)
        else:
            ids = request.data.get('ids') or []
            AdminNotification.objects.filter(pk__in=ids).update(is_read=True)
        return Response({'ok': True, 'unread': AdminNotification.objects.filter(is_read=False).count()})


class AdminReportsView(APIView):
    """Aggregated report data for printing / export."""

    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        site = SiteSettings.load()
        projects = Project.objects.all().order_by('-created_at')
        donations = Donation.objects.filter(status='success')
        total_raised = donations.aggregate(t=Sum('amount'))['t'] or Decimal('0')
        pending_donations = Donation.objects.filter(status='pending')
        pending_projects = Project.objects.filter(status='pending')

        report = {
            'generatedAt': timezone.now().isoformat(),
            'siteName': site.site_name,
            'summary': {
                'projectsTotal': projects.count(),
                'projectsActive': projects.filter(status='active').count(),
                'projectsPending': pending_projects.count(),
                'donationsVerified': donations.count(),
                'donationsPending': pending_donations.count(),
                'totalRaised': float(total_raised),
                'usersTotal': User.objects.count(),
            },
            'projects': [
                {
                    'id': p.id,
                    'title': p.title,
                    'category': p.category,
                    'status': p.status,
                    'target': float(p.target_amount),
                    'raised': float(p.current_amount),
                    'progress': p.progress_percent,
                    'donors': p.donor_count,
                    'creator': p.creator_name,
                    'createdAt': p.created_at.isoformat(),
                }
                for p in projects[:500]
            ],
            'recentDonations': [
                {
                    'id': d.id,
                    'project': d.project_title,
                    'amount': float(d.amount),
                    'donor': d.donor_name if not d.is_anonymous else 'مجهول',
                    'status': d.status,
                    'createdAt': d.created_at.isoformat(),
                }
                for d in Donation.objects.order_by('-created_at')[:200]
            ],
            'byCategory': list(
                Project.objects.values('category')
                .annotate(
                    count=Count('id'),
                    raised=Sum('current_amount'),
                    target=Sum('target_amount'),
                )
                .order_by('-raised')
            ),
        }
        # Serialize decimals
        for row in report['byCategory']:
            row['raised'] = float(row['raised'] or 0)
            row['target'] = float(row['target'] or 0)
        return Response(report)
