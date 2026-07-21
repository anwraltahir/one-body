from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = (
        'avatar_thumb',
        'email',
        'display_name',
        'role_badge',
        'phone',
        'is_staff',
        'is_active',
        'date_joined',
    )
    list_filter = ('role', 'is_staff', 'is_superuser', 'is_active', 'date_joined')
    search_fields = ('email', 'display_name', 'first_name', 'last_name', 'phone', 'google_id')
    ordering = ('-date_joined',)
    list_per_page = 30
    save_on_top = True
    actions = ['make_admin', 'make_user', 'activate_users', 'deactivate_users']

    fieldsets = (
        (None, {
            'fields': ('email', 'password'),
        }),
        ('الملف الشخصي', {
            'fields': (
                'display_name',
                'first_name',
                'last_name',
                'phone',
                'photo_url',
                'avatar_preview',
                'role',
                'google_id',
            ),
        }),
        ('الصلاحيات', {
            'fields': (
                'is_active',
                'is_staff',
                'is_superuser',
                'groups',
                'user_permissions',
            ),
        }),
        ('تواريخ مهمة', {
            'classes': ('collapse',),
            'fields': ('last_login', 'date_joined'),
        }),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': (
                'email',
                'password1',
                'password2',
                'display_name',
                'role',
                'is_staff',
                'is_superuser',
            ),
        }),
    )
    readonly_fields = ('last_login', 'date_joined', 'avatar_preview')
    filter_horizontal = ('groups', 'user_permissions')

    @admin.display(description='')
    def avatar_thumb(self, obj):
        if obj.photo_url:
            return format_html(
                '<img src="{}" style="width:36px;height:36px;border-radius:50%;'
                'object-fit:cover;border:2px solid #e2e8f0" />',
                obj.photo_url,
            )
        initial = (obj.display_name or obj.email or '?')[:1].upper()
        return format_html(
            '<div style="width:36px;height:36px;border-radius:50%;background:#007A3D;'
            'color:#fff;display:flex;align-items:center;justify-content:center;'
            'font-weight:800;font-size:14px">{}</div>',
            initial,
        )

    @admin.display(description='معاينة الصورة')
    def avatar_preview(self, obj):
        if not obj.photo_url:
            return '—'
        return format_html(
            '<img src="{}" style="max-width:120px;border-radius:12px;border:1px solid #e2e8f0" />',
            obj.photo_url,
        )

    @admin.display(description='الدور', ordering='role')
    def role_badge(self, obj):
        if obj.role == 'admin' or obj.is_superuser:
            fg, bg, label = '#007A3D', '#ecfdf5', 'مشرف'
        else:
            fg, bg, label = '#475569', '#f1f5f9', 'مستخدم'
        return format_html(
            '<span style="background:{};color:{};padding:4px 10px;border-radius:999px;'
            'font-size:12px;font-weight:700">{}</span>',
            bg,
            fg,
            label,
        )

    @admin.action(description='تعيين كمشرف')
    def make_admin(self, request, queryset):
        queryset.update(role='admin', is_staff=True)

    @admin.action(description='تعيين كمستخدم عادي')
    def make_user(self, request, queryset):
        queryset.update(role='user')

    @admin.action(description='تفعيل الحسابات')
    def activate_users(self, request, queryset):
        queryset.update(is_active=True)

    @admin.action(description='تعطيل الحسابات')
    def deactivate_users(self, request, queryset):
        queryset.update(is_active=False)
