from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    """Manager where email is the unique identifier."""

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('البريد الإلكتروني مطلوب')
        email = self.normalize_email(email)
        extra_fields.setdefault('username', email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    """Custom user for the charity platform."""

    ROLE_CHOICES = [
        ('user', 'مستخدم'),
        ('admin', 'مشرف'),
    ]

    email = models.EmailField('البريد الإلكتروني', unique=True)
    display_name = models.CharField('الاسم الظاهر', max_length=150, blank=True)
    photo_url = models.URLField('صورة الملف الشخصي', max_length=500, blank=True)
    role = models.CharField('الدور', max_length=20, choices=ROLE_CHOICES, default='user')
    google_id = models.CharField('Google ID', max_length=255, blank=True, null=True, unique=True)
    phone = models.CharField('الهاتف', max_length=30, blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta:
        verbose_name = 'مستخدم'
        verbose_name_plural = 'المستخدمون'
        ordering = ['-date_joined']

    def __str__(self):
        return self.display_name or self.email

    def save(self, *args, **kwargs):
        if not self.display_name:
            if self.first_name or self.last_name:
                self.display_name = f'{self.first_name} {self.last_name}'.strip()
            else:
                self.display_name = self.email.split('@')[0]
        if not self.username:
            self.username = self.email
        super().save(*args, **kwargs)

    @property
    def uid(self):
        """Frontend-compatible id string."""
        return str(self.pk)
