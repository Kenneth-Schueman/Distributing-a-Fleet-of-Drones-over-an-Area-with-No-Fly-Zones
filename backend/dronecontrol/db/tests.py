from django.test import TestCase
from .models import Point, NoFly, Drone, Partition, Map
from .serializer import NoFlySerializer
from rest_framework.test import APIClient
from django.test import Client
from django.contrib.auth.models import User
from rest_framework import status
from django.urls import reverse
from rest_framework.test import APITestCase
from unittest.mock import patch, MagicMock, AsyncMock
from .views import generateJSON, calculateDistAngle, computePartitions
from shapely.geometry import Point as ShapelyPoint
from tempfile import NamedTemporaryFile
from django.db import IntegrityError, transaction
import math
import tempfile
import json
import shutil
import os

# Testing models
# Unit tests that validate the creation, attributes, and string representations of individual models.
# These tests ensure that the models are functioning as expected and that their relationships are correctly established.
class ModelsTestCase(TestCase):
    def setUp(self):
        self.map = Map.objects.create(center_latitude=10.0, center_longitude=20.0, length=100.0, width=200.0)
        self.nofly = NoFly.objects.create(map=self.map)
        self.drone = Drone.objects.create(number=1, isMoving=True, map=self.map)
        self.partition = Partition.objects.create(drone=self.drone, map=self.map)
        self.point = Point.objects.create(latitude=15.0, longitude=25.0, nofly=self.nofly, partitions=self.partition)

    def test_point_creation(self):
        self.assertEqual(self.point.latitude, 15.0)
        self.assertEqual(self.point.longitude, 25.0)
        self.assertEqual(self.point.nofly, self.nofly)
        self.assertEqual(self.point.partitions, self.partition)

    def test_nofly_creation(self):
        self.assertEqual(self.nofly.map, self.map)

    def test_drone_creation(self):
        self.assertEqual(self.drone.number, 1)
        self.assertTrue(self.drone.isMoving)
        self.assertEqual(self.drone.map, self.map)

    def test_partition_creation(self):
        self.assertEqual(self.partition.drone, self.drone)
        self.assertEqual(self.partition.map, self.map)

    def test_map_creation(self):
        self.assertEqual(self.map.center_latitude, 10.0)
        self.assertEqual(self.map.center_longitude, 20.0)
        self.assertEqual(self.map.length, 100.0)
        self.assertEqual(self.map.width, 200.0)

    def test_point_str(self):
        self.assertEqual(str(self.point), "(15.0, 25.0)")

    def test_nofly_str(self):
        self.assertEqual(str(self.nofly), "{}".format(self.nofly.points))

    def test_drone_str(self):
        self.assertEqual(str(self.drone), "({}, {})".format(self.drone.id, self.drone.isMoving))

    def test_map_str(self):
        self.assertEqual(str(self.map), "(10.0, 20.0, 100.0, 200.0)")
        
        
# The ModelsRegressionTests test class is designed to catch regressions and ensure that critical edge cases in the data models remain functional as the application evolves. 
# These tests focus on verifying model behaviors, defaults, constraints, and relationships — especially areas where bugs could be introduced unintentionally during future development.
# The tests are structured to cover various scenarios, including the creation of points without associated no-fly zones or partitions, the behavior of drones and partitions, and the integrity of map relations.

class ModelsRegressionTests(TestCase):
    def setUp(self):
        self.map = Map.objects.create(center_latitude=10.0, center_longitude=20.0, length=100.0, width=200.0)
        self.nofly = NoFly.objects.create(map=self.map)
        self.drone = Drone.objects.create(number=1, isMoving=True, map=self.map)
        self.partition = Partition.objects.create(drone=self.drone, map=self.map)
        self.point = Point.objects.create(latitude=15.0, longitude=25.0, nofly=self.nofly, partitions=self.partition)

    def test_point_without_nofly_or_partition(self):
        point = Point.objects.create(latitude=30.0, longitude=40.0)
        self.assertEqual(point.latitude, 30.0)
        self.assertEqual(point.longitude, 40.0)
        self.assertIsNone(point.nofly)
        self.assertIsNone(point.partitions)
        
    
    def test_nofly_with_multiple_points(self):
        point2 = Point.objects.create(latitude=16.0, longitude=26.0, nofly=self.nofly, partitions=self.partition)
        self.assertEqual(self.nofly.points.count(), 2)

    def test_drone_default_fields(self):
        drone = Drone.objects.create(number=2, map=self.map)
        self.assertEqual(drone.latitude, 0.0)
        self.assertEqual(drone.longitude, 0.0)
        self.assertFalse(drone.isMoving)

    def test_partition_drone_uniqueness(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Partition.objects.create(drone=self.drone, map=self.map)

    def test_empty_map_relations(self):
        empty_map = Map.objects.create(center_latitude=5.0, center_longitude=5.0)
        self.assertEqual(empty_map.drones.count(), 0)
        self.assertEqual(empty_map.partitions.count(), 0)
        
# This tests the integration between several models (Map, Drone, Partition, NoFly, Point) to ensure that their relationships and cascading effects are functioning as expected in a real-world, interconnected environment.
# The tests cover the creation of maps, drones, partitions, and no-fly zones, as well as the relationships between them.
# They also check the behavior of the models when a map is deleted, ensuring that related objects are also removed as expected.

class IntegrationModelTests(TestCase):
    def setUp(self):
        self.map = Map.objects.create(center_latitude=10, center_longitude=20, length=100, width=200)
        self.drone = Drone.objects.create(number=1, latitude=11, longitude=21, isMoving=True, map=self.map)
        self.partition = Partition.objects.create(drone=self.drone, number=1, type='0', map=self.map)
        self.nofly = NoFly.objects.create(map=self.map)
        self.point1 = Point.objects.create(latitude=5.0, longitude=6.0, nofly=self.nofly)
        self.point2 = Point.objects.create(latitude=7.0, longitude=8.0, partitions=self.partition)

    def test_drone_map_relationship(self):
        self.assertEqual(self.drone.map, self.map)
        self.assertIn(self.drone, self.map.drones.all())

    def test_partition_drone_link(self):
        self.assertEqual(self.partition.drone, self.drone)
        self.assertEqual(self.drone.partitions, self.partition)

    def test_point_belongs_to_nofly_zone(self):
        self.assertEqual(self.point1.nofly, self.nofly)
        self.assertIn(self.point1, self.nofly.points.all())

    def test_point_belongs_to_partition(self):
        self.assertEqual(self.point2.partitions, self.partition)
        self.assertIn(self.point2, self.partition.points.all())

    def test_map_partition_relationship(self):
        self.assertIn(self.partition, self.map.partitions.all())

    def test_delete_map_cascades(self):
        map_id = self.map.id
        self.map.delete()
        self.assertFalse(Map.objects.filter(id=map_id).exists())
        self.assertFalse(Drone.objects.exists())
        self.assertFalse(Partition.objects.exists())
        self.assertFalse(NoFly.objects.exists())
        self.assertFalse(Point.objects.exists())

class BulkCreationTests(TestCase):
    def test_bulk_map_and_partition_creation(self):
        map1 = Map.objects.create(center_latitude=0, center_longitude=0, length=50, width=50)
        drones = [Drone(number=i, latitude=i+0.1, longitude=i+0.2, isMoving=False, map=map1) for i in range(3)]
        Drone.objects.bulk_create(drones)

        for drone in Drone.objects.all():
            Partition.objects.create(drone=drone, number=drone.number, type='0', map=map1)

        self.assertEqual(Drone.objects.count(), 3)
        self.assertEqual(Partition.objects.count(), 3)
        self.assertEqual(map1.drones.count(), 3)
        self.assertEqual(map1.partitions.count(), 3)

# Unit tests that validate the creation, attributes, and string representations of individual models.
# These tests help ensure that the Map model behaves correctly in different scenarios and that basic functionality (like creation, updating, deletion, and string representation) is working as expected.
# These tests are essential for maintaining the integrity of the Map model and ensuring that it interacts correctly with other models in the application.

class MapModelTests(TestCase):
    def test_map_creation_with_default_values(self):
        """Test that a map is created with default values."""
        map_instance = Map.objects.create()

        # Check the default values
        self.assertEqual(map_instance.center_latitude, 0.0)
        self.assertEqual(map_instance.center_longitude, 0.0)
        self.assertEqual(map_instance.length, 0.0)
        self.assertEqual(map_instance.width, 0.0)

    def test_map_creation_with_custom_values(self):
        """Test that a map is created with custom values."""
        map_instance = Map.objects.create(
            center_latitude=40.712,
            center_longitude=-74.006,
            length=100.0,
            width=50.0
        )

        # Check the custom values
        self.assertEqual(map_instance.center_latitude, 40.712)
        self.assertEqual(map_instance.center_longitude, -74.006)
        self.assertEqual(map_instance.length, 100.0)
        self.assertEqual(map_instance.width, 50.0)

    def test_map_string_representation(self):
        """Test the string representation of a map instance."""
        map_instance = Map.objects.create(
            center_latitude=40.712,
            center_longitude=-74.006,
            length=100.0,
            width=50.0
        )

        expected_str = "(40.712, -74.006, 100.0, 50.0)"
        self.assertEqual(str(map_instance), expected_str)

    def test_map_update_values(self):
        """Test that the values of a map instance can be updated."""
        map_instance = Map.objects.create(
            center_latitude=40.7128,
            center_longitude=-74.0060,
            length=100.0,
            width=50.0
        )

        # Update the values
        map_instance.center_latitude = 34.0522
        map_instance.center_longitude = -118.2437
        map_instance.length = 200.0
        map_instance.width = 100.0
        map_instance.save()

        # Check the updated values
        map_instance.refresh_from_db()  # Refresh the instance from the database
        self.assertEqual(map_instance.center_latitude, 34.0522)
        self.assertEqual(map_instance.center_longitude, -118.2437)
        self.assertEqual(map_instance.length, 200.0)
        self.assertEqual(map_instance.width, 100.0)

    def test_map_delete(self):
        """Test that a map instance can be deleted."""
        map_instance = Map.objects.create(
            center_latitude=40.7128,
            center_longitude=-74.0060,
            length=100.0,
            width=50.0
        )
        map_instance_id = map_instance.id

        # Delete the map instance
        map_instance.delete()

        # Ensure the map instance no longer exists
        with self.assertRaises(Map.DoesNotExist):
            Map.objects.get(id=map_instance_id)
            


class NoFlyDataViewTests(TestCase):
    """Test suite for the NoFlyData API view."""

    def setUp(self):
        """Set up test data and client."""
        self.client = APIClient()
        self.url = reverse('no fly data on map')  # URL name from your urls.py
        
        # Create test maps
        self.map = Map.objects.create(
            center_latitude=37.7749,
            center_longitude=-122.4194,
            length=1000.0,
            width=800.0,
        )
        
        # Create test no-fly zones
        self.no_fly_zone1 = NoFly.objects.create(
            map=self.map,
            # Note: Add points field if needed based on your __str__ method
        )
        
        self.no_fly_zone2 = NoFly.objects.create(
            map=self.map,
            # Note: Add points field if needed
        )
        
        # Create a map with no no-fly zones
        self.empty_map = Map.objects.create(
            center_latitude=34.0522,
            center_longitude=-118.2437,
            length=800.0,
            width=600.0,
        )

    def test_successful_request(self):
        """Test successful retrieval of no-fly zone data."""
        response = self.client.post(self.url, {'map_id': self.map.id})
        
        # Check status code and response structure
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('no_fly_zones', response.data)
        
        # Check that we got the right number of no-fly zones
        self.assertEqual(len(response.data['no_fly_zones']), 2)
        
        # Verify response data matches the serialized data
        no_fly_zones = NoFly.objects.filter(map=self.map)
        serializer = NoFlySerializer(no_fly_zones, many=True)
        self.assertEqual(response.data['no_fly_zones'], serializer.data)

    def test_missing_map_id(self):
        """Test request with missing map_id."""
        response = self.client.post(self.url, {})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)  # API returns 200 with error message
        self.assertIn('error', response.data)
        self.assertEqual(response.data['error'], "map_id is required")

    def test_nonexistent_map_id(self):
        """Test request with map_id that doesn't exist."""
        non_existent_id = 9999  # Assuming this ID doesn't exist
        response = self.client.post(self.url, {'map_id': non_existent_id})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)  # API returns 200 with error message
        self.assertIn('error', response.data)
        self.assertEqual(response.data['error'], "map_id does not exist")

    def test_map_with_no_no_fly_zones(self):
        """Test request for a map that has no no-fly zones."""
        response = self.client.post(self.url, {'map_id': self.empty_map.id})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)  # API returns 200 with error message
        self.assertIn('error', response.data)
        self.assertEqual(response.data['error'], "No-fly zones have not been generated for this map")
        
# These tests ensure that the NoFlyData API view works correctly by verifying how it handles successful requests, missing parameters, invalid IDs, and scenarios where no no-fly zones exist for a map. 
# They cover important edge cases and check the correctness of the API's responses.
# The tests also ensure that the API returns the expected data structure and content when valid requests are made.
# Both Unit tests and integration tests are included to validate the functionality of the NoFlyData API view.

class MapNoFliesViewTests(TestCase):
    """Test suite for the MapNoFlies API view."""

    def setUp(self):
        """Set up test data and client."""
        self.client = APIClient()
        self.url = reverse('map data no partitions')  # URL name from your urls.py
        
        # Create test maps
        self.map = Map.objects.create(
            center_latitude=37.7749,
            center_longitude=-122.4194,
            length=1000.0,
            width=800.0,
        )
        
        # Create test no-fly zones
        self.no_fly_zone1 = NoFly.objects.create(
            map=self.map,
            # Note: Add points field if needed
        )
        
        self.no_fly_zone2 = NoFly.objects.create(
            map=self.map,
            # Note: Add points field if needed
        )
        
        # Create a map with no no-fly zones
        self.empty_map = Map.objects.create(
            center_latitude=34.0522,
            center_longitude=-118.2437,
            length=800.0,
            width=600.0,
        )

    def test_successful_request(self):
        """Test successful retrieval of map and no-fly zone data."""
        response = self.client.post(self.url, {'map_id': self.map.id})
        
        # Check status code and response structure
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify all map properties are present
        self.assertEqual(response.data['map_id'], self.map.id)
        self.assertEqual(response.data['map_length'], self.map.length)
        self.assertEqual(response.data['map_width'], self.map.width)
        self.assertEqual(response.data['map_center_lat'], self.map.center_latitude)
        self.assertEqual(response.data['map_center_long'], self.map.center_longitude)
        
        # Check that no-fly zones are present and correct
        self.assertIn('no_fly_zones', response.data)
        self.assertEqual(len(response.data['no_fly_zones']), 2)
        
        # Verify response data matches the serialized data
        no_fly_zones = NoFly.objects.filter(map=self.map)
        serializer = NoFlySerializer(no_fly_zones, many=True)
        self.assertEqual(response.data['no_fly_zones'], serializer.data)

    def test_missing_map_id(self):
        """Test request with missing map_id."""
        response = self.client.post(self.url, {})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)  # API returns 200 with error message
        self.assertIn('error', response.data)
        self.assertEqual(response.data['error'], "map_id is required")

    def test_nonexistent_map_id(self):
        """Test request with map_id that doesn't exist."""
        non_existent_id = 9999  # Assuming this ID doesn't exist
        response = self.client.post(self.url, {'map_id': non_existent_id})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)  # API returns 200 with error message
        self.assertIn('error', response.data)
        self.assertEqual(response.data['error'], "map_id does not exist")

    def test_map_with_no_no_fly_zones(self):
        """Test request for a map that has no no-fly zones."""
        response = self.client.post(self.url, {'map_id': self.empty_map.id})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)  # API returns 200 with error message
        self.assertIn('error', response.data)
        self.assertEqual(response.data['error'], "No-fly zones were not generated for this map")

# This test ensures that the MapNoFlies API view works correctly by verifying how it handles successful requests, missing parameters, invalid IDs, and scenarios where no no-fly zones exist for a map.
# They cover important edge cases and check the correctness of the API's responses.
# This Unit test suite is designed to validate the functionality of the MapNoFlies API view, ensuring that it correctly handles various scenarios and returns the expected data structure and content.

class NoFlySerializerTests(TestCase):
    """Test the serializer used by both views."""
    
    def setUp(self):
        """Set up test data."""
        self.map = Map.objects.create(
            center_latitude=37.7749,
            center_longitude=-122.4194,
            length=1000.0,
            width=800.0,
        )
        
        self.no_fly_zone = NoFly.objects.create(
            map=self.map,
            # Note: Add points field if needed
        )
    
    def test_serializer_contains_expected_fields(self):
        """Test that the serializer includes the expected fields."""
        serializer = NoFlySerializer(instance=self.no_fly_zone)
        
        # Since we don't know the exact fields in your serializer,
        # this is a basic check to make sure it contains the map reference
        self.assertIn('map', serializer.data)
    

# The PartitionModelTests class tests the creation and relationships of Map, NoFly, and Point models.
# It ensures that the models are created correctly and that their attributes are set as expected.
# The tests are unit tests because they focus on verifying individual model behavior in isolation.

class PartitionModelTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.map = Map.objects.create(
            center_latitude=41.962,
            center_longitude=-93.385,
            length=100,
            width=100
        )
        self.no_fly_zone = NoFly.objects.create(map=self.map)
        self.point = Point.objects.create(
            latitude=41.963,
            longitude=-93.386,
            nofly=self.no_fly_zone,
            partitions=None
        )
    
    def test_map_creation(self):
        self.assertEqual(Map.objects.count(), 1)
        self.assertEqual(self.map.center_latitude, 41.962)
        self.assertEqual(self.map.center_longitude, -93.385)
    
    def test_no_fly_zone_creation(self):
        self.assertEqual(NoFly.objects.count(), 1)
        self.assertEqual(self.no_fly_zone.map, self.map)
    
    def test_point_creation(self):
        self.assertEqual(Point.objects.count(), 1)
        self.assertEqual(self.point.nofly, self.no_fly_zone)
        self.assertIsNone(self.point.partitions)


# The PartitionWithDroneTests class is a set of unit tests designed to validate the behavior of models that represent drones and partitions in a system. 
# Specifically, these tests focus on ensuring that Drone and Partition objects are created and associated correctly with each other and with a Map.
# The tests also check the behavior of the Partition model when it is created with or without an associated drone, and they verify that the drone's moving status is correctly updated.

class PartitionWithDroneTests(TestCase):
    def setUp(self):
        # Setting up necessary data for the tests
        self.map = Map.objects.create(
            center_latitude=41.962,
            center_longitude=-93.385,
            length=100,
            width=100
        )
        
        # Create a drone object
        self.drone = Drone.objects.create(
            number=1,
            latitude=41.963,
            longitude=-93.386,
            isMoving=False,
            map=self.map
        )
        
        # Create a partition associated with the drone
        self.partition = Partition.objects.create(
            drone=self.drone,
            number=2,
            type='1',
            map=self.map
        )

    def test_partition_with_drone(self):
        # Validate the fields based on the actual Drone model
        self.assertEqual(self.partition.drone.id, self.drone.id)  # Check the drone ID
        self.assertEqual(self.partition.type, '1')
        self.assertEqual(self.partition.drone.latitude, 41.963)
        self.assertEqual(self.partition.drone.longitude, -93.386)

    def test_partition_without_drone(self):
        # Create a partition without a drone
        partition_without_drone = Partition.objects.create(
            drone=None,
            number=3,
            type='2',
            map=self.map
        )
        
        # Validate the partition is correctly created without a drone
        self.assertIsNone(partition_without_drone.drone)
        self.assertEqual(partition_without_drone.number, 3)
        self.assertEqual(partition_without_drone.type, '2')

    def test_drone_belongs_to_map(self):
        # Check if the drone is correctly associated with the map
        self.assertEqual(self.drone.map.id, self.map.id)  # The drone should belong to the created map
        self.assertEqual(self.drone.map.center_latitude, 41.962)
        self.assertEqual(self.drone.map.center_longitude, -93.385)

    def test_map_can_have_multiple_drones(self):
        # Create a second drone on the same map
        drone2 = Drone.objects.create(
            number=2,
            latitude=42.000,
            longitude=-93.500,
            isMoving=True,
            map=self.map
        )

        # Ensure that the map has two drones associated with it
        self.assertEqual(self.map.drones.count(), 2)  # The map should have two drones now

    def test_drone_is_moving_status(self):
        # Test if the drone is correctly marked as moving
        self.drone.isMoving = True
        self.drone.save()

        # Reload the drone and check its moving status
        self.drone.refresh_from_db()
        self.assertTrue(self.drone.isMoving)  # The drone should now be marked as moving

    def test_drone_associated_with_correct_partition(self):
        # Create a new drone for the second partition
        drone2 = Drone.objects.create(
            number=2,
            latitude=42.000,
            longitude=-93.500,
            isMoving=True,
            map=self.map
        )

        # Create a new partition with the second drone
        partition2 = Partition.objects.create(
            drone=drone2,
            number=4,
            type='3',
            map=self.map
        )

        # Check that the partition is linked to the correct drone
        self.assertEqual(partition2.drone.id, drone2.id)
        self.assertEqual(partition2.type, '3')
        self.assertEqual(partition2.number, 4)
    

# This test sends a POST request to the load faa endpoint, which is expected to trigger the ProcessGeoJson function for each of 8 geojson files.
# It verifies that:
# The response status code is 200 (indicating success).
# The ProcessGeoJson function is called exactly 6 times.
# Each call to ProcessGeoJson contains the correct arguments, such as the file path and the geographic data (latitude, longitude, ceiling, and floor) for each geojson file.

class LoadFAATestCase(APITestCase):

    @patch('db.views.ProcessGeoJson')
    def test_load_faa_post(self, mock_process_geojson):
        """
        Test POST request to LoadFAA view calls ProcessGeoJson 8 times with expected arguments.
        """
        url = reverse('load faa')  
        response = self.client.post(url)

        self.assertEqual(response.status_code, 200)  # Or the actual expected status

        self.assertEqual(mock_process_geojson.call_count, 6)

        # Define expected calls
        base_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'datasets'))

        expected_calls = [
            ((os.path.join(base_path, 'FAA-IOWA.geojson'), 41.962, -93.385, 310, 240),),
            #((os.path.join(base_path, 'FAA-Recognized-Identification-Areas.geojson'), 38.7946, -106.5348, 1582, 2680),),
            #((os.path.join(base_path, 'FAA-UAS-Facility-Map-Data.geojson'), 38.7946, -106.5348, 1582, 2680),),
            ((os.path.join(base_path, 'IOWA-BOUNDARY.geojson'), 41.962, -93.385, 320, 250),),
            ((os.path.join(base_path, 'National-Security-UAS-Flight-Restrictions.geojson'), 38.7946, -106.5348, 1582, 2680),),
            ((os.path.join(base_path, 'Part-Time-National-Security-UAS-Flight-Restrictions.geojson'), 38.7946, -106.5348, 1582, 2680),),
            ((os.path.join(base_path, 'Prohibited-Areas.geojson'), 38.7946, -106.5348, 1582, 2680),),
            ((os.path.join(base_path, 'Recreational-Flyer-Fixed-Sites.geojson'), 38.7946, -106.5348, 1582, 2680),),
        ]

        for call_args in expected_calls:
            self.assertIn(call_args, mock_process_geojson.call_args_list)
    
# This test is designed to verify that:
# The API endpoint for loading FAA data (/load-faa/) processes multiple geojson files correctly.
# The ProcessGeoJson function is called the correct number of times, with the correct arguments, for each geojson file.
# The system returns a successful response (HTTP status 200) after processing the files.

class LoadFAASuccessTest(APITestCase):
    def setUp(self):
        self.url = reverse('load faa')

        # Create a temporary directory with a mock FAA JSON
        self.temp_dir = tempfile.mkdtemp()
        self.geojson_path = os.path.join(self.temp_dir, 'FAA_IOWA.geojson')
        with open(self.geojson_path, 'w') as f:
            json.dump({
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "geometry": {
                            "type": "Polygon",
                            "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
                        },
                        "properties": {
                            "zone": "Alpha",
                            "ceiling": 400,
                            "floor": 0
                        }
                    },
                    {
                        "type": "Feature",
                        "geometry": {
                            "type": "Polygon",
                            "coordinates": [[[2, 2], [3, 2], [3, 3], [2, 3], [2, 2]]]
                        },
                        "properties": {
                            "zone": "Bravo",
                            "ceiling": 600,
                            "floor": 100
                        }
                    }
                ]
            }, f)

    def tearDown(self):
        shutil.rmtree(self.temp_dir)

    @patch('db.views.ProcessGeoJson')  
    def test_successful_processing_multiple_zones(self, mock_process):
        mock_process.return_value = None  

        response = self.client.post(self.url)

        self.assertEqual(response.status_code, 200)

        base_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'datasets'))

        expected_calls = [
            ((os.path.join(base_path, 'FAA-IOWA.geojson'), 41.962, -93.385, 310, 240),),
           # ((os.path.join(base_path, 'FAA-Recognized-Identification-Areas.geojson'), 38.7946, -106.5348, 1582, 2680),),
           # ((os.path.join(base_path, 'FAA-UAS-Facility-Map-Data.geojson'), 38.7946, -106.5348, 1582, 2680),),
            ((os.path.join(base_path, 'IOWA-BOUNDARY.geojson'), 41.962, -93.385, 320, 250),),
            ((os.path.join(base_path, 'National-Security-UAS-Flight-Restrictions.geojson'), 38.7946, -106.5348, 1582, 2680),),
            ((os.path.join(base_path, 'Part-Time-National-Security-UAS-Flight-Restrictions.geojson'), 38.7946, -106.5348, 1582, 2680),),
            ((os.path.join(base_path, 'Prohibited-Areas.geojson'), 38.7946, -106.5348, 1582, 2680),),
            ((os.path.join(base_path, 'Recreational-Flyer-Fixed-Sites.geojson'), 38.7946, -106.5348, 1582, 2680),),
        ]

        self.assertEqual(mock_process.call_args_list, expected_calls)
        self.assertEqual(mock_process.call_count, 6)
        
        
# The CalculateDistAngleTests class contains a set of unit tests designed to verify the behavior of the calculateDistAngle function. 
# This function appears to calculate the distance and angle between two points in a 2D plane, given their coordinates.
# The tests cover various scenarios, including points that are the same, points that are aligned along the cardinal directions (north, south, east, west), and points that are diagonally aligned.

class CalculateDistAngleTests(TestCase):

    def test_zero_distance(self):
        dist, angle = calculateDistAngle(0, 0, 0, 0)
        self.assertEqual(dist, 0)
        self.assertEqual(angle, 0)

    def test_straight_east(self):
        dist, angle = calculateDistAngle(0, 0, 5, 0)
        self.assertAlmostEqual(dist, 5)
        self.assertAlmostEqual(angle, 0)

    def test_straight_north(self):
        dist, angle = calculateDistAngle(0, 0, 0, 5)
        self.assertAlmostEqual(dist, 5)
        self.assertAlmostEqual(angle, math.pi / 2)

    def test_straight_west(self):
        dist, angle = calculateDistAngle(5, 0, 0, 0)
        self.assertAlmostEqual(dist, 5)
        self.assertAlmostEqual(angle, math.pi)

    def test_straight_south(self):
        dist, angle = calculateDistAngle(0, 5, 0, 0)
        self.assertAlmostEqual(dist, 5)
        self.assertAlmostEqual(angle, -math.pi / 2)

    def test_diagonal_northeast(self):
        dist, angle = calculateDistAngle(0, 0, 1, 1)
        self.assertAlmostEqual(dist, math.sqrt(2))
        self.assertAlmostEqual(angle, math.pi / 4)

    def test_diagonal_southwest(self):
        dist, angle = calculateDistAngle(1, 1, 0, 0)
        self.assertAlmostEqual(dist, math.sqrt(2))
        self.assertAlmostEqual(angle, -3 * math.pi / 4)
        
