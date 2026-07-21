from decimal import Decimal
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils.text import slugify
from apps.charity.models import (
    Project,
    Donation,
    Category,
    BankAccount,
    SiteSettings,
    PageContent,
    Announcement,
)

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed sample charity data, admin users, categories, and site settings'

    def handle(self, *args, **options):
        admin, created = User.objects.get_or_create(
            email='admin@aljasad.sd',
            defaults={
                'display_name': 'مشرف المنصة',
                'role': 'admin',
                'is_staff': True,
                'is_superuser': True,
            },
        )
        if created:
            admin.set_password('admin1234')
            admin.save()
            self.stdout.write(self.style.SUCCESS('Created admin@aljasad.sd / admin1234'))
        else:
            self.stdout.write('Admin user already exists')

        aiq_admin, created = User.objects.get_or_create(
            email='admin@aiq.qa',
            defaults={
                'display_name': 'AIQ Admin',
                'role': 'admin',
                'is_staff': True,
                'is_superuser': True,
            },
        )
        if created:
            aiq_admin.set_password('Aiq@2026')
            aiq_admin.save()
            self.stdout.write(self.style.SUCCESS('Created admin@aiq.qa / Aiq@2026'))
        else:
            aiq_admin.role = 'admin'
            aiq_admin.is_staff = True
            aiq_admin.is_superuser = True
            aiq_admin.set_password('Aiq@2026')
            aiq_admin.save()
            self.stdout.write('AIQ admin already exists (password/role refreshed)')

        demo, created = User.objects.get_or_create(
            email='demo@aljasad.sd',
            defaults={'display_name': 'مستخدم تجريبي', 'role': 'user'},
        )
        if created:
            demo.set_password('demo1234')
            demo.save()
            self.stdout.write(self.style.SUCCESS('Created demo@aljasad.sd / demo1234'))

        # Categories
        categories = [
            ('مياه وآبار', 'Droplets', 'text-blue-500', 1),
            ('مساجد', 'Landmark', 'text-emerald-600', 2),
            ('زكاة مال', 'Coins', 'text-amber-500', 3),
            ('زكاة فطر', 'Coins', 'text-amber-600', 4),
            ('فدية صيام', 'Heart', 'text-red-500', 5),
            ('دعم التعليم', 'GraduationCap', 'text-purple-500', 6),
            ('الصحة', 'HeartPulse', 'text-red-500', 7),
        ]
        for name, icon, color, order in categories:
            Category.objects.update_or_create(
                name=name,
                defaults={
                    'slug': slugify(name, allow_unicode=True) or f'cat-{order}',
                    'icon': icon,
                    'color': color,
                    'is_active': True,
                    'sort_order': order,
                },
            )
        self.stdout.write(self.style.SUCCESS(f'Seeded {len(categories)} categories'))

        # Bank account
        BankAccount.objects.update_or_create(
            account_number='1780926',
            defaults={
                'bank_name': 'بنك الخرطوم',
                'account_name': 'منصة الجسد الواحد',
                'currency': 'SDG',
                'is_active': True,
                'is_primary': True,
                'sort_order': 1,
                'instructions': 'بعد التحويل، ارفع صورة الإشعار من زر التبرع المباشر.',
            },
        )
        self.stdout.write(self.style.SUCCESS('Seeded primary bank account'))

        # Site settings
        settings = SiteSettings.load()
        if not settings.about_text:
            settings.about_text = (
                'نحن منصة رقمية سودانية رائدة، تهدف إلى رقمنة العمل الخيري وتحويله '
                'إلى نظام ذكي، شفاف، ومستدام يربط بين المتبرعين والمشاريع الأكثر احتياجاً في السودان.'
            )
            settings.mission = 'تمكين كل سوداني من المساهمة في بناء مجتمعه بشفافية وسهولة.'
            settings.vision = 'سودان متكافل، لا يبيت فيه محتاج دون سند.'
            settings.hero_title = 'معاً... جسدٌ واحد'
            settings.hero_subtitle = 'ساهم في مشاريع خيرية موثوقة وشفافة في كل ولايات السودان.'
            settings.whatsapp_number = '249920380318'
            settings.contact_email = 'info@aljasadalwahid.org'
            settings.save()
            self.stdout.write(self.style.SUCCESS('Seeded site settings'))

        PageContent.objects.update_or_create(
            key='about',
            defaults={
                'title': 'عن المنصة',
                'body': settings.about_text,
                'is_published': True,
                'sort_order': 1,
            },
        )

        Announcement.objects.get_or_create(
            title='مرحباً بكم في منصة الجسد الواحد',
            defaults={
                'body': 'تبرّع بثقة — كل مشروع يخضع للمراجعة والشفافية.',
                'is_active': True,
            },
        )

        samples = [
            {
                'title': 'حفر بئر ارتوازي في قرية الكاملين',
                'description': 'مشروع لحفر بئر ارتوازي وتوصيل المياه لأكثر من 500 أسرة في قرية الكاملين بولاية الجزيرة.',
                'category': 'مياه وآبار',
                'target_amount': Decimal('2500000'),
                'current_amount': Decimal('875000'),
                'donor_count': 42,
                'location': 'الجزيرة',
                'is_featured': True,
            },
            {
                'title': 'بناء مسجد في حي الثورة',
                'description': 'إكمال بناء مسجد الحي مع ملحقات تعليم القرآن الكريم.',
                'category': 'مساجد',
                'target_amount': Decimal('5000000'),
                'current_amount': Decimal('2100000'),
                'donor_count': 67,
                'location': 'الخرطوم',
                'is_featured': True,
            },
            {
                'title': 'دعم تعليم الأيتام',
                'description': 'تغطية رسوم الدراسة والكتب لـ 100 يتيم في الخرطوم.',
                'category': 'دعم التعليم',
                'target_amount': Decimal('1500000'),
                'current_amount': Decimal('450000'),
                'donor_count': 28,
                'location': 'الخرطوم',
            },
            {
                'title': 'عيادة طبية متنقلة',
                'description': 'تمويل عيادة متنقلة تقدم خدمات طبية أولية في المناطق النائية.',
                'category': 'الصحة',
                'target_amount': Decimal('3000000'),
                'current_amount': Decimal('1200000'),
                'donor_count': 55,
                'location': 'دارفور',
                'is_featured': True,
            },
        ]

        created_count = 0
        for data in samples:
            cat = Category.objects.filter(name=data['category']).first()
            _, was_created = Project.objects.get_or_create(
                title=data['title'],
                defaults={
                    **data,
                    'category_ref': cat,
                    'creator': admin,
                    'creator_name': admin.display_name,
                    'is_public': True,
                    'status': 'active',
                },
            )
            if was_created:
                created_count += 1

        self.stdout.write(self.style.SUCCESS(f'Seeded {created_count} projects (skipped existing).'))
