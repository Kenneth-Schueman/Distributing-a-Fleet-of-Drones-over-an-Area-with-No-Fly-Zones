import argparse
import logging
import json
import time
from shapely.geometry import shape
from phdcode.src.hierarchical_decomposition_algorithm import HierarchicalDecomposition
from phdcode.src.preprocessing import RegionWithObstacles
from phdcode.src.save_partitions import save_final_results

logging.basicConfig(level=logging.INFO)


def nokdrun(region, obstacles, max_depth, numerical_method, dataset=None, percentage=None, **kwargs):
    """
    Main function to run hierarchical decomposition.
    """
    try:
        if isinstance(region, str) and isinstance(obstacles, str):
            logging.info("Reading region + obstacles from files...")
            with open(region, "r") as f:
                region_data = json.load(f)
            region_geom = shape(region_data["region"])

            with open(obstacles, "r") as f:
                obstacles_data = json.load(f)
            obstacles_list = [shape(ob) for ob in obstacles_data]
        else:
            region_geom = region
            obstacles_list = obstacles

        region_with_obstacles = RegionWithObstacles(region_geom, obstacles_list)
        region_final = region_with_obstacles.region
        obstacles_final = region_with_obstacles.get_simplified_obstacles()

        chosen_metric = kwargs.get("metric", "NWCRT")

        start_time = time.perf_counter()
        decomposition = HierarchicalDecomposition(
            region_final,
            obstacles_final,
            max_depth=max_depth,
            metrics=chosen_metric,
            numerical_method=numerical_method,
            min_dimension_threshold=1e-3,
            check_connectivity=False,
            allow_fallback_axis=True,
            mode="track_back"
        )
        partitions = decomposition.run()
        end_time = time.perf_counter()
        runtime = end_time - start_time

        dataset_tag = f"{dataset}_{percentage}percent" if percentage is not None else dataset
        csvpath = save_final_results(
            partitions=partitions,
            datatype=dataset_tag,
            numerical_method=numerical_method,
            user_metric=chosen_metric,
            depth=max_depth,
            # output_dir=f"temp/{dataset_tag}/depth_{max_depth}",
            output_dir=f"temp/obstacle_aware/{dataset_tag}/depth_{max_depth}",
            runtime=runtime
        )
    except Exception as e:
        logging.error(f"An error occurred: {e}")
        raise

    return csvpath

