from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0010_employee_must_change_password_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="organization",
            name="telegram_chat_id",
            field=models.CharField(blank=True, default="", max_length=64),
        ),
    ]
