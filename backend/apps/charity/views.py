from rest_framework import viewsets, permissions, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Project, Donation, DirectDonation, Category, SiteSettings, BankAccount, Announcement, PageContent
from .serializers import (
    ProjectSerializer,
    DonationSerializer,
    CreateDonationSerializer,
    DirectDonationSerializer,
)
from .permissions import IsCreatorOrReadOnly, IsAdminOrReadOnly


class ProjectViewSet(viewsets.ModelViewSet):
    """
    list/retrieve: public active projects (or own/private by id)
    create: authenticated users
    update/delete: creator or admin
    """

    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsCreatorOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['category', 'status', 'is_public']
    search_fields = ['title', 'description', 'creator_name']
    ordering_fields = ['created_at', 'current_amount', 'target_amount', 'donor_count']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = Project.objects.select_related('creator')
        user = self.request.user

        # Detail retrieve: allow any project by id
        if self.action == 'retrieve':
            return qs

        # "mine" action handled separately
        if self.action == 'mine':
            if user.is_authenticated:
                return qs.filter(creator=user)
            return qs.none()

        # Default list: public + active
        status_param = self.request.query_params.get('status')
        is_public = self.request.query_params.get('is_public', 'true').lower()
        qs = qs.filter(is_public=True) if is_public in ('true', '1', '') else qs

        if status_param:
            return qs.filter(status=status_param)
        # Default to active for public browse
        if self.action == 'list' and not status_param:
            return qs.filter(status='active')
        return qs

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def mine(self, request):
        qs = self.get_queryset()
        page = self.paginate_queryset(qs)
        serializer = self.get_serializer(page or qs, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def approve(self, request, pk=None):
        project = self.get_object()
        project.status = 'active'
        project.save(update_fields=['status'])
        return Response(ProjectSerializer(project).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def reject(self, request, pk=None):
        project = self.get_object()
        project.status = 'rejected'
        project.save(update_fields=['status'])
        return Response(ProjectSerializer(project).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def deactivate(self, request, pk=None):
        project = self.get_object()
        project.status = 'inactive'
        project.save(update_fields=['status'])
        return Response(ProjectSerializer(project).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def activate(self, request, pk=None):
        project = self.get_object()
        project.status = 'active'
        project.save(update_fields=['status'])
        return Response(ProjectSerializer(project).data)


class DonationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = DonationSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['project', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = Donation.objects.select_related('project', 'donor', 'bank_account')
        project_id = self.request.query_params.get('projectId')
        if project_id:
            qs = qs.filter(project_id=project_id)
        # Public list: only verified donations (unless staff)
        user = self.request.user
        is_staff = user.is_authenticated and (
            user.is_staff or user.is_superuser or getattr(user, 'role', None) == 'admin'
        )
        if self.action == 'list' and not is_staff:
            status_param = self.request.query_params.get('status')
            if not status_param:
                qs = qs.filter(status='success')
        return qs

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def mine(self, request):
        qs = Donation.objects.filter(donor=request.user).select_related('project', 'bank_account')
        page = self.paginate_queryset(qs)
        serializer = self.get_serializer(page or qs, many=True, context={'request': request})
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)


class CreateDonationView(APIView):
    """Create a donation (auth optional for guest donations)."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = CreateDonationSerializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        donation = serializer.save()
        return Response(
            DonationSerializer(donation).data,
            status=status.HTTP_201_CREATED,
        )


class CategoriesView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        cats = list(
            Category.objects.filter(is_active=True)
            .order_by('sort_order', 'name')
            .values_list('name', flat=True)
        )
        if cats:
            return Response(cats)
        # Fallback defaults if admin has not seeded categories yet
        return Response([
            'مياه وآبار', 'مساجد', 'زكاة مال', 'زكاة فطر',
            'فدية صيام', 'دعم التعليم', 'الصحة',
        ])


class SiteSettingsView(APIView):
    """Public site settings for the frontend."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        s = SiteSettings.load()
        banks = BankAccount.objects.filter(is_active=True).order_by('sort_order', 'bank_name')
        announcements = Announcement.objects.filter(is_active=True).order_by('-created_at')[:5]
        return Response({
            'siteName': s.site_name,
            'tagline': s.tagline,
            'aboutText': s.about_text,
            'mission': s.mission,
            'vision': s.vision,
            'heroTitle': s.hero_title,
            'heroSubtitle': s.hero_subtitle,
            'contactEmail': s.contact_email,
            'contactPhone': s.contact_phone,
            'whatsappNumber': s.whatsapp_number,
            'facebookUrl': s.facebook_url,
            'twitterUrl': s.twitter_url,
            'instagramUrl': s.instagram_url,
            'logoUrl': s.logo_url,
            'footerText': s.footer_text,
            'statsDonors': s.stats_donors,
            'statsProjects': s.stats_projects,
            'statsStates': s.stats_states,
            'maintenanceMode': s.maintenance_mode,
            'bankAccounts': [
                {
                    'id': b.id,
                    'bankName': b.bank_name,
                    'accountName': b.account_name,
                    'accountNumber': b.account_number,
                    'iban': b.iban,
                    'branch': b.branch,
                    'currency': b.currency,
                    'instructions': b.instructions,
                    'isPrimary': b.is_primary,
                }
                for b in banks
            ],
            'announcements': [
                {
                    'id': a.id,
                    'title': a.title,
                    'body': a.body,
                    'linkUrl': a.link_url,
                }
                for a in announcements
            ],
        })


class PageContentView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, key=None):
        if key:
            page = PageContent.objects.filter(key=key, is_published=True).first()
            if not page:
                return Response({'detail': 'غير موجود'}, status=status.HTTP_404_NOT_FOUND)
            return Response({
                'key': page.key,
                'title': page.title,
                'body': page.body,
                'updatedAt': page.updated_at,
            })
        pages = PageContent.objects.filter(is_published=True).order_by('sort_order', 'title')
        return Response([
            {'key': p.key, 'title': p.title}
            for p in pages
        ])


class DirectDonationCreateView(generics.CreateAPIView):
    queryset = DirectDonation.objects.all()
    serializer_class = DirectDonationSerializer
    permission_classes = [permissions.AllowAny]


class HealthView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({'status': 'ok', 'service': 'aljasad-alwahid-api'})
