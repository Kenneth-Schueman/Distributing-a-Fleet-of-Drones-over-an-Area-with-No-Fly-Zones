from django.db import models

# Create your models here.
class Point(models.Model):
    latitude = models.FloatField(default=0.0)
    longitude = models.FloatField(default=0.0)
    nofly = models.ForeignKey('NoFly', on_delete=models.CASCADE, null=True, blank=True, related_name='points')
    partitions = models.ForeignKey('Partition', on_delete=models.CASCADE, null=True, blank=True, related_name='points')

    def __str__(self):
        return "({}, {})".format(self.latitude, self.longitude)

class NoFly(models.Model):
    map = models.ForeignKey('Map', on_delete=models.CASCADE)
    
    def __str__(self):
        return "{}".format(self.points)

class Drone(models.Model):
    number = models.IntegerField(default=0)
    latitude = models.FloatField(default=0)
    longitude = models.FloatField(default=0)
    isMoving = models.BooleanField(default=False)
    map = models.ForeignKey('Map', on_delete=models.CASCADE, related_name='drones')

    def __str__(self):
        return "({}, {})".format(self.id, self.isMoving)

class Partition(models.Model):
    drone = models.OneToOneField(Drone, on_delete=models.CASCADE, null=True, blank=True, related_name='partitions')
    number = models.IntegerField(default=0)
    num_drones = models.IntegerField(default=4)
    # TYPES: 0 = regular decomposition, 1 = half perimeter, 2 = native decomposition
    type = models.CharField(max_length=1, default=0) 
    map = models.ForeignKey('Map', on_delete=models.CASCADE, related_name='partitions')

    def __str__(self):
        return "({}, {})".format(self.points, self.noflies)

class Map(models.Model):
    center_latitude = models.FloatField(default=0.0)
    center_longitude = models.FloatField(default=0.0)
    length = models.FloatField(default=0.0)
    width = models.FloatField(default=0.0)

    def __str__(self):
        return "({}, {}, {}, {})".format(self.center_latitude, self.center_longitude, self.length, self.width)
