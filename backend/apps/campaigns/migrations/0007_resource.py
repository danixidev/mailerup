from django.conf import settings
import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('campaigns', '0006_campaign_excluded_emails'),
    ]

    operations = [
        migrations.CreateModel(
            name='Resource',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('original_name', models.CharField(max_length=255)),
                ('stored_name', models.CharField(max_length=255, unique=True)),
                ('content_type', models.CharField(blank=True, max_length=100)),
                ('file_size', models.PositiveIntegerField(default=0)),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='resources',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'ordering': ['-uploaded_at'],
            },
        ),
    ]
