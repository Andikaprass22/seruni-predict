from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

User = get_user_model()


class Command(BaseCommand):
    help = "Buat user staff"

    def add_arguments(self, parser):
        parser.add_argument("username")
        parser.add_argument("--password", default="staff123")

    def handle(self, *args, **opts):
        username = opts["username"]
        if User.objects.filter(username=username).exists():
            self.stdout.write(self.style.WARNING(f"User {username} sudah ada"))
            return
        User.objects.create_user(username=username, password=opts["password"], role="staff")
        self.stdout.write(self.style.SUCCESS(f"User staff dibuat: {username}"))
