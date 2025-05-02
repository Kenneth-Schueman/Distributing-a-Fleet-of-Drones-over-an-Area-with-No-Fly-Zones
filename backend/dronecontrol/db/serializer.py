from rest_framework import serializers
from . models import *

class PointSerializer(serializers.ModelSerializer):
    class Meta:
        model = Point
        fields = ['latitude', 'longitude']

class DroneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Drone
        fields = ['number', 'latitude', 'longitude', 'isMoving']

class NoFlySerializer(serializers.ModelSerializer):
    points = PointSerializer(many=True, read_only=True)
    
    class Meta:
        model = NoFly
        fields = ['id', 'map', 'points']

class PartitionSerializer(serializers.ModelSerializer):
    drone = DroneSerializer(many=False, read_only=True)
    points = PointSerializer(many=True, read_only=True)
    
    class Meta:
        model = Partition
        fields = ['id', 'number', 'type', 'drone', 'map', 'points', 'num_drones']

class MapSerializer(serializers.ModelSerializer):
    class Meta:
        model = Map
        fields = ['center_latitude', 'center_longitude', 'length', 'width']
