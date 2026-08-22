from django.contrib.auth.models import AbstractUser
from django.db import models

ROLE_CHOICES = [("admin", "Admin"), ("staff", "Staff")]


class User(AbstractUser):
    # Single Admin: role dipertahankan untuk kompatibilitas DB/migrasi,
    # tapi default admin dan is_admin fallback ke is_superuser/is_staff.
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default="admin")

    @property
    def is_admin(self) -> bool:
        # Kompatibel Single Admin: superuser/staff Django dianggap admin.
        # Legacy role="admin" tetap dihormati untuk DB lama.
        if getattr(self, "is_superuser", False):
            return True
        if getattr(self, "is_staff", False):
            return True
        return self.role == "admin"
