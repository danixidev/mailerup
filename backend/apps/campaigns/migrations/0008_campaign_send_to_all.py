from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("campaigns", "0007_resource"),
    ]

    operations = [
        migrations.AddField(
            model_name="campaign",
            name="send_to_all",
            field=models.BooleanField(default=False),
        ),
    ]
