import argparse
import logging
import random
import time
import json
from shapely.geometry import shape

from phdcode.src.data_Loader import DataPreprocessor
from phdcode.src.kd_tree_naive_decomposition import NaiveKDTreePartitioning
from phdcode.src.kd_tree_perimeter_decomposition import KDTreePartitioning
from phdcode.src.preprocessing import RegionWithObstacles

logging.basicConfig(level=logging.INFO)


def kdrunhalf(region, obstacles, max_depth=1, data='synthetic_percent', method='newton', percentage=None):
    """
    Main function to perform recursive partitioning using KD-tree strategies.
    """
    try:
        # Preprocess and validate region and obstacles
        if isinstance(region, str) and isinstance(obstacles, str):
            logging.info("Reading region and obstacles from files...")
            data_loader = DataPreprocessor(region, obstacles)
            region, obstacle_coords_list = data_loader.preprocess()
        else:
            logging.info("Using provided region and obstacle geometries...")
            obstacle_coords_list = [list(ob.exterior.coords) for ob in obstacles]

        logging.info("Initializing RegionWithObstacles...")
        region_with_obstacles = RegionWithObstacles(region, obstacle_coords_list)

        region = region_with_obstacles.region
        obstacles = region_with_obstacles.get_simplified_obstacles()

        # Perform partitioning using KD-tree strategies
        # Half-Perimeter KD-tree
        start_time_kd = time.perf_counter()
        kd_tree = KDTreePartitioning(region, obstacles, max_depth=max_depth, advanced_checks=False)
        kd_tree.run()
        end_time_kd = time.perf_counter()
        runtime_kd = end_time_kd - start_time_kd
        csvfile = kd_tree.save_partitions(datatype=f"{data}_{percentage}percent" if percentage else data,
                                depth=max_depth, runtime=runtime_kd)
                                
    except Exception as e:
        logging.error(f"An error occurred: {e}")
        raise

    return csvfile

def kdrunnative(region, obstacles, max_depth=1, data='synthetic_percent', method='newton', percentage=None):
    """
    Main function to perform recursive partitioning using KD-tree strategies.
    """
    try:
        # Preprocess and validate region and obstacles
        if isinstance(region, str) and isinstance(obstacles, str):
            logging.info("Reading region and obstacles from files...")
            data_loader = DataPreprocessor(region, obstacles)
            region, obstacle_coords_list = data_loader.preprocess()
        else:
            logging.info("Using provided region and obstacle geometries...")
            obstacle_coords_list = [list(ob.exterior.coords) for ob in obstacles]

        logging.info("Initializing RegionWithObstacles...")
        region_with_obstacles = RegionWithObstacles(region, obstacle_coords_list)

        region = region_with_obstacles.region
        obstacles = region_with_obstacles.get_simplified_obstacles()

        # Naive KD-tree
        start_time_naive = time.perf_counter()
        naive_kd_tree = NaiveKDTreePartitioning(region, obstacles, max_depth=max_depth, advanced_checks=False)
        naive_kd_tree.run()
        end_time_naive = time.perf_counter()
        runtime_naive = end_time_naive - start_time_naive
        csvfile = naive_kd_tree.save_partitions(datatype=f"{data}_{percentage}percent" if percentage else data,
                                      depth=max_depth, runtime=runtime_naive)

    except Exception as e:
        logging.error(f"An error occurred: {e}")
        raise

    return csvfile
