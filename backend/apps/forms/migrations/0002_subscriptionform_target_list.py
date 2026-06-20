import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("subscribers", "0001_initial"),
        ("subscription_forms", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="subscriptionform",
            name="target_list",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="forms",
                to="subscribers.subscriberlist",
            ),
        ),
    ]
