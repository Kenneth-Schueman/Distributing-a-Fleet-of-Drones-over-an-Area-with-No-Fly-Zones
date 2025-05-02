from django.shortcuts import render
from rest_framework.views import APIView
from . models import *
from . serializer import *
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from rest_framework.response import Response
from rest_framework import status
from phdcode.synthetic_data.synthetic_data_generation_on_three_conditions import ResearchDataGenerator
from phdcode.synthetic_data.Non_Uniform_Synthetic_data_generator_clustering import ResearchDataGenerator as rdg
from shapely.geometry import shape, Point as ShapelyPoint
from phdcode.main_decomposition import nokdrun
from phdcode.main_kd_tree import kdrunhalf
from phdcode.main_kd_tree import kdrunnative
import json
import csv
import os
import shutil
import math


######### WEBSOCKET VIEWS ###########
def info(request):
    return render(request, 'db/info.html')

# Sets up websocket rooms for algorithm display
def room(request, algo_room):
    return render(request, "db/room.html", {"algo_room": algo_room})

######### API VIEWS ###########
######### DATABASE FETCHES #########
# Returns all drones
class DroneView(APIView):
    def post(self, request):
        output=[{"number": output.number}
                for output in Drone.objects.all()]
        return Response(output)

# Returns all aspects of a map
class MapData(APIView):
    def post(self, request):
        map_id = request.data.get('map_id', None)
        if map_id is None:
            return Response({"error": "map_id is required"})
        try:
            map_instance = Map.objects.get(id=map_id)
        except Map.DoesNotExist:
            return Response({"error": "map_id does not exist"})

        partition_type = request.data.get('partition_type', None)
        if partition_type < 0 or partition_type > 2:
            return Response({"error": "partition_type must be 0 (regular decomposition), 1 (half perimeter  kd decomposition), 2 (native kd decomposition)"})

        num_drones = request.data.get('num_drones', 4)
        if num_drones < 2 or num_drones > 5:
            return Response({"error": "Need the number of drones to be a power of 2 up to 32 total."})

        no_fly_zones = NoFly.objects.filter(map=map_instance)
        if not no_fly_zones.exists():
            return Response({"error": "No-fly zones were not generated for this map"})
        nfserializer = NoFlySerializer(no_fly_zones, many=True)

        partitions = Partition.objects.filter(map=map_instance, type=partition_type, num_drones=2**num_drones)
        if not partitions.exists():
            return Response({"error": f"Partitions of type {partition_type} have not been generated for this map"})
        pserializer = PartitionSerializer(partitions, many=True)

        return Response({
            "map_id": map_instance.id,
            "map_length": map_instance.length,
            "map_width": map_instance.width,
            "map_center_lat": map_instance.center_latitude,
            "map_center_long": map_instance.center_longitude,
            "partitions": pserializer.data,
            "no_fly_zones": nfserializer.data
        })

class MapNoFlies(APIView):
    def post(self, request):
        map_id = request.data.get('map_id', None)
        if map_id is None:
            return Response({"error": "map_id is required"})
        try:
            map_instance = Map.objects.get(id=map_id)
        except Map.DoesNotExist:
            return Response({"error": "map_id does not exist"})

        no_fly_zones = NoFly.objects.filter(map=map_instance)
        if not no_fly_zones.exists():
            return Response({"error": "No-fly zones were not generated for this map"})
        nfserializer = NoFlySerializer(no_fly_zones, many=True)

        return Response({
            "map_id": map_instance.id,
            "map_length": map_instance.length,
            "map_width": map_instance.width,
            "map_center_lat": map_instance.center_latitude,
            "map_center_long": map_instance.center_longitude,
            "no_fly_zones": nfserializer.data
        })

# Returns all no-fly zones specific to a map (assuming they're generated)
class NoFlyData(APIView):
    def post(self, request):
        map_id = request.data.get('map_id', None)
        if map_id is None:
            return Response({"error": "map_id is required"})
        try:
            map_instance = Map.objects.get(id=map_id)
        except Map.DoesNotExist:
            return Response({"error": "map_id does not exist"})
        
        no_fly_zones = NoFly.objects.filter(map=map_instance)
        if not no_fly_zones.exists():
            return Response({"error": "No-fly zones have not been generated for this map"})

        serializer = NoFlySerializer(no_fly_zones, many=True)
        return Response({
            "no_fly_zones": serializer.data
        })

# Returns all partitions specific to a map (assuming they've been generated)
class PartitionData(APIView):
    def post(self, request):
        map_id = request.data.get('map_id', None)
        if map_id is None:
            return Response({"error": "map_id is required"})
        try:
            map_instance = Map.objects.get(id=map_id)
        except Map.DoesNotExist:
            return Response({"error": "map_id does not exist"})
        
        num_drones = request.data.get('num_drones', 4)
        if num_drones < 2 or num_drones > 5:
            return Response({"error": "Need drones to a power of 2 up to 32 total."})
        resp = {
            "map_id": map_id
        }
        
        no_kd_partitions = Partition.objects.filter(map=map_instance, type=0, num_drones=2**num_drones)
        if no_kd_partitions.exists():
            resp["no_kd_partitions"] = PartitionSerializer(no_kd_partitions, many=True).data
        else:
            resp["no_kd_partitions"] = "No non kd partitions generated"

        half_perim_partitions = Partition.objects.filter(map=map_instance, type=1, num_drones=2**num_drones)
        if half_perim_partitions.exists():
            resp["half_perim_partitions"] = PartitionSerializer(half_perim_partitions, many=True).data
        else:
            resp["half_perim_partitions"] = "No half perimeter kd partitions generated"

        native_partitions = Partition.objects.filter(map=map_instance, type=2, num_drones=2**num_drones)
        if native_partitions.exists():
            resp["native_partitions"] = PartitionSerializer(native_partitions, many=True).data
        else:
            resp["native_partitions"] = "No native kd partitions generated"

        return Response(resp)

######## DATABASE GENERATORS #########

######## NO FLY GENERATION ###########

# Generates Synthetic NoFlies without non uniform distribution
class GenerateMapSyntheticNoFlies(APIView):
    def post(self, request):
        layer = get_channel_layer()
        async_to_sync(layer.group_send)(
            "db_algo_room",
            {
                "type": "algo_status",
                "message": "Generating synthetic no-fly zones"
            }
        )
        region_width = request.data.get('region_width', 100)
        region_height = request.data.get('region_height', 100)
        region_size = [100, 100]
        center_latitude = request.data.get('center_latitude', 0)
        center_longitude = request.data.get('center_longitude', 0)
        obstacle_percentage = request.data.get('obstacle_percentage', 0.1)
        max_obstacle_size = request.data.get('max_obstacle_size', 10)
        size_variation = request.data.get('size_variation', 0.1)
        seed = request.data.get('seed', 40)
        
        if region_width < 1:
            return Response({"error": "region_width must be greater than or equal to 1"})
        if region_height < 1:
            return Response({"error": "region_height must be greater than or equal to 1"})
        if not 0 <= obstacle_percentage <= 1:
            return Response({"error": "obstacle_percentage must be between 0 and 1"})
        if max_obstacle_size < 1:  
            return Response({"error": "max_obstacle_size must be greater than or equal to 1"})
        if not 0 <= size_variation <= 1:
            return Response({"error": "size_variation must be between 0 and 1"})
        if seed < 0:
            return Response({"error": "seed must be greater than or equal to 0"})
        
        generator = ResearchDataGenerator(
            region_size=region_size,
            obstacle_percentage=obstacle_percentage,
            max_obstacle_size=max_obstacle_size,
            size_variation=size_variation,
            seed=seed
        )

        map_instance = Map.objects.create(
            center_latitude=center_latitude,
            center_longitude=center_longitude,
            length=region_height,
            width=region_width
        )

        region = generator.generate_region()
        obstacles = generator.generate_obstacles(region)
        obstacles = generator.ensure_connectivity(region, obstacles)

        no_fly_zones = []
        for obstacle in obstacles:
            no_fly_zone = NoFly.objects.create(map=map_instance)
            for point in obstacle.exterior.coords:
                Point.objects.create(
                    latitude=((point[1] * region_height / 100) + center_latitude - (region_height / 2)),
                    longitude=((point[0] * region_width / 100) + center_longitude - (region_width / 2)),
                    nofly=no_fly_zone,
                    partitions=None
                )
            no_fly_zones.append(no_fly_zone)

        async_to_sync(layer.group_send)(
            "db_algo_room",
            {
                "type": "algo_status",
                "message": f"Generated {len(no_fly_zones)} no fly zones for map {map_instance.id}"
            }
        )
        serializer = NoFlySerializer(no_fly_zones, many=True)
        return Response({
            "map_id": map_instance.id,
            "no_fly_zones": serializer.data
        }, status=status.HTTP_201_CREATED)

        
class GenerateMapClusterNoFlies(APIView):
    def post(self, request):
        layer = get_channel_layer()
        async_to_sync(layer.group_send)(
            "db_algo_room",
            {
                "type": "algo_status",
                "message": "Generating no fly zones based on clusters"
            }
        )
        region_width = request.data.get('region_width', 100)
        region_height = request.data.get('region_height', 100)
        region_size = [100, 100]
        center_latitude = request.data.get('center_latitude', 0)
        center_longitude = request.data.get('center_longitude', 0)
        obstacle_percentage = request.data.get('obstacle_percentage', 0.1)
        max_obstacle_size = request.data.get('max_obstacle_size', 10)
        size_variation = request.data.get('size_variation', 0.1)
        seed = request.data.get('seed', 40)
        clusters = request.data.get('clusters', None)

        generator = rdg(
            region_size=region_size,
            obstacle_percentage=obstacle_percentage,
            max_obstacle_size=max_obstacle_size,
            size_variation=size_variation,
            seed=seed,
            clusters=clusters
        )

        map_instance = Map.objects.create(
            center_latitude=center_latitude,
            center_longitude=center_longitude,
            length=region_height,
            width=region_width
        )

        region = generator.generate_region()
        obstacles = generator.generate_obstacles(region)
        obstacles = generator.ensure_connectivity(region, obstacles)

        no_fly_zones = []
        for obstacle in obstacles:
            no_fly_zone = NoFly.objects.create(map=map_instance)
            for point in obstacle.exterior.coords:
                Point.objects.create(
                    latitude=((point[1] * region_height / 100) + center_latitude - (region_height / 2)),
                    longitude=((point[0] * region_width / 100) + center_longitude - (region_width / 2)),
                    nofly=no_fly_zone,
                    partitions=None
                )
            no_fly_zones.append(no_fly_zone)
            
        async_to_sync(layer.group_send)(
            "db_algo_room",
            {
                "type": "algo_status",
                "message": f"Generated {len(no_fly_zones)} no-fly zones for map {map_instance.id}"
            }
        )
        serializer = NoFlySerializer(no_fly_zones, many=True)
        return Response({
            "map_id": map_instance.id,
            "no_fly_zones": serializer.data
        }, status=status.HTTP_201_CREATED)

# If users draw no fly zones this is how their map is created
class UserDrawnNoFlyZones(APIView):
    def post(self, request):
        layer = get_channel_layer()
        async_to_sync(layer.group_send)(
            "db_algo_room",
            {
                "type": "algo_status",
                "message": "Generating user drawn no fly zones"
            }
        )
    
        region_width = request.data.get('region_width', 100) # In case Nick meant we want to create a brand new map
        region_height = request.data.get('region_height', 100)
        center_latitude = request.data.get('center_latitude', 0)
        center_longitude = request.data.get('center_longitude', 0)

        map_instance = Map.objects.create(
            center_latitude=center_latitude,
            center_longitude=center_longitude,
            length=region_height,
            width=region_width
        )
        
        no_fly_zones = []
        coordinates = request.data.get('coordinates', None)
        for points in coordinates:
            no_fly_zone = NoFly.objects.create(map=map_instance)
            for point in points:
                Point.objects.create(
                    latitude=((point[1] * region_height / 100) + center_latitude - (region_height / 2)),
                    longitude=((point[0] * region_width / 100) + center_longitude - (region_width / 2)),
                    nofly=no_fly_zone,
                    partitions=None
                )
            no_fly_zones.append(no_fly_zone)
            
        async_to_sync(layer.group_send)(
            "db_algo_room",
            {
                "type": "algo_status",
                "message": f"Generated {len(no_fly_zones)} no-fly zones for map {map_instance.id}"
            }
        )
        serializer = NoFlySerializer(no_fly_zones, many=True)
        return Response({
            "map_id": map_instance.id,
            "no_fly_zones": serializer.data
        }, status=status.HTTP_201_CREATED)
    

###### FAA Data #######
class LoadFAA(APIView):
    def post(self, request):
        #MAP ID 1
        file_path = os.path.join(os.path.dirname(__file__), '..', 'datasets', 'FAA-IOWA.geojson')
        file_path = os.path.abspath(file_path)
        ProcessGeoJson(file_path, 41.962, -93.385, 3.07, 6.3)

        # #MAP ID 2
        # file_path = os.path.join(os.path.dirname(__file__), '..', 'datasets', 'FAA-Recognized-Identification-Areas.geojson')
        # file_path = os.path.abspath(file_path)
        # ProcessGeoJson(file_path, 38.7946, -106.5348, 1582, 2680)

        # #MAP ID 3
        # file_path = os.path.join(os.path.dirname(__file__), '..', 'datasets', 'FAA-UAS-Facility-Map-Data.geojson')
        # file_path = os.path.abspath(file_path)
        # ProcessGeoJson(file_path, 38.7946, -106.5348, 1582, 2680)

        #MAP ID 2
        file_path = os.path.join(os.path.dirname(__file__), '..', 'datasets', 'IOWA-BOUNDARY.geojson')
        file_path = os.path.abspath(file_path)
        ProcessGeoJson(file_path, 41.962, -93.385, 3.07, 6.3)

        #MAP ID 3
        file_path = os.path.join(os.path.dirname(__file__), '..', 'datasets', 'National-Security-UAS-Flight-Restrictions.geojson')
        file_path = os.path.abspath(file_path)
        ProcessGeoJson(file_path, 38.7946, -106.5348, 24, 58)

        #MAP ID 4
        file_path = os.path.join(os.path.dirname(__file__), '..', 'datasets', 'Part-Time-National-Security-UAS-Flight-Restrictions.geojson')
        file_path = os.path.abspath(file_path)
        ProcessGeoJson(file_path, 38.7946, -106.5348, 24, 58)

        #MAP ID 5
        file_path = os.path.join(os.path.dirname(__file__), '..', 'datasets', 'Prohibited-Areas.geojson')
        file_path = os.path.abspath(file_path)
        ProcessGeoJson(file_path, 38.7946, -106.5348, 24, 58)

        #MAP ID 6
        file_path = os.path.join(os.path.dirname(__file__), '..', 'datasets', 'Recreational-Flyer-Fixed-Sites.geojson')
        file_path = os.path.abspath(file_path)
        ProcessGeoJson(file_path, 38.7946, -106.5348, 24, 58)

        return Response({
            "Status": "All maps generated"
        })

###### Partitions #######
class PartitionNoKD(APIView):
    def post(self, request):
        map_id = request.data.get('map_id', None)
        if map_id is None:
            return Response({"error": "map_id is required"})
        try:
            map_instance = Map.objects.get(id=map_id)
        except Map.DoesNotExist:
            return Response({"error": "map_id does not exist"})

        num_drones = request.data.get('num_drones', 4)  # 2^num_drones
        if num_drones < 2:
            return Response({"error": "must have 2 + drones as it generates 2^num_drones drones starting with 4."})

        computed = Partition.objects.filter(map=map_instance, type=0, num_drones=2**num_drones)
        if computed.exists():
            serializer = PartitionSerializer(computed, many=True)
            return Response({
                "map_id": map_id,
                "partitions": serializer.data
            })

        data_type = request.data.get('data_type', "synthetic_percent") # Not sure which to put so
        if data_type != "synthetic" and data_type != "iowa" and data_type != "synthetic_percent":
            return Response({"error": "data_type must be synthetic, iowa, or synthetic_percent"})
        numerical_method = "newton" # Default in prabins code
        metrics = ["NWCRT"] # No clue
        layer = get_channel_layer()
        async_to_sync(layer.group_send)(
            "db_algo_room",
            {
                "type": "algo_status",
                "message": f"Generating partitions without a KD tree for map {map_id}"
            }
        )

        data = generateJSON(map_instance)

        region = shape(data["region"])
        obstacles = [shape(ob) for ob in data["obstacles"]]

        csvfile = nokdrun(region, obstacles, num_drones, numerical_method, data_type, metrics) # Generates no flies (very slow jesus)
        async_to_sync(layer.group_send)(
            "db_algo_room",
            {
                "type": "algo_status",
                "message": "CSV of partitions generated"
            }
        )
        
        partitions = computePartitions(csvfile, map_instance, 0, obstacles, layer, num_drones)
        async_to_sync(layer.group_send)(
            "db_algo_room",
            {
                "type": "algo_status",
                "message": f"{len(partitions)} partitions and drones created for this map"
            }
        )
            
        serializer = PartitionSerializer(partitions, many=True)
        shutil.rmtree("temp")

        return Response({
            "map_id": map_instance.id,
            "partitions": serializer.data
        }, status=status.HTTP_200_OK)

class PartitionWKDHalf(APIView):
    def post(self, request):
        map_id = request.data.get('map_id', None)
        if map_id is None:
            return Response({"error": "map_id is required"})
        try:
            map_instance = Map.objects.get(id=map_id)
        except Map.DoesNotExist:
            return Response({"error": "map_id does not exist"})

        num_drones = request.data.get('num_drones', 4)  # 2^num_drones
        if num_drones < 2:
            return Response({"error": "must have 2 + drones as it generates 2^num_drones drones starting with 4."})

        computed = Partition.objects.filter(map=map_instance, type=1, num_drones=2**num_drones)
        if computed.exists():
            serializer = PartitionSerializer(computed, many=True)
            return Response({
                "map_id": map_id,
                "partitions": serializer.data
            })

        data_type = request.data.get('data_type', "synthetic_percent") # Not sure which to put so
        if data_type != "synthetic" and data_type != "iowa" and data_type != "synthetic_percent":
            return Response({"error": "data_type must be synthetic, iowa, or synthetic_percent"})
        numerical_method = "newton" # Default in prabins code
        metrics = ["NWCRT"] # No clue

        layer = get_channel_layer()
        data = generateJSON(map_instance)
        region = shape(data["region"])
        obstacles = [shape(ob) for ob in data["obstacles"]]
        async_to_sync(layer.group_send)(
            "db_algo_room",
            {
                "type": "algo_status",
                "message": f"Generating partitions using half perimeter KD trees for map {map_id}."
            }
        )

        csvfile = kdrunhalf(region, obstacles, num_drones, numerical_method, data_type, metrics) # Generates no flies (very slow jesus)
        async_to_sync(layer.group_send)(
            "db_algo_room",
            {
                "type": "algo_status",
                "message": "CSV file of partitions generated."
            }
        )

        partitions = computePartitions(csvfile, map_instance, 1, obstacles, layer, num_drones)

        async_to_sync(layer.group_send)(
            "db_algo_room",
            {
                "type": "algo_status",
                "message": f"{len(partitions)} partitions and drones created for this map."
            }
        )
            
        serializer = PartitionSerializer(partitions, many=True)
        shutil.rmtree("temp")

        return Response({
            "map_id": map_instance.id,
            "partitions": serializer.data
        }, status=status.HTTP_200_OK)
    
class PartitionWKDNative(APIView):
    def post(self, request):
        map_id = request.data.get('map_id', None)
        if map_id is None:
            return Response({"error": "map_id is required"})
        try:
            map_instance = Map.objects.get(id=map_id)
        except Map.DoesNotExist:
            return Response({"error": "map_id does not exist"})

        num_drones = request.data.get('num_drones', 4)  # 2^num_drones
        if num_drones < 2:
            return Response({"error": "must have 2 + drones as it generates 2^num_drones drones starting with 4."})

        computed = Partition.objects.filter(map=map_instance, type=2, num_drones=2**num_drones)
        if computed.exists() :
            serializer = PartitionSerializer(computed, many=True)
            return Response({
                "map_id": map_id,
                "partitions": serializer.data
            })

        data_type = request.data.get('data_type', "synthetic_percent") # Not sure which to put so
        if data_type != "synthetic" and data_type != "iowa" and data_type != "synthetic_percent":
            return Response({"error": "data_type must be synthetic, iowa, or synthetic_percent"})
        numerical_method = "newton" # Default in prabins code
        metrics = ["NWCRT"] # No clue

        layer = get_channel_layer()
        async_to_sync(layer.group_send)(
            "db_algo_room",
            {
                "type": "algo_status",
                "message": f"Generating partitions using a native kd tree for map {map_id}"
            }
        )

        data = generateJSON(map_instance)

        region = shape(data["region"])
        obstacles = [shape(ob) for ob in data["obstacles"]]

        csvfile = kdrunnative(region, obstacles, num_drones, numerical_method, data_type, metrics) # Generates no flies (very slow jesus)
        async_to_sync(layer.group_send)(
            "db_algo_room",
            {
                "type": "algo_status",
                "mesage": "CSV generated with partitions"
            }
        )

        partitions = computePartitions(csvfile, map_instance, 2, obstacles, layer, num_drones)
        async_to_sync(layer.group_send)(
            "db_algo_room",
            {
                "type": "algo_status",
                "message": f"{len(partitions)} partitions and drones created for this map."
            }
        )

        serializer = PartitionSerializer(partitions, many=True)

        shutil.rmtree("temp")
        return Response({
            "map_id": map_instance.id,
            "partitions": serializer.data
        }, status=status.HTTP_200_OK)


####### PATHFINDING OF DRONES #########
# Operates under assumption all no fly zones are convex
class RespondToEvent(APIView):
    def post(self, request):
        # get map
        map_id = request.data.get('map_id', None)
        if map_id is None:
            return Response({"error": "map_id is required"})
        try:
            map_instance = Map.objects.get(id=map_id)
        except Map.DoesNotExist:
            return Response({"error": "map_id does not exist"})
        
        num_drones = request.data.get('num_drones', 4)
        partition_type = request.data.get('partition_type', None)
        if partition_type < 0 or partition_type > 2:
            return Response({"error": "partition_type must be between 0 and 2"})
        layer = get_channel_layer()

        # get partitions and ids
        pzones = []
        ids = []
        partitionsfiltered = Partition.objects.filter(map=map_instance, type=partition_type, num_drones=2**num_drones)
        if not partitionsfiltered.exists():
            return Response({"error": f"partitions of type {partition_type} have not been generated yet"})
        for partition in partitionsfiltered:
            points = Point.objects.filter(partitions=partition)
            coordinates =[[point.longitude, point.latitude] for point in points]
            pzones.append({
                "type": "Polygon",
                "coordinates": [coordinates]
            })
            ids.append(partition.id)
        
        # get event
        event_longitude = request.data.get('event_long', 50)
        event_latitude = request.data.get('event_lat', 50)
        async_to_sync(layer.group_send)(
            "db_algo_room",
            {
                "type": "algo_status",
                "message": f"Responding to event at ({event_longitude}, {event_latitude})"
            }
        )
        if event_longitude < map_instance.center_longitude - (map_instance.width / 2) or event_longitude > map_instance.center_longitude + (map_instance.width / 2):
            return Response({"error": "points longitude is not within a partition"})
        if event_latitude < map_instance.center_latitude - (map_instance.length / 2) or event_latitude > map_instance.center_latitude + (map_instance.length / 2):
            return Response({"error": "points latitude is not within a partition"})

        event = ShapelyPoint(event_longitude, event_latitude)
        
        partitions = [shape(part) for part in pzones]
        drone = None
        for counter, partition in enumerate(partitions):
            if partition.contains(event):
                drone_zone = Partition.objects.get(id = ids[counter])
                drone = drone_zone.drone
                break
        if drone is None:
            return Response({"error": "event is not within any given partitions"})
        async_to_sync(layer.group_send)(
            "db_algo_room",
            {
                "type": "algo_status",
                "message": f"Event found in within partition with drone {drone.number} responding."
            }
        )
        if drone.isMoving:
            return Response({"error": "drone is already moving to new location"})
        
        data = generateJSON(map_instance)
        obstacles = [shape(ob) for ob in data["obstacles"]]

        for obstacle in obstacles:
            if obstacle.contains(event):
                return Response({"error": "Event is within no fly zone"})

        points_visited = []
        default_move = 0.1
        if abs(map_instance.width) < 2:
            default_move = 0.01
        elif abs(map_instance.width) < 5:
            default_move = 0.05

        start_pt = Point(
            latitude = drone.latitude,
            longitude = drone.longitude,
            nofly=None,
            partitions=None
        )
        points_visited.append(start_pt)
        dist, angle = calculateDistAngle(drone.longitude, drone.latitude, event_longitude, event_latitude)
        async_to_sync(layer.group_send)(
            "db_algo_room",
            {
                "type": "algo_status",
                "message": f"Start distance from event: {dist} degrees"
            }
        )

        # if no fly zones are not convex, this is the part to change
        while True:
            if abs(drone.longitude - event_longitude) <= default_move and abs(drone.latitude - event_latitude) <= default_move:
                drone.longitude = event_longitude
                drone.latitude = event_latitude
                end_pt = Point(
                    longitude = drone.longitude,
                    latitude = drone.latitude,
                    nofly = None,
                    partitions = None
                )
                points_visited.append(end_pt)
                break

            # make new change to location and check that it's not in any no flies
            move_x = math.cos(angle) * default_move
            move_y = math.sin(angle) * default_move 
            potential_x = drone.longitude + move_x
            potential_y = drone.latitude + move_y
            potential_pt = ShapelyPoint(potential_x, potential_y)
            
            # if made point not in any no flies add it to visited points
            in_route_obstacle = None
            for obstacle in obstacles:
                if obstacle.contains(potential_pt):
                    in_route_obstacle = obstacle
                    break
            
            if in_route_obstacle == None:
                drone.longitude = potential_x
                drone.latitude = potential_y
                pt_to_add = Point(
                    longitude = drone.longitude,
                    latitude = drone.latitude,
                    nofly = None,
                    partitions = None
                )
                points_visited.append(pt_to_add)

            # otherwise gotta figure out the two closest and find shortest path from there
            else:
                async_to_sync(layer.group_send)(
                    "db_algo_room",
                    {
                        "type": "algo_status",
                        "message": "Ran into no fly zone, calculating shortest path around obstacle"
                    }
                )
                points_first = []
                points_second = []
                dist1 = angle1 = dist2 = angle2 = float('inf')
                pt1 = ShapelyPoint(0, 0)
                pt2 = ShapelyPoint(0, 0)
                for pt in in_route_obstacle.exterior.coords:
                    pdist, pangle = calculateDistAngle(drone.longitude, drone.latitude, pt[0], pt[1])
                    potential_pt = ShapelyPoint(drone.longitude + default_move * math.cos(pangle), drone.latitude + default_move * math.sin(pangle))
                    if pdist < dist1 and not in_route_obstacle.contains(potential_pt):
                        dist2 = dist1
                        angle2 = angle1
                        pt2 = ShapelyPoint(pt1.x, pt1.y)
                        dist1 = pdist
                        angle1 = pangle
                        pt1 = ShapelyPoint(pt[0], pt[1])
                    elif pdist < dist2 and pt1.x != pt[0] and pt1.y != pt[1] and not in_route_obstacle.contains(potential_pt):
                        dist2 = pdist
                        angle2 = pangle
                        pt2 = ShapelyPoint(pt[0], pt[1])
                
                dist_traveled1, dist_traveled2 = 0, 0
                visited_shapelys = [pt1, pt2]
                closest_pt = ShapelyPoint(pt1.x, pt1.y)
                drone_loc1 = ShapelyPoint(drone.longitude, drone.latitude) #follows perimeter
                while True:
                    #route to pt1 add 10 points from inbetween drone loc and pt1
                    diff_dist, diff_angle = calculateDistAngle(drone_loc1.x, drone_loc1.y, closest_pt.x, closest_pt.y)
                    for _ in range(0, 10):
                        move_x = math.cos(diff_angle) * diff_dist / 10
                        move_y = math.sin(diff_angle) * diff_dist / 10
                        drone_loc1 = ShapelyPoint(drone_loc1.x + move_x, drone_loc1.y + move_y)
                        pt = Point(
                            longitude = drone_loc1.x,
                            latitude = drone_loc1.y,
                            nofly = None,
                            partitions = None
                        )
                        points_first.append(pt)
                    
                    if closest_pt not in visited_shapelys:
                        visited_shapelys.append(closest_pt)

                    # check if still in path of no fly zone if you are calculate next vertex to fly to
                    dist_traveled1 += diff_dist
                    pdist, pangle = calculateDistAngle(drone_loc1.x, drone_loc1.y, event_longitude, event_latitude)
                    test_pt = ShapelyPoint(drone_loc1.x + math.cos(pangle) * default_move, drone_loc1.y + math.sin(pangle) * default_move)
                    potential_pt = ShapelyPoint(drone_loc1.x + math.cos(pangle) * default_move, drone_loc1.y + math.sin(pangle) * default_move)
                    if not in_route_obstacle.contains(potential_pt):
                        dist1 = pdist
                        angle1 = pangle
                        break
                    else:
                        new_dist = 10000
                        for pt in in_route_obstacle.exterior.coords:
                            potential_pt = ShapelyPoint(pt[0], pt[1])
                            if potential_pt in visited_shapelys:
                                continue

                            pdist, pangle = calculateDistAngle(drone_loc1.x, drone_loc1.y, potential_pt.x, potential_pt.y)
                            potential_pt = ShapelyPoint(drone_loc1.x + default_move * math.cos(pangle), drone_loc1.y + default_move * math.sin(pangle))
                            if pdist < new_dist and not in_route_obstacle.contains(potential_pt):
                                new_dist = pdist
                                closest_pt = ShapelyPoint(pt[0], pt[1])
                    dist_traveled1 += pdist
                
                #traverse around second shortest point away from drone
                closest_pt = ShapelyPoint(pt2.x, pt2.y)
                drone_loc2 = ShapelyPoint(drone.longitude, drone.latitude)
                while True:
                    #route to pt2 add 10 points from inbetween drone loc and pt1
                    diff_dist, diff_angle = calculateDistAngle(drone_loc2.x, drone_loc2.y, closest_pt.x, closest_pt.y)
                    for _ in range(0, 10):
                        move_x = math.cos(diff_angle) * diff_dist / 10
                        move_y = math.sin(diff_angle) * diff_dist / 10
                        drone_loc2 = ShapelyPoint(drone_loc2.x + move_x, drone_loc2.y + move_y)
                        pt = Point(
                            longitude = drone_loc2.x,
                            latitude = drone_loc2.y,
                            nofly = None,
                            partitions = None
                        )
                        points_second.append(pt)
                    
                    if closest_pt not in visited_shapelys:
                        visited_shapelys.append(closest_pt)

                    # check if still in path of no fly else find next point around the no fly to traverse to
                    dist_traveled2 += diff_dist
                    pdist, pangle = calculateDistAngle(drone_loc2.x, drone_loc2.y, event_longitude, event_latitude)
                    potential_pt = ShapelyPoint(drone_loc2.x + math.cos(pangle) * default_move, drone_loc2.y + math.sin(pangle) * default_move)
                    if not in_route_obstacle.contains(test_pt):
                        dist1 = pdist
                        angle1 = pangle
                        break
                    else:
                        new_dist = 10000
                        for pt in in_route_obstacle.exterior.coords:
                            potential_pt = ShapelyPoint(pt[0], pt[1])
                            if potential_pt in visited_shapelys:
                                continue

                            pdist, pangle = calculateDistAngle(drone_loc2.x, drone_loc2.y, potential_pt.x, potential_pt.y)
                            potential_pt = ShapelyPoint(drone_loc2.x + default_move * math.cos(pangle), drone_loc2.y + default_move * math.sin(pangle))
                            if pdist < new_dist and not in_route_obstacle.contains(potential_pt):
                                new_dist = pdist
                                closest_pt = ShapelyPoint(pt[0], pt[1])
                    dist_traveled2 += pdist

                # Compare distance traveled in one direction vs other to take shortest path
                if dist_traveled1 < dist_traveled2:
                    drone.longitude = drone_loc1.x
                    drone.latitude = drone_loc1.y
                    points_visited.append(points_first)
                    async_to_sync(layer.group_send)(
                        "db_algo_room",
                        {
                            "type": "algo_status",
                            "message": "Clockwise path around no-fly zone was shortest, taking that path"
                        }
                    )
                else:
                    drone.longitude = drone_loc2.x
                    drone.latitude = drone_loc2.y
                    points_visited.append(points_second)
                    async_to_sync(layer.group_send)(
                        "db_algo_room",
                        {
                            "type": "algo_status",
                            "message": "Counter-clockwise path around no-fly zone was shortest, taking that path"
                        }
                    )
            
                # recalculate the distance and angle at which to travel at after no fly traversal
                dist, angle = calculateDistAngle(drone.longitude, drone.latitude, event_longitude, event_latitude)

        serializer = PointSerializer(points_visited, many=True)
        async_to_sync(layer.group_send)(
            "db_algo_room",
            {
                "type": "algo_status",
                "message": f"Event traveled to with {len(points_visited)} points visited along the way for a distance of {len(points_visited) * default_move} degrees traveled."                }
        )
        drone.save()
        return Response({
            "map_id": map_instance.id,
            "points_visited": serializer.data            
        })
        
class IdentifyRegion(APIView):
    def post(self, request):
        map_id = request.data.get('map_id', None)
        if map_id is None:
            return Response({"error": "map_id is required"})
        try:
            map_instance = Map.objects.get(id=map_id)
        except Map.DoesNotExist:
            return Response({"error": "map_id does not exist"})
        
        num_drones = request.data.get('num_drones', 4)  # 2^num_drones
        partition_type = request.data.get('partition_type', 1)
        event_long = request.data.get('event_long', 50)
        event_lat = request.data.get('event_lat', 50)

        partitions = Partition.objects.filter(map=map_instance, type=partition_type, num_drones=2**num_drones)
        if not partitions.exists():
            return Response({"error": f"Partition type {partition_type} does not exist."})
        
        pzones = []
        ids = []
        for partition in partitions:
            points = Point.objects.filter(partitions=partition)
            coordinates =[[point.longitude, point.latitude] for point in points]
            pzones.append({
                "type": "Polygon",
                "coordinates": [coordinates]
            })
            ids.append(partition.id)
        
        event = ShapelyPoint(event_long, event_lat)
        partitions = [shape(part) for part in pzones]
        drone = None
        for counter, partition in enumerate(partitions):
            if partition.contains(event):
                drone_zone = Partition.objects.get(id = ids[counter])
                drone = drone_zone.drone
                break
        if drone is None:
            return Response({"error": "event is not within any given partitions"})
        return Response({
            "map_id": map_id,
            "drone_number": drone.number
        })

########## HELPER FUNCTIONS ##########

def generateJSON(map_instance):
    region = {
        "type": "Polygon",
        "coordinates": [
            [
                [0.0, 0.0],
                [100, 0.0],
                [100, 100],
                [0.0, 100],
                [0.0, 0.0]
            ]
        ]
    }

    obstacles = []
    no_fly_zones = NoFly.objects.filter(map=map_instance)
    if not no_fly_zones.exists():
        return Response({"error": "no fly zones have not been generated for this map"})
    for zone in no_fly_zones:
        points = Point.objects.filter(nofly=zone)
        coordinates = [[((point.longitude - map_instance.center_longitude + map_instance.width / 2) * (100 / map_instance.width)), ((point.latitude - map_instance.center_latitude + map_instance.length / 2) * (100 / map_instance.length))] for point in points]
        obstacles.append({
            "type": "Polygon",
            "coordinates": [coordinates]
        })

    json_data = {
        "region": region,
        "obstacles": obstacles
    }

    return json_data


def ProcessGeoJson(file_path, center_lat, center_long, length, width):
    with open(file_path) as f:
        data = json.load(f)

    map_instance = Map.objects.create(
        center_latitude = center_lat,
        center_longitude = center_long,
        length = length,
        width = width
    )

    for feature in data['features']:
        coordinates = feature['geometry']['coordinates']
        if feature['geometry']['type'] == 'MultiPolygon':
            no_fly_zone = NoFly.objects.create(map=map_instance)
            for polygon in coordinates:
                for ring in polygon:
                    for point in ring:
                        Point.objects.create(
                            latitude=point[1],
                            longitude=point[0],
                            nofly=no_fly_zone,
                            partitions=None
                        )
        else:
            no_fly_zone = NoFly.objects.create(map=map_instance)
            for ring in coordinates:
                for point in ring:
                    Point.objects.create(
                        latitude=point[1],
                        longitude=point[0],
                        nofly=no_fly_zone,
                        partitions=None
                    )

def computePartitions(csvfile, map_instance, partition_type, obstacles, layer, num_drones):
    partitions = []
    with open(csvfile, 'r') as file:
        csvreader = csv.DictReader(file)

        for row in csvreader:
            if row['partition_number'] != "Overall" and row['num_obstacles'] != "N/A":
                partition = Partition.objects.create(
                    map=map_instance, 
                    number=(len(partitions) + 1), 
                    type=partition_type, 
                    num_drones=2**num_drones,
                    drone=None
                )
                async_to_sync(layer.group_send)(
                    "db_algo_room",
                    {
                        "type": "algo_status",
                        "message": f"Partition {partition.id} created for map {map_instance.id}"
                    }
                )      
                points = row['partition_boundary'].replace('POLYGON ((','').replace('))', '').split(', ')
                floor = left = 1000000
                ceiling = right = -1000000
                for point in points:
                    longitude, latitude = map(float, point.split())
                    Point.objects.create(
                        latitude=((latitude * map_instance.length / 100) + map_instance.center_latitude - (map_instance.length / 2)),
                        longitude=((longitude * map_instance.width / 100) + map_instance.center_longitude - (map_instance.width / 2)),
                        nofly=None,
                        partitions=partition
                    )
                    if longitude < left: left = longitude
                    if longitude > right: right = longitude
                    if latitude < floor: floor = latitude
                    if latitude > ceiling: ceiling = latitude

                drone = createDrone(ceiling, floor, right, left, obstacles, partition.number, map_instance)
                async_to_sync(layer.group_send)(
                    "db_algo_room",
                    {
                        "type": "algo_status",
                        "message": f"Drone {drone.number} generated for partition {partition.id}"
                    }
                )
                partition.drone = drone
                partition.save()
                partitions.append(partition)
    
    return partitions

def createDrone(ceiling, floor, right, left, obstacles, num, map_instance):
    step = 0.05 # Might need to modify but for now leave as 0.25 for speed
    x = left
    while x <= right:
        y = floor
        while y <= ceiling:
            potential_start = ShapelyPoint(x, y)
            if not any(obstacle.contains(potential_start) for obstacle in obstacles):
                return Drone.objects.create(
                    number = num,
                    latitude = ((y * map_instance.length / 100) + map_instance.center_latitude - (map_instance.length / 2)),
                    longitude = ((x * map_instance.width / 100) + map_instance.center_longitude - (map_instance.width / 2)),
                    isMoving=False,
                    map=map_instance
                )
            y += step
        x += step
    return None

# Finds distance and angle of travel
def calculateDistAngle(d_long, d_lat, e_long, e_lat):
    long_travel = e_long - d_long
    lat_travel = e_lat - d_lat
    dist = (long_travel ** 2 + lat_travel ** 2) ** (1/2)
    angle = math.atan2(lat_travel, long_travel)
    return dist, angle