from django.contrib.auth.models import AbstractUser
from django.db import models

ROLE_CHOICES = [("admin", "Admin"), ("staff", "Staff")]


class User(AbstractUser):
    # Single Admin: role dipertahankan untuk kompatibilitas DB/migrasi,
    # tapi default admin dan is_admin fallback ke is_superuser/is_staff.
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default="admin")

    # --- Field sesuai spec laporan (10 kolom) ---
    email_verified = models.BooleanField(default=False, help_text="Status verifikasi email")
    banned = models.BooleanField(default=False, help_text="Status akun diblokir")
    ban_reason = models.TextField(null=True, blank=True, help_text="Alasan pemblokiran")
    ban_expires = models.DateTimeField(null=True, blank=True, help_text="Masa berlaku blokir")
    updated_at = models.DateTimeField(auto_now=True, help_text="Tanggal diperbarui")

    @property
    def name(self) -> str:
        # Alias untuk spec laporan: Nama pengguna = get_full_name() fallback ke username
        full = self.get_full_name().strip()
        return full if full else self.username

    @property
    def is_banned_active(self) -> bool:
        if not self.banned:
            return False
        if self.ban_expires is None:
            return True
        from django.utils import timezone

        return timezone.now() < self.ban_expires

    @property
    def is_admin(self) -> bool:
        # Kompatibel Single Admin: superuser/staff Django dianggap admin.
        # Legacy role="admin" tetap dihormati untuk DB lama.
        if getattr(self, "is_superuser", False):
            return True
        if getattr(self, "is_staff", False):
            return True
        return self.role == "admin"
