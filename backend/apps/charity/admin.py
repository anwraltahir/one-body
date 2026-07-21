from django.contrib import admin, messages
from django.db.models import Count, Sum
from django.utils import timezone
from django.utils.html import format_html

from django.db import transaction
from django.db.models import F

from .models import (
    AdminNotification,
    Announcement,
    BankAccount,
    Category,
    ContactMessage,
    DirectDonation,
    Donation,
    PageContent,
    Project,
    SiteSettings,
)
from .serializers import apply_donation_to_project


class ProgressBarMixin:
    """Render a green progress bar in list/detail."""

    @admin.display(description='نسبة الإنجاز')
    def progress_bar(self, obj):
        pct = getattr(obj, 'progress_percent', 0) or 0
        color = '#007A3D' if pct >= 70 else ('#C9A227' if pct >= 30 else '#C8102E')
        return format_html(
            '<div style="min-width:110px">'
            '<div style="background:#e2e8f0;border-radius:999px;height:10px;overflow:hidden">'
            '<div style="width:{}%;background:{};height:100%;border-radius:999px"></div>'
            '</div>'
            '<span style="font-size:11px;font-weight:700;color:{}">{}%</span>'
            '</div>',
            pct,
            color,
            color,
            pct,
        )


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'is_active', 'sort_order', 'projects_count', 'created_at')
    list_editable = ('is_active', 'sort_order')
    list_filter = ('is_active',)
    search_fields = ('name', 'description', 'slug')
    prepopulated_fields = {'slug': ('name',)}
    ordering = ('sort_order', 'name')

    @admin.display(description='عدد المشاريع')
    def projects_count(self, obj):
        return obj.projects.count()


class DonationInline(admin.TabularInline):
    model = Donation
    extra = 0
    fields = ('amount', 'donor_name', 'is_anonymous', 'status', 'payment_method', 'created_at')
    readonly_fields = ('created_at',)
    show_change_link = True
    classes = ('collapse',)


@admin.register(Project)
class ProjectAdmin(ProgressBarMixin, admin.ModelAdmin):
    list_display = (
        'title',
        'category',
        'status_badge',
        'target_amount',
        'current_amount',
        'progress_bar',
        'donor_count',
        'is_featured',
        'is_public',
        'creator_name',
        'created_at',
    )
    list_filter = ('status', 'category', 'is_public', 'is_featured', 'created_at')
    search_fields = ('title', 'description', 'creator_name', 'location', 'admin_notes')
    list_editable = ('is_featured', 'is_public')
    date_hierarchy = 'created_at'
    autocomplete_fields = ('creator', 'category_ref')
    readonly_fields = ('created_at', 'updated_at', 'progress_bar', 'image_preview')
    list_per_page = 25
    save_on_top = True
    inlines = [DonationInline]
    actions = [
        'approve_projects',
        'reject_projects',
        'deactivate_projects',
        'complete_projects',
        'feature_projects',
        'unfeature_projects',
        'make_public',
        'make_private',
    ]

    fieldsets = (
        ('المعلومات الأساسية', {
            'fields': (
                'title',
                'description',
                ('category', 'category_ref'),
                'location',
                'status',
            ),
        }),
        ('المبالغ والتقدم', {
            'fields': (
                ('target_amount', 'current_amount', 'donor_count'),
                'progress_bar',
                'end_date',
            ),
        }),
        ('الصورة والظهور', {
            'fields': (
                'image',
                'image_url',
                'image_preview',
                ('is_public', 'is_featured'),
            ),
        }),
        ('المنشئ', {
            'fields': ('creator', 'creator_name'),
        }),
        ('ملاحظات الإدارة', {
            'classes': ('collapse',),
            'fields': ('admin_notes',),
        }),
        ('التواريخ', {
            'classes': ('collapse',),
            'fields': ('created_at', 'updated_at'),
        }),
    )

    @admin.display(description='الحالة', ordering='status')
    def status_badge(self, obj):
        colors = {
            'pending': ('#f59e0b', '#fffbeb'),
            'active': ('#007A3D', '#ecfdf5'),
            'inactive': ('#64748b', '#f1f5f9'),
            'completed': ('#2563eb', '#eff6ff'),
            'rejected': ('#C8102E', '#fef2f2'),
        }
        fg, bg = colors.get(obj.status, ('#64748b', '#f8fafc'))
        label = obj.get_status_display()
        return format_html(
            '<span style="background:{};color:{};padding:4px 10px;border-radius:999px;'
            'font-size:12px;font-weight:700;white-space:nowrap">{}</span>',
            bg,
            fg,
            label,
        )

    @admin.display(description='معاينة الصورة')
    def image_preview(self, obj):
        url = obj.display_image_url()
        if not url:
            return '—'
        return format_html(
            '<img src="{}" style="max-width:220px;max-height:140px;border-radius:12px;'
            'border:1px solid #e2e8f0;object-fit:cover" />',
            url,
        )

    @admin.action(description='✅ الموافقة على المشاريع المحددة')
    def approve_projects(self, request, queryset):
        n = queryset.update(status='active')
        self.message_user(request, f'تمت الموافقة على {n} مشروع.', messages.SUCCESS)

    @admin.action(description='❌ رفض المشاريع المحددة')
    def reject_projects(self, request, queryset):
        n = queryset.update(status='rejected')
        self.message_user(request, f'تم رفض {n} مشروع.', messages.WARNING)

    @admin.action(description='⏸ إيقاف المشاريع المحددة')
    def deactivate_projects(self, request, queryset):
        n = queryset.update(status='inactive')
        self.message_user(request, f'تم إيقاف {n} مشروع.', messages.WARNING)

    @admin.action(description='🏁 تعليم كمكتمل')
    def complete_projects(self, request, queryset):
        n = queryset.update(status='completed')
        self.message_user(request, f'تم تعليم {n} مشروع كمكتمل.', messages.SUCCESS)

    @admin.action(description='⭐ تمييز في الرئيسية')
    def feature_projects(self, request, queryset):
        n = queryset.update(is_featured=True)
        self.message_user(request, f'تم تمييز {n} مشروع.', messages.SUCCESS)

    @admin.action(description='إلغاء التمييز')
    def unfeature_projects(self, request, queryset):
        n = queryset.update(is_featured=False)
        self.message_user(request, f'أُلغي تمييز {n} مشروع.', messages.INFO)

    @admin.action(description='جعل عام')
    def make_public(self, request, queryset):
        queryset.update(is_public=True)

    @admin.action(description='جعل خاص')
    def make_private(self, request, queryset):
        queryset.update(is_public=False)


@admin.register(Donation)
class DonationAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'project_title',
        'amount_display',
        'donor_name',
        'is_anonymous',
        'status_badge',
        'payment_method',
        'receipt_thumb',
        'amount_applied',
        'created_at',
    )
    list_filter = ('status', 'is_anonymous', 'payment_method', 'amount_applied', 'created_at')
    search_fields = ('project_title', 'donor_name', 'donor_phone', 'admin_notes')
    autocomplete_fields = ('project', 'donor', 'bank_account', 'reviewed_by')
    date_hierarchy = 'created_at'
    readonly_fields = ('created_at', 'updated_at', 'receipt_preview_large', 'reviewed_at', 'amount_applied')
    list_per_page = 30
    save_on_top = True
    actions = ['verify_and_apply', 'mark_pending', 'mark_failed', 'mark_refunded']

    fieldsets = (
        ('التبرع', {
            'fields': (
                'project',
                'project_title',
                'amount',
                'status',
                'payment_method',
                'bank_account',
                'is_anonymous',
                'amount_applied',
            ),
        }),
        ('المتبرع', {
            'fields': ('donor', 'donor_name', 'donor_phone'),
        }),
        ('الإشعار', {
            'fields': ('receipt_file', 'receipt_image', 'receipt_preview_large'),
        }),
        ('المراجعة', {
            'fields': ('reviewed_by', 'reviewed_at', 'admin_notes'),
        }),
        ('التواريخ', {
            'classes': ('collapse',),
            'fields': ('created_at', 'updated_at'),
        }),
    )

    @admin.display(description='المبلغ', ordering='amount')
    def amount_display(self, obj):
        return format_html(
            '<strong style="color:#007A3D;font-variant-numeric:tabular-nums">{}</strong>',
            f'{obj.amount:,.2f}',
        )

    @admin.display(description='الحالة', ordering='status')
    def status_badge(self, obj):
        colors = {
            'success': ('#007A3D', '#ecfdf5'),
            'pending': ('#f59e0b', '#fffbeb'),
            'failed': ('#C8102E', '#fef2f2'),
            'refunded': ('#64748b', '#f1f5f9'),
        }
        fg, bg = colors.get(obj.status, ('#64748b', '#f8fafc'))
        return format_html(
            '<span style="background:{};color:{};padding:4px 10px;border-radius:999px;'
            'font-size:12px;font-weight:700">{}</span>',
            bg,
            fg,
            obj.get_status_display(),
        )

    @admin.display(description='الإشعار')
    def receipt_thumb(self, obj):
        return obj.receipt_preview()

    @admin.display(description='معاينة الإشعار')
    def receipt_preview_large(self, obj):
        src = ''
        if obj.receipt_file:
            src = obj.receipt_file.url
        elif obj.receipt_image:
            src = obj.receipt_image
        if not src:
            return '—'
        return format_html(
            '<img src="{}" style="max-width:420px;max-height:420px;border-radius:12px;'
            'border:1px solid #e2e8f0;box-shadow:0 8px 24px rgba(0,0,0,.08)" />',
            src,
        )

    @admin.action(description='✅ تحقق وإضافة المبلغ للمشروع')
    def verify_and_apply(self, request, queryset):
        applied = 0
        for d in queryset:
            d.status = 'success'
            d.reviewed_by = request.user
            d.reviewed_at = timezone.now()
            d.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'updated_at'])
            if apply_donation_to_project(d):
                applied += 1
        self.message_user(
            request,
            f'تم التحقق من {queryset.count()} تبرع، وأُضيف {applied} مبلغ للمشاريع.',
            messages.SUCCESS,
        )

    @admin.action(description='وضع قيد الانتظار')
    def mark_pending(self, request, queryset):
        queryset.update(status='pending')

    @admin.action(description='وضع كمرفوض')
    def mark_failed(self, request, queryset):
        queryset.update(status='failed')

    @admin.action(description='وضع كمسترد')
    def mark_refunded(self, request, queryset):
        queryset.update(status='refunded')


@admin.register(DirectDonation)
class DirectDonationAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'donation_type',
        'amount_display',
        'donor_name',
        'status_badge',
        'receipt_thumb',
        'bank_account',
        'created_at',
    )
    list_filter = ('status', 'donation_type', 'created_at')
    search_fields = ('donor_name', 'donor_phone', 'donor_email', 'admin_notes')
    autocomplete_fields = ('bank_account', 'reviewed_by')
    date_hierarchy = 'created_at'
    readonly_fields = ('created_at', 'updated_at', 'receipt_preview_large', 'reviewed_at')
    list_per_page = 25
    save_on_top = True
    actions = ['approve_selected', 'reject_selected', 'reset_pending']

    fieldsets = (
        ('بيانات التبرع', {
            'fields': (
                'donation_type',
                'amount',
                'status',
                'bank_account',
            ),
        }),
        ('المتبرع', {
            'fields': ('donor_name', 'donor_phone', 'donor_email'),
        }),
        ('الإشعار', {
            'fields': ('receipt_file', 'receipt_image', 'receipt_preview_large'),
        }),
        ('المراجعة', {
            'fields': ('reviewed_by', 'reviewed_at', 'admin_notes'),
        }),
        ('التواريخ', {
            'classes': ('collapse',),
            'fields': ('created_at', 'updated_at'),
        }),
    )

    @admin.display(description='المبلغ', ordering='amount')
    def amount_display(self, obj):
        return format_html(
            '<strong style="color:#007A3D">{}</strong>',
            f'{obj.amount:,.2f}',
        )

    @admin.display(description='الحالة', ordering='status')
    def status_badge(self, obj):
        colors = {
            'pending': ('#f59e0b', '#fffbeb'),
            'approved': ('#007A3D', '#ecfdf5'),
            'rejected': ('#C8102E', '#fef2f2'),
        }
        fg, bg = colors.get(obj.status, ('#64748b', '#f8fafc'))
        return format_html(
            '<span style="background:{};color:{};padding:4px 10px;border-radius:999px;'
            'font-size:12px;font-weight:700">{}</span>',
            bg,
            fg,
            obj.get_status_display(),
        )

    @admin.display(description='الإشعار')
    def receipt_thumb(self, obj):
        return obj.receipt_preview()

    @admin.display(description='معاينة الإشعار')
    def receipt_preview_large(self, obj):
        src = ''
        if obj.receipt_file:
            src = obj.receipt_file.url
        elif obj.receipt_image:
            src = obj.receipt_image
        if not src:
            return '—'
        return format_html(
            '<img src="{}" style="max-width:420px;max-height:420px;border-radius:12px;'
            'border:1px solid #e2e8f0;box-shadow:0 8px 24px rgba(0,0,0,.08)" />',
            src,
        )

    def _review(self, request, queryset, status):
        n = queryset.update(
            status=status,
            reviewed_by=request.user,
            reviewed_at=timezone.now(),
        )
        return n

    @admin.action(description='✅ قبول المحدد وإضافة للمشروع إن وُجد')
    def approve_selected(self, request, queryset):
        n = 0
        for t in queryset:
            t.status = 'approved'
            t.reviewed_by = request.user
            t.reviewed_at = timezone.now()
            t.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'updated_at'])
            if t.project_id and not t.amount_applied:
                with transaction.atomic():
                    Project.objects.filter(pk=t.project_id).update(
                        current_amount=F('current_amount') + t.amount,
                        donor_count=F('donor_count') + 1,
                    )
                    t.amount_applied = True
                    t.save(update_fields=['amount_applied'])
            n += 1
        self.message_user(request, f'تم قبول {n} تحويل.', messages.SUCCESS)

    @admin.action(description='❌ رفض المحدد')
    def reject_selected(self, request, queryset):
        n = self._review(request, queryset, 'rejected')
        self.message_user(request, f'تم رفض {n} تحويل.', messages.WARNING)

    @admin.action(description='إعادة لقيد المراجعة')
    def reset_pending(self, request, queryset):
        queryset.update(status='pending', reviewed_at=None)


@admin.register(BankAccount)
class BankAccountAdmin(admin.ModelAdmin):
    list_display = (
        'bank_name',
        'account_number',
        'account_name',
        'currency',
        'is_primary',
        'is_active',
        'sort_order',
    )
    list_editable = ('is_primary', 'is_active', 'sort_order')
    list_filter = ('is_active', 'is_primary', 'currency')
    search_fields = ('bank_name', 'account_number', 'account_name', 'iban')
    fieldsets = (
        (None, {
            'fields': (
                'bank_name',
                'account_name',
                'account_number',
                'iban',
                'branch',
                'currency',
                'instructions',
                ('is_active', 'is_primary'),
                'sort_order',
            ),
        }),
    )


@admin.register(SiteSettings)
class SiteSettingsAdmin(admin.ModelAdmin):
    """Singleton — only one settings row."""

    fieldsets = (
        ('هوية المنصة', {
            'fields': ('site_name', 'tagline', 'logo_url', 'footer_text'),
        }),
        ('المحتوى الرئيسي', {
            'fields': ('hero_title', 'hero_subtitle', 'about_text', 'mission', 'vision'),
        }),
        ('الإحصائيات المعروضة', {
            'fields': ('stats_donors', 'stats_projects', 'stats_states'),
        }),
        ('التواصل', {
            'fields': (
                'contact_email',
                'contact_phone',
                'whatsapp_number',
                'facebook_url',
                'twitter_url',
                'instagram_url',
            ),
        }),
        ('النظام', {
            'fields': ('maintenance_mode', 'updated_at'),
        }),
    )
    readonly_fields = ('updated_at',)

    def has_add_permission(self, request):
        return not SiteSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False

    def changelist_view(self, request, extra_context=None):
        from django.shortcuts import redirect
        from django.urls import reverse
        obj = SiteSettings.load()
        return redirect(reverse('admin:charity_sitesettings_change', args=[obj.pk]))


@admin.register(PageContent)
class PageContentAdmin(admin.ModelAdmin):
    list_display = ('title', 'key', 'is_published', 'sort_order', 'updated_at')
    list_editable = ('is_published', 'sort_order')
    list_filter = ('is_published',)
    search_fields = ('title', 'key', 'body')
    prepopulated_fields = {'key': ('title',)}


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'subject', 'status_badge', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('name', 'email', 'phone', 'subject', 'message')
    readonly_fields = ('created_at',)
    date_hierarchy = 'created_at'
    actions = ['mark_read', 'mark_replied', 'archive']

    fieldsets = (
        ('الرسالة', {
            'fields': ('name', 'email', 'phone', 'subject', 'message', 'status'),
        }),
        ('إدارة', {
            'fields': ('admin_notes', 'created_at'),
        }),
    )

    @admin.display(description='الحالة', ordering='status')
    def status_badge(self, obj):
        colors = {
            'new': ('#C8102E', '#fef2f2'),
            'read': ('#2563eb', '#eff6ff'),
            'replied': ('#007A3D', '#ecfdf5'),
            'archived': ('#64748b', '#f1f5f9'),
        }
        fg, bg = colors.get(obj.status, ('#64748b', '#f8fafc'))
        return format_html(
            '<span style="background:{};color:{};padding:4px 10px;border-radius:999px;'
            'font-size:12px;font-weight:700">{}</span>',
            bg,
            fg,
            obj.get_status_display(),
        )

    @admin.action(description='تعليم كمقروء')
    def mark_read(self, request, queryset):
        queryset.update(status='read')

    @admin.action(description='تم الرد')
    def mark_replied(self, request, queryset):
        queryset.update(status='replied')

    @admin.action(description='أرشفة')
    def archive(self, request, queryset):
        queryset.update(status='archived')


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ('title', 'is_active', 'starts_at', 'ends_at', 'created_at')
    list_editable = ('is_active',)
    list_filter = ('is_active',)
    search_fields = ('title', 'body')
    fieldsets = (
        (None, {
            'fields': ('title', 'body', 'link_url', 'is_active', ('starts_at', 'ends_at')),
        }),
    )


@admin.register(AdminNotification)
class AdminNotificationAdmin(admin.ModelAdmin):
    list_display = ('title', 'type', 'is_read', 'created_at')
    list_filter = ('type', 'is_read', 'created_at')
    search_fields = ('title', 'message')
    list_editable = ('is_read',)
    readonly_fields = ('created_at',)
    actions = ['mark_read']

    @admin.action(description='تعليم كمقروء')
    def mark_read(self, request, queryset):
        queryset.update(is_read=True)
