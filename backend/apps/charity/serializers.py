from rest_framework import serializers
from django.db import transaction
from django.db.models import F
from django.utils import timezone

from .models import (
    Project,
    Donation,
    DirectDonation,
    BankAccount,
    AdminNotification,
    Category,
)


class ProjectSerializer(serializers.ModelSerializer):
    """CamelCase fields matching the React frontend types."""

    id = serializers.CharField(source='pk', read_only=True)
    targetAmount = serializers.DecimalField(
        source='target_amount', max_digits=14, decimal_places=2, coerce_to_string=False
    )
    currentAmount = serializers.DecimalField(
        source='current_amount', max_digits=14, decimal_places=2, read_only=True, coerce_to_string=False
    )
    imageUrl = serializers.SerializerMethodField()
    creatorId = serializers.CharField(source='creator_id', read_only=True)
    creatorName = serializers.CharField(source='creator_name', read_only=True)
    isPublic = serializers.BooleanField(source='is_public', default=True)
    isFeatured = serializers.BooleanField(source='is_featured', read_only=True)
    donorCount = serializers.IntegerField(source='donor_count', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    endDate = serializers.DateTimeField(source='end_date', required=False, allow_null=True)
    location = serializers.CharField(required=False, allow_blank=True, default='')
    progressPercent = serializers.SerializerMethodField()
    adminNotes = serializers.CharField(source='admin_notes', read_only=True)

    class Meta:
        model = Project
        fields = (
            'id', 'title', 'description', 'category',
            'targetAmount', 'currentAmount', 'imageUrl',
            'creatorId', 'creatorName', 'isPublic', 'isFeatured', 'status',
            'createdAt', 'endDate', 'donorCount', 'location', 'progressPercent',
            'adminNotes',
        )
        read_only_fields = (
            'id', 'currentAmount', 'creatorId', 'creatorName',
            'status', 'createdAt', 'donorCount', 'isFeatured', 'progressPercent',
            'adminNotes',
        )

    def get_imageUrl(self, obj):
        return obj.display_image_url()

    def get_progressPercent(self, obj):
        return obj.progress_percent

    def create(self, validated_data):
        user = self.context['request'].user
        request = self.context.get('request')
        image_url = ''
        if request is not None:
            image_url = request.data.get('imageUrl') or request.data.get('image_url') or ''
        if image_url:
            validated_data['image_url'] = image_url
        validated_data['creator'] = user
        validated_data['creator_name'] = user.display_name or user.email
        validated_data['status'] = 'pending'
        project = super().create(validated_data)
        AdminNotification.notify(
            'project_pending',
            f'مشروع جديد بانتظار الموافقة: {project.title}',
            message=f'أنشأه {project.creator_name} — الهدف {project.target_amount} ج.س',
            link=f'/admin/projects',
            related_id=project.pk,
        )
        return project


class ProjectListSerializer(ProjectSerializer):
    """Lighter list representation (same shape for now)."""
    pass


class DonationSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='pk', read_only=True)
    projectId = serializers.CharField(source='project_id', read_only=True)
    projectTitle = serializers.CharField(source='project_title', read_only=True)
    amount = serializers.DecimalField(max_digits=14, decimal_places=2, coerce_to_string=False)
    donorId = serializers.SerializerMethodField()
    donorName = serializers.CharField(source='donor_name', read_only=True)
    donorPhone = serializers.CharField(source='donor_phone', read_only=True)
    isAnonymous = serializers.BooleanField(source='is_anonymous', default=False)
    paymentMethod = serializers.CharField(source='payment_method', read_only=True)
    bankAccountId = serializers.IntegerField(source='bank_account_id', read_only=True, allow_null=True)
    bankAccountName = serializers.SerializerMethodField()
    hasReceipt = serializers.SerializerMethodField()
    receiptImage = serializers.SerializerMethodField()
    reviewedAt = serializers.DateTimeField(source='reviewed_at', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = Donation
        fields = (
            'id', 'projectId', 'projectTitle', 'amount',
            'donorId', 'donorName', 'donorPhone', 'isAnonymous',
            'createdAt', 'status', 'paymentMethod',
            'bankAccountId', 'bankAccountName', 'hasReceipt', 'receiptImage',
            'reviewedAt',
        )
        read_only_fields = fields

    def get_donorId(self, obj):
        if obj.is_anonymous or not obj.donor_id:
            return None
        return str(obj.donor_id)

    def get_bankAccountName(self, obj):
        if obj.bank_account_id and obj.bank_account:
            return f'{obj.bank_account.bank_name} — {obj.bank_account.account_number}'
        return ''

    def get_hasReceipt(self, obj):
        return bool(obj.receipt_image or obj.receipt_file)

    def get_receiptImage(self, obj):
        request = self.context.get('request')
        # Only expose receipt to staff/admin or the donor
        user = getattr(request, 'user', None) if request else None
        if not user or not user.is_authenticated:
            return None
        is_staff = user.is_staff or user.is_superuser or getattr(user, 'role', None) == 'admin'
        is_owner = obj.donor_id == user.id
        if not (is_staff or is_owner):
            return None
        if obj.receipt_file:
            return obj.receipt_file.url
        return obj.receipt_image or None


class CreateDonationSerializer(serializers.Serializer):
    """Create a bank-transfer donation that waits for admin verification."""

    projectId = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=1)
    isAnonymous = serializers.BooleanField(default=False)
    receiptImage = serializers.CharField(required=True, allow_blank=False)
    bankAccountId = serializers.IntegerField(required=False, allow_null=True)
    donorName = serializers.CharField(required=False, allow_blank=True, max_length=150)
    donorPhone = serializers.CharField(required=False, allow_blank=True, max_length=30)

    def validate_projectId(self, value):
        try:
            project = Project.objects.get(pk=value)
        except Project.DoesNotExist:
            raise serializers.ValidationError('المشروع غير موجود.')
        if project.status != 'active':
            raise serializers.ValidationError('لا يمكن التبرع لهذا المشروع حالياً.')
        self.context['project'] = project
        return value

    def validate_bankAccountId(self, value):
        if value is None:
            return value
        try:
            bank = BankAccount.objects.get(pk=value, is_active=True)
        except BankAccount.DoesNotExist:
            raise serializers.ValidationError('الحساب البنكي غير موجود.')
        self.context['bank'] = bank
        return value

    def validate_receiptImage(self, value):
        if not value or len(value) < 50:
            raise serializers.ValidationError('يرجى رفع صورة إشعار التحويل.')
        return value

    @transaction.atomic
    def create(self, validated_data):
        project = self.context['project']
        request = self.context['request']
        user = request.user if request.user.is_authenticated else None
        is_anonymous = validated_data.get('isAnonymous', False)
        amount = validated_data['amount']
        bank = self.context.get('bank')
        if not bank:
            bank = (
                BankAccount.objects.filter(is_active=True, is_primary=True).first()
                or BankAccount.objects.filter(is_active=True).order_by('sort_order').first()
            )

        if is_anonymous:
            donor_name = 'متبرع فاعل خير'
        else:
            donor_name = (
                validated_data.get('donorName')
                or (user.display_name if user else None)
                or (user.email if user else None)
                or 'متبرع'
            )

        donation = Donation.objects.create(
            project=project,
            project_title=project.title,
            amount=amount,
            donor=user,
            donor_name=donor_name,
            donor_phone=validated_data.get('donorPhone') or '',
            is_anonymous=is_anonymous,
            status='pending',
            payment_method='تحويل بنكي',
            bank_account=bank,
            receipt_image=validated_data['receiptImage'],
            amount_applied=False,
        )

        AdminNotification.notify(
            'donation_pending',
            f'تبرع جديد بانتظار التحقق: {amount} ج.س',
            message=f'مشروع: {project.title} — من: {donor_name}',
            link='/admin/donations',
            related_id=donation.pk,
        )
        return donation


class DirectDonationSerializer(serializers.ModelSerializer):
    donationType = serializers.CharField(source='donation_type')
    donorName = serializers.CharField(source='donor_name', required=False, allow_blank=True, default='فاعل خير')
    donorPhone = serializers.CharField(source='donor_phone', required=False, allow_blank=True, default='')
    receiptImage = serializers.CharField(source='receipt_image')
    bankAccountId = serializers.IntegerField(source='bank_account_id', required=False, allow_null=True)
    projectId = serializers.IntegerField(source='project_id', required=False, allow_null=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = DirectDonation
        fields = (
            'id', 'donationType', 'amount', 'donorName', 'donorPhone',
            'receiptImage', 'status', 'createdAt', 'bankAccountId', 'projectId',
        )
        read_only_fields = ('id', 'status', 'createdAt')

    def create(self, validated_data):
        validated_data['status'] = 'pending'
        if not validated_data.get('donor_name'):
            validated_data['donor_name'] = 'فاعل خير'
        bank_id = validated_data.pop('bank_account_id', None)
        if bank_id:
            bank = BankAccount.objects.filter(pk=bank_id, is_active=True).first()
            if bank:
                validated_data['bank_account'] = bank
        project_id = validated_data.pop('project_id', None)
        if project_id:
            project = Project.objects.filter(pk=project_id).first()
            if project:
                validated_data['project'] = project
        obj = super().create(validated_data)
        AdminNotification.notify(
            'transfer_pending',
            f'تحويل بنكي بانتظار المراجعة: {obj.amount} ج.س',
            message=f'{obj.donation_type} — {obj.donor_name}',
            link='/admin/transfers',
            related_id=obj.pk,
        )
        return obj


class BankAccountSerializer(serializers.ModelSerializer):
    bankName = serializers.CharField(source='bank_name')
    accountName = serializers.CharField(source='account_name', required=False, allow_blank=True)
    accountNumber = serializers.CharField(source='account_number')
    isActive = serializers.BooleanField(source='is_active', required=False, default=True)
    isPrimary = serializers.BooleanField(source='is_primary', required=False, default=False)
    sortOrder = serializers.IntegerField(source='sort_order', required=False, default=0)

    class Meta:
        model = BankAccount
        fields = (
            'id', 'bankName', 'accountName', 'accountNumber', 'iban', 'branch',
            'currency', 'instructions', 'isActive', 'isPrimary', 'sortOrder',
        )


class AdminNotificationSerializer(serializers.ModelSerializer):
    isRead = serializers.BooleanField(source='is_read', read_only=True)
    relatedId = serializers.IntegerField(source='related_id', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = AdminNotification
        fields = ('id', 'type', 'title', 'message', 'link', 'isRead', 'relatedId', 'createdAt')


def apply_donation_to_project(donation: Donation) -> bool:
    """Credit project once when donation is verified. Returns True if applied."""
    if donation.amount_applied or donation.status != 'success':
        return False
    with transaction.atomic():
        Project.objects.filter(pk=donation.project_id).update(
            current_amount=F('current_amount') + donation.amount,
            donor_count=F('donor_count') + 1,
        )
        donation.amount_applied = True
        donation.save(update_fields=['amount_applied', 'updated_at'])
        project = Project.objects.get(pk=donation.project_id)
        if project.current_amount >= project.target_amount and project.status == 'active':
            project.status = 'completed'
            project.save(update_fields=['status'])
    return True
