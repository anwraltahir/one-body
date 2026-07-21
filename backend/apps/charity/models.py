from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils.html import format_html


class Category(models.Model):
    """Editable project categories managed from admin."""

    name = models.CharField('اسم التصنيف', max_length=80, unique=True)
    slug = models.SlugField('المعرّف', max_length=80, unique=True, allow_unicode=True)
    icon = models.CharField(
        'أيقونة (اختياري)',
        max_length=50,
        blank=True,
        help_text='اسم أيقونة lucide مثل Droplets أو Heart',
    )
    color = models.CharField('لون CSS', max_length=40, blank=True, default='text-emerald-600')
    description = models.TextField('الوصف', blank=True)
    is_active = models.BooleanField('نشط', default=True)
    sort_order = models.PositiveIntegerField('ترتيب العرض', default=0)
    created_at = models.DateTimeField('تاريخ الإنشاء', auto_now_add=True)

    class Meta:
        verbose_name = 'تصنيف'
        verbose_name_plural = 'التصنيفات'
        ordering = ['sort_order', 'name']

    def __str__(self):
        return self.name


class Project(models.Model):
    STATUS_CHOICES = [
        ('pending', 'قيد المراجعة'),
        ('active', 'نشط'),
        ('inactive', 'موقوف'),
        ('completed', 'مكتمل'),
        ('rejected', 'مرفوض'),
    ]

    title = models.CharField('عنوان المشروع', max_length=255)
    description = models.TextField('الوصف')
    category = models.CharField('التصنيف', max_length=80, db_index=True)
    category_ref = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='projects',
        verbose_name='التصنيف (مرجع)',
    )
    target_amount = models.DecimalField('المبلغ المستهدف', max_digits=14, decimal_places=2)
    current_amount = models.DecimalField('المبلغ المجموع', max_digits=14, decimal_places=2, default=0)
    image_url = models.URLField('رابط الصورة', max_length=500, blank=True)
    image = models.ImageField('صورة المشروع', upload_to='projects/%Y/%m/', blank=True, null=True)
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='projects',
        verbose_name='المنشئ',
    )
    creator_name = models.CharField('اسم المنشئ', max_length=150, blank=True)
    is_public = models.BooleanField('عام', default=True)
    is_featured = models.BooleanField('مميز في الرئيسية', default=False)
    status = models.CharField('الحالة', max_length=20, choices=STATUS_CHOICES, default='pending', db_index=True)
    donor_count = models.PositiveIntegerField('عدد المتبرعين', default=0)
    end_date = models.DateTimeField('تاريخ الانتهاء', null=True, blank=True)
    admin_notes = models.TextField('ملاحظات الإدارة', blank=True)
    location = models.CharField('الموقع / الولاية', max_length=150, blank=True)
    created_at = models.DateTimeField('تاريخ الإنشاء', auto_now_add=True)
    updated_at = models.DateTimeField('آخر تحديث', auto_now=True)

    class Meta:
        verbose_name = 'مشروع'
        verbose_name_plural = 'المشاريع'
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    @property
    def progress_percent(self):
        if not self.target_amount:
            return 0
        pct = float(self.current_amount) / float(self.target_amount) * 100
        return min(100, round(pct, 1))

    def display_image_url(self):
        if self.image:
            return self.image.url
        return self.image_url or ''

    def save(self, *args, **kwargs):
        if self.creator_id and not self.creator_name:
            self.creator_name = getattr(self.creator, 'display_name', '') or self.creator.email
        if self.category_ref_id and not self.category:
            self.category = self.category_ref.name
        elif self.category and not self.category_ref_id:
            cat = Category.objects.filter(name=self.category).first()
            if cat:
                self.category_ref = cat
        super().save(*args, **kwargs)


class Donation(models.Model):
    STATUS_CHOICES = [
        ('pending', 'قيد التحقق'),
        ('success', 'تم التحقق'),
        ('failed', 'مرفوض'),
        ('refunded', 'مسترد'),
    ]

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='donations',
        verbose_name='المشروع',
    )
    project_title = models.CharField('عنوان المشروع', max_length=255, blank=True)
    amount = models.DecimalField('المبلغ', max_digits=14, decimal_places=2)
    donor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='donations',
        verbose_name='المتبرع',
    )
    donor_name = models.CharField('اسم المتبرع', max_length=150, blank=True, default='متبرع')
    donor_phone = models.CharField('هاتف المتبرع', max_length=30, blank=True)
    is_anonymous = models.BooleanField('مجهول', default=False)
    status = models.CharField('الحالة', max_length=20, choices=STATUS_CHOICES, default='pending', db_index=True)
    payment_method = models.CharField('طريقة الدفع', max_length=50, blank=True, default='تحويل بنكي')
    bank_account = models.ForeignKey(
        'BankAccount',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='project_donations',
        verbose_name='الحساب البنكي',
    )
    receipt_image = models.TextField('صورة الإشعار (base64)', blank=True)
    receipt_file = models.ImageField('ملف الإشعار', upload_to='donation_receipts/%Y/%m/', blank=True, null=True)
    admin_notes = models.TextField('ملاحظات الإدارة', blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_donations',
        verbose_name='راجع بواسطة',
    )
    reviewed_at = models.DateTimeField('تاريخ المراجعة', null=True, blank=True)
    amount_applied = models.BooleanField('أُضيف للمشروع', default=False)
    created_at = models.DateTimeField('تاريخ التبرع', auto_now_add=True)
    updated_at = models.DateTimeField('آخر تحديث', auto_now=True)

    class Meta:
        verbose_name = 'تبرع'
        verbose_name_plural = 'التبرعات'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.amount} → {self.project_title or self.project_id}'

    def save(self, *args, **kwargs):
        if self.project_id and not self.project_title:
            self.project_title = self.project.title
        super().save(*args, **kwargs)

    def receipt_preview(self):
        src = ''
        if self.receipt_file:
            src = self.receipt_file.url
        elif self.receipt_image:
            src = self.receipt_image if self.receipt_image.startswith('data:') else self.receipt_image
        if not src:
            return '—'
        return format_html(
            '<img src="{}" style="max-width:120px;max-height:120px;border-radius:8px;border:1px solid #e2e8f0;" />',
            src,
        )

    receipt_preview.short_description = 'معاينة الإشعار'


class DirectDonation(models.Model):
    """Bank-transfer donation with receipt image (base64 or URL)."""

    STATUS_CHOICES = [
        ('pending', 'قيد المراجعة'),
        ('approved', 'مقبول'),
        ('rejected', 'مرفوض'),
    ]

    donation_type = models.CharField('نوع التبرع', max_length=100, default='تبرع عام')
    amount = models.DecimalField('المبلغ', max_digits=14, decimal_places=2)
    donor_name = models.CharField('اسم المتبرع', max_length=150, blank=True, default='فاعل خير')
    donor_phone = models.CharField('هاتف المتبرع', max_length=30, blank=True)
    donor_email = models.EmailField('بريد المتبرع', blank=True)
    project = models.ForeignKey(
        Project,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='direct_donations',
        verbose_name='المشروع (اختياري)',
    )
    receipt_image = models.TextField('صورة الإشعار (base64)', blank=True)
    receipt_file = models.ImageField('ملف الإشعار', upload_to='receipts/%Y/%m/', blank=True, null=True)
    bank_account = models.ForeignKey(
        'BankAccount',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transfers',
        verbose_name='الحساب البنكي',
    )
    status = models.CharField('الحالة', max_length=20, choices=STATUS_CHOICES, default='pending', db_index=True)
    admin_notes = models.TextField('ملاحظات الإدارة', blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_transfers',
        verbose_name='راجع بواسطة',
    )
    reviewed_at = models.DateTimeField('تاريخ المراجعة', null=True, blank=True)
    amount_applied = models.BooleanField('أُضيف للمشروع', default=False)
    created_at = models.DateTimeField('تاريخ الإرسال', auto_now_add=True)
    updated_at = models.DateTimeField('آخر تحديث', auto_now=True)

    class Meta:
        verbose_name = 'تبرع بنكي مباشر'
        verbose_name_plural = 'التبرعات البنكية المباشرة'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.donation_type} — {self.amount} ({self.status})'

    def receipt_preview(self):
        src = ''
        if self.receipt_file:
            src = self.receipt_file.url
        elif self.receipt_image:
            src = self.receipt_image if self.receipt_image.startswith('data:') else self.receipt_image
        if not src:
            return '—'
        return format_html(
            '<img src="{}" style="max-width:120px;max-height:120px;border-radius:8px;border:1px solid #e2e8f0;" />',
            src,
        )

    receipt_preview.short_description = 'معاينة الإشعار'


class BankAccount(models.Model):
    """Bank accounts shown for direct donations — fully editable from admin."""

    bank_name = models.CharField('اسم البنك', max_length=150)
    account_name = models.CharField('اسم الحساب', max_length=150, blank=True)
    account_number = models.CharField('رقم الحساب', max_length=80)
    iban = models.CharField('IBAN', max_length=50, blank=True)
    branch = models.CharField('الفرع', max_length=150, blank=True)
    currency = models.CharField('العملة', max_length=20, default='SDG')
    instructions = models.TextField('تعليمات التحويل', blank=True)
    is_active = models.BooleanField('نشط', default=True)
    is_primary = models.BooleanField('الحساب الرئيسي', default=False)
    sort_order = models.PositiveIntegerField('الترتيب', default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'حساب بنكي'
        verbose_name_plural = 'الحسابات البنكية'
        ordering = ['sort_order', 'bank_name']

    def __str__(self):
        return f'{self.bank_name} — {self.account_number}'

    def save(self, *args, **kwargs):
        if self.is_primary:
            BankAccount.objects.filter(is_primary=True).exclude(pk=self.pk).update(is_primary=False)
        super().save(*args, **kwargs)


class SiteSettings(models.Model):
    """Singleton platform settings — edit everything from one place."""

    site_name = models.CharField('اسم المنصة', max_length=120, default='الجسد الواحد')
    tagline = models.CharField('الشعار المختصر', max_length=255, blank=True, default='معاً لنصنع أثراً')
    about_text = models.TextField('نبذة عن المنصة', blank=True)
    mission = models.TextField('الرسالة', blank=True)
    vision = models.TextField('الرؤية', blank=True)
    hero_title = models.CharField('عنوان الصفحة الرئيسية', max_length=255, blank=True)
    hero_subtitle = models.TextField('وصف الصفحة الرئيسية', blank=True)
    contact_email = models.EmailField('البريد للتواصل', blank=True)
    contact_phone = models.CharField('هاتف التواصل', max_length=40, blank=True)
    whatsapp_number = models.CharField('رقم واتساب', max_length=40, blank=True, default='249920380318')
    facebook_url = models.URLField('فيسبوك', blank=True)
    twitter_url = models.URLField('تويتر / X', blank=True)
    instagram_url = models.URLField('إنستغرام', blank=True)
    logo_url = models.URLField('رابط الشعار', blank=True)
    footer_text = models.CharField('نص التذييل', max_length=255, blank=True, default='صنع بحب لأجل السودان')
    stats_donors = models.CharField('إحصائية المتبرعين', max_length=40, blank=True, default='5,000+')
    stats_projects = models.CharField('إحصائية المشاريع', max_length=40, blank=True, default='1,200+')
    stats_states = models.CharField('إحصائية الولايات', max_length=40, blank=True, default='18')
    maintenance_mode = models.BooleanField('وضع الصيانة', default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'إعدادات المنصة'
        verbose_name_plural = 'إعدادات المنصة'

    def __str__(self):
        return self.site_name

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        pass

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class PageContent(models.Model):
    """Editable CMS pages / content blocks."""

    key = models.SlugField('المفتاح', max_length=80, unique=True, help_text='مثال: about, terms, privacy')
    title = models.CharField('العنوان', max_length=200)
    body = models.TextField('المحتوى')
    is_published = models.BooleanField('منشور', default=True)
    sort_order = models.PositiveIntegerField('الترتيب', default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'صفحة محتوى'
        verbose_name_plural = 'صفحات المحتوى'
        ordering = ['sort_order', 'title']

    def __str__(self):
        return self.title


class ContactMessage(models.Model):
    """Messages from visitors — managed in admin."""

    STATUS_CHOICES = [
        ('new', 'جديد'),
        ('read', 'مقروء'),
        ('replied', 'تم الرد'),
        ('archived', 'مؤرشف'),
    ]

    name = models.CharField('الاسم', max_length=150)
    email = models.EmailField('البريد')
    phone = models.CharField('الهاتف', max_length=40, blank=True)
    subject = models.CharField('الموضوع', max_length=200, blank=True)
    message = models.TextField('الرسالة')
    status = models.CharField('الحالة', max_length=20, choices=STATUS_CHOICES, default='new')
    admin_notes = models.TextField('ملاحظات', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'رسالة تواصل'
        verbose_name_plural = 'رسائل التواصل'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} — {self.subject or self.email}'


class Announcement(models.Model):
    """Site banners / announcements controlled from admin."""

    title = models.CharField('العنوان', max_length=200)
    body = models.TextField('النص', blank=True)
    link_url = models.URLField('رابط', blank=True)
    is_active = models.BooleanField('نشط', default=True)
    starts_at = models.DateTimeField('يبدأ في', null=True, blank=True)
    ends_at = models.DateTimeField('ينتهي في', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'إعلان'
        verbose_name_plural = 'الإعلانات'
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class AdminNotification(models.Model):
    """In-app notifications for platform admins / superusers."""

    TYPE_CHOICES = [
        ('project_pending', 'مشروع بانتظار الموافقة'),
        ('donation_pending', 'تبرع بانتظار التحقق'),
        ('transfer_pending', 'تحويل بنكي بانتظار المراجعة'),
        ('contact', 'رسالة تواصل'),
        ('system', 'نظام'),
    ]

    type = models.CharField('النوع', max_length=40, choices=TYPE_CHOICES, default='system', db_index=True)
    title = models.CharField('العنوان', max_length=255)
    message = models.TextField('الرسالة', blank=True)
    link = models.CharField('رابط', max_length=300, blank=True)
    is_read = models.BooleanField('مقروء', default=False, db_index=True)
    related_id = models.PositiveIntegerField('معرّف مرتبط', null=True, blank=True)
    created_at = models.DateTimeField('تاريخ الإنشاء', auto_now_add=True)

    class Meta:
        verbose_name = 'إشعار إدارة'
        verbose_name_plural = 'إشعارات الإدارة'
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    @classmethod
    def notify(cls, type_, title, message='', link='', related_id=None):
        return cls.objects.create(
            type=type_,
            title=title,
            message=message,
            link=link,
            related_id=related_id,
        )
