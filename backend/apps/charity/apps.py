from django.apps import AppConfig


class CharityConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.charity'
    label = 'charity'
    verbose_name = 'المشاريع والتبرعات'
