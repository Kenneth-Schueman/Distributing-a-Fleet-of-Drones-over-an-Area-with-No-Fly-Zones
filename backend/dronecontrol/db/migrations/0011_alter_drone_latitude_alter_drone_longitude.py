# Generated by Django 5.1.4 on 2025-04-02 23:36

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('db', '0010_drone_latitude_drone_longitude'),
    ]

    operations = [
        migrations.AlterField(
            model_name='drone',
            name='latitude',
            field=models.FloatField(default=0),
        ),
        migrations.AlterField(
            model_name='drone',
            name='longitude',
            field=models.FloatField(default=0),
        ),
    ]
