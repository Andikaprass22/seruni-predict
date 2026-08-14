from django.contrib.auth.models import AbstractUser
from django.db import models

ROLE_CHOICES = [("admin", "Admin"), ("staff", "Staff")]


class User(AbstractUser):
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default="staff")

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"
