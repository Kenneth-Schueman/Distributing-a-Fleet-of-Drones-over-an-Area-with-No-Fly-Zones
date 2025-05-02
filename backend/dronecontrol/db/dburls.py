from django.urls import path
from . import views

urlpatterns = [
    path("generate_synthetic_noflies/", views.GenerateMapSyntheticNoFlies.as_view(), name="generate_synthetic_noflies"),
    path("generate_synthetic_noflies_clustering/", views.GenerateMapClusterNoFlies.as_view(), name="generate_synthetic_noflies_clustering"),
    path("find_map_details/", views.MapData.as_view(), name="map data"),
    path("map_details_no_partitions/", views.MapNoFlies.as_view(), name="map data no partitions"),
    path("no_flies_on_map/", views.NoFlyData.as_view(), name="no fly data on map"),
    path("partitions_of_map/", views.PartitionData.as_view(), name="view all partitions of map"),
    path("partition_no_kd/", views.PartitionNoKD.as_view(), name="partitions without kd tree generation"),
    path("partition_kd_half/", views.PartitionWKDHalf.as_view(), name="partitioning with kd half perimeter"),
    path("partition_kd_native/", views.PartitionWKDNative.as_view(), name="partitioning with kd natively"),
    path("respond_to_event/", views.RespondToEvent.as_view(), name="event response"),
    path("get_drone_number/", views.IdentifyRegion.as_view(), name="drone determiner"),
    path("load_faa/", views.LoadFAA.as_view(), name="load faa"),
    path("user_drawn_no_fly/", views.UserDrawnNoFlyZones.as_view(), name="user drawn no fly")
]
