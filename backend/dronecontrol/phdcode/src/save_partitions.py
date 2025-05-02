import csv
import datetime
import json
import logging
import os
import statistics  # For calculating variance, mean, and standard deviation

from phdcode.src.strip_perimeter import Strip

def save_final_results(partitions, datatype, numerical_method,
                       user_metric, depth, output_dir=f"temp/obstacle_aware", runtime=None):
    """
    Saves final partition details + axis sequence to a CSV
    and optionally a text file that forms a "tree".
    """

    # Create directories if they don't exist
    output_dir = f"{output_dir}/"

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"Created directory: {output_dir}")

    # 1) Build file name from specs + current date
    # Build base filename using current date
    now_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    base_filename = f"{datatype}_{numerical_method}_{user_metric}_depth{depth}_{now_str}"

    csv_filename = f"{output_dir}/{base_filename}.csv"

    # Directory-independent summary file
    os.makedirs("temp/final/AR/obstacle-aware/", exist_ok=True)

    # Ensure the structure for this percentage exist

    # 2) Define CSV columns (reordered to move complex data last)
    columns = [
        "datatype",
        "numerical_method",
        "user_metric",
        "partition_number",
        "num_obstacles",
        "WCRT",
        "aspect_ratio",
        "sequence_of_chosen_axes",
        "min-wcrt",
        "max-wcrt",
        "variance",
        "standard_deviation",  # New column for standard deviation
        "range",               # New column for range
        "runtime",
        "partition_boundary",
        "obstacles_in_partition"
    ]

    # Collect WCRT and aspect ratio values for calculating global stats
    wcrt_values = []
    aspect_ratios = []

    # 3) Write CSV
    with open(csv_filename, mode='w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=columns)
        writer.writeheader()

        for i, (subreg, subobs, axis_seq, valid) in enumerate(partitions, start=1):
            # WCRT
            strip_mgr = Strip(subreg, subobs)
            wcrt_val = strip_mgr.calculate_region_wcrt()
            wcrt_values.append(wcrt_val)  # Collect WCRT for stats

            # aspect ratio (as squareness measure)
            aspect_ratio_val = compute_aspect_ratio(subreg)
            aspect_ratios.append(aspect_ratio_val)

            # region boundary => e.g. bounding box or WKT
            partition_boundary_str = subreg.wkt  # or str(subreg.bounds)

            # obstacles => either count or partial detail
            obstacles_str = ";".join([f"{o.bounds}" for o in subobs])

            row = {
                "datatype": datatype,
                "numerical_method": numerical_method,
                "user_metric": user_metric,
                "partition_number": i,
                "num_obstacles": len(subobs),
                "WCRT": round(wcrt_val, 2),
                "aspect_ratio": round(aspect_ratio_val, 3),
                "sequence_of_chosen_axes": "->".join(axis_seq),
                "min-wcrt": "",  # Placeholder, will update later
                "max-wcrt": "",
                "variance": "",
                "standard_deviation": "",
                "range": "",
                "runtime": "",
                "partition_boundary": partition_boundary_str,
                "obstacles_in_partition": obstacles_str
            }
            writer.writerow(row)

    # Calculate global stats
    min_wcrt = min(wcrt_values)
    max_wcrt = max(wcrt_values)
    range_wcrt = max_wcrt - min_wcrt
    average_wcrt = sum(wcrt_values) / len(wcrt_values) if wcrt_values else 0
    variance_wcrt = sum((w - average_wcrt) ** 2 for w in wcrt_values) / len(wcrt_values) if wcrt_values else 0
    std_dev_wcrt = variance_wcrt**0.5  # Standard deviation

    average_aspect_ratio = statistics.mean(aspect_ratios) if aspect_ratios else 0

    # Append global stats to the file
    with open(csv_filename, mode='a', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=columns)
        writer.writerow({
            "datatype": datatype,
            "numerical_method": numerical_method,
            "user_metric": user_metric,
            "partition_number": "Overall",
            "num_obstacles": "N/A",
            "WCRT": round(average_wcrt, 2),  # Add average WCRT
            "aspect_ratio": round(average_aspect_ratio, 3),  # Add average aspect ratio
            "sequence_of_chosen_axes": "N/A",
            "min-wcrt": round(min_wcrt, 2),
            "max-wcrt": round(max_wcrt, 2),
            "variance": round(variance_wcrt, 3),
            "standard_deviation": round(std_dev_wcrt, 3),  # Add standard deviation
            "range": round(range_wcrt, 2),  # Add range
            "runtime":runtime,
            "partition_boundary": "N/A",
            "obstacles_in_partition": "N/A"
        })

    print(f"[save_final_results] CSV saved to {csv_filename}")

    return csv_filename

def compute_aspect_ratio(geometry, eps=1e-9):
    """
    Compute squareness as the minimum of w/h and h/w.
    """
    minx, miny, maxx, maxy = geometry.bounds
    w = maxx - minx
    h = maxy - miny
    if abs(w) < eps or abs(h) < eps:
        return 1.0  # Degenerate shapes are treated as perfectly square
    return min(w / h, h / w)


def save_partition_visualization(partitions, filename, show_obstacles=True, show_wcrt=True):
    """
    Visualizes final partitions using matplotlib and saves the figure to a file.

    Parameters:
        partitions : list
            List of partitions, each containing subregion, subobstacles, axis sequence, validity.
        filename : str
            Path where the visualization image will be saved.
        show_obstacles : bool, optional
            Whether to draw obstacles within each partition.
        show_wcrt : bool, optional
            Whether to display WCRT values on each partition.
    """
    import matplotlib.pyplot as plt
    from shapely.plotting import plot_polygon
    import random

    fig, ax = plt.subplots(figsize=(8, 6))
    colors = []

    # Generate random colors for partitions
    for _ in range(len(partitions)):
        c = (random.random(), random.random(), random.random())
        colors.append(c)

    for i, (subregion, subobs, ax_seq, validity) in enumerate(partitions):
        color = colors[i]
        # Draw subregion
        plot_polygon(subregion, ax=ax, add_points=False,
                     facecolor=color, alpha=0.4, edgecolor='black')

        label_txt = f"Partition {i + 1}"
        # Calculate and display WCRT if required
        if show_wcrt:
            from src.strip_perimeter import Strip  # Ensure Strip is imported
            strip_mgr = Strip(subregion, subobs)
            wcrt_val = strip_mgr.calculate_region_wcrt()
            label_txt += f"\nWCRT={wcrt_val:.2f}"

        # Place text label at the centroid of the subregion
        cx, cy = subregion.centroid.x, subregion.centroid.y
        ax.text(cx, cy, label_txt, ha='center', va='center',
                fontsize=8, color='black')

        # Draw obstacles if required
        if show_obstacles:
            for ob in subobs:
                plot_polygon(ob, ax=ax, facecolor='none', edgecolor='red')

    ax.set_title("Final Partitions")
    ax.set_aspect('equal', 'box')
    plt.tight_layout()
    plt.savefig(filename)  # Save the figure to the given filename
    plt.close(fig)  # Close the figure to free memory

