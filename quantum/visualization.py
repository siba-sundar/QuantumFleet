from __future__ import annotations

import os
from typing import Dict, List, Tuple

import matplotlib.pyplot as plt
import numpy as np
import networkx as nx

# Simple color palette
PALETTE = [
    "#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f",
    "#edc948", "#b07aa1", "#ff9da7", "#9c755f", "#bab0ab"
]


def ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def save_counts_histograms(counts_by_location: Dict[str, Dict[str, int]], output_dir: str = "figures", prefix: str = "counts_", dpi: int = 150) -> List[str]:
    """Save one bar chart per-location showing measurement counts per truck.

    Args:
        counts_by_location: mapping location_id -> {vehicle_id: count}
        output_dir: directory where images are saved
        prefix: filename prefix for images
        dpi: resolution

    Returns:
        List of file paths to the generated images.
    """
    ensure_dir(output_dir)
    file_paths: List[str] = []

    for idx, (lid, counts) in enumerate(counts_by_location.items()):
        vehicle_ids = list(counts.keys())
        ys = [counts[v] for v in vehicle_ids]
        xs = np.arange(len(vehicle_ids))

        fig, ax = plt.subplots(figsize=(8, 4))
        ax.bar(xs, ys, color="#4e79a7")
        ax.set_xticks(xs, vehicle_ids, rotation=45, ha="right")
        ax.set_title(f"Location {lid} measurement counts")
        ax.set_xlabel("Truck")
        ax.set_ylabel("Frequency")
        ax.grid(True, axis="y", linestyle=":", alpha=0.4)
        fig.tight_layout()

        path = os.path.join(output_dir, f"{prefix}{lid}.png")
        fig.savefig(path, dpi=dpi)
        plt.close(fig)
        file_paths.append(path)

    return file_paths


def save_assignment_geoplot(raw_data: Dict, assignments: Dict[str, List[str]], output_path: str = "figures/assignment_map.png", dpi: int = 150) -> str:
    """Save a simple geo-plot using lat/lon showing depots, locations, and lines per assignment.

    Args:
        raw_data: the same JSON you post to the API (must include depots and locations with lat/lon)
        assignments: mapping vehicle_id -> list of location_ids assigned
        output_path: where to save the PNG
        dpi: resolution for the figure

    Returns:
        File path of the saved image.
    """
    ensure_dir(os.path.dirname(output_path) or ".")

    depots = {d["id"]: (float(d["lat"]), float(d["lon"])) for d in raw_data.get("depots", [])}
    locs = {l["id"]: (float(l["lat"]), float(l["lon"])) for l in raw_data.get("locations", [])}

    vehicle_ids = list(assignments.keys())
    color_map = {vid: PALETTE[i % len(PALETTE)] for i, vid in enumerate(vehicle_ids)}

    # Prepare plot
    fig, ax = plt.subplots(figsize=(8, 8))

    # Plot depots
    for dep_id, (lat, lon) in depots.items():
        ax.scatter(lon, lat, marker="*", s=200, color="#333333", edgecolors="white", linewidths=0.7, zorder=3)
        ax.text(lon, lat, f"  {dep_id}", va="center", fontsize=9, color="#333333")

    # Plot locations
    for loc_id, (lat, lon) in locs.items():
        ax.scatter(lon, lat, marker="o", s=40, color="#aaaaaa", edgecolors="white", linewidths=0.5, zorder=2)
        ax.text(lon, lat, f" {loc_id}", fontsize=8, color="#666666")

    # Draw assignment lines from each vehicle's depot to its locations
    # Determine the depot for each vehicle from raw_data vehicles
    vehicle_to_depot: Dict[str, str] = {v["id"]: v.get("current_location") for v in raw_data.get("vehicles", [])}

    for vid, loc_ids in assignments.items():
        dep_id = vehicle_to_depot.get(vid)
        if not dep_id or dep_id not in depots:
            continue
        dep_lat, dep_lon = depots[dep_id]
        color = color_map[vid]

        for lid in loc_ids:
            if lid not in locs:
                continue
            lat, lon = locs[lid]
            ax.plot([dep_lon, lon], [dep_lat, lat], color=color, linewidth=2, alpha=0.9)

    # Legend
    handles = [plt.Line2D([0], [0], color=color_map[vid], lw=3) for vid in vehicle_ids]
    labels = vehicle_ids
    if handles:
        ax.legend(handles, labels, title="Vehicles", loc="lower right")

    # Axes labels and background
    ax.set_xlabel("Longitude")
    ax.set_ylabel("Latitude")
    ax.set_title("Assignments map: depots to locations per vehicle")
    ax.grid(True, linestyle=":", color="#dddddd")

    fig.tight_layout()
    fig.savefig(output_path, dpi=dpi)
    plt.close(fig)

    return output_path


def save_assignment_graph(raw_data: Dict, assignments: Dict[str, List[str]], output_path: str = "figures/assignment_graph.png", dpi: int = 150) -> str:
    """Save a layered graph showing connections: Depots -> Vehicles -> Locations.

    Nodes are arranged in three columns; edges:
      - depot -> vehicle (light gray)
      - vehicle -> assigned locations (colored by vehicle)
    """
    ensure_dir(os.path.dirname(output_path) or ".")

    depots = [d["id"] for d in raw_data.get("depots", [])]
    vehicles = [v["id"] for v in raw_data.get("vehicles", [])]
    locations = [l["id"] for l in raw_data.get("locations", [])]

    G = nx.DiGraph()
    # add nodes with layer attribute
    for d in depots:
        G.add_node(d, layer=0, kind="depot")
    for v in vehicles:
        G.add_node(v, layer=1, kind="vehicle")
    for l in locations:
        G.add_node(l, layer=2, kind="location")

    # light edges depot->vehicle based on vehicle.current_location if available
    veh_to_depot = {v["id"]: v.get("current_location") for v in raw_data.get("vehicles", [])}
    for v in vehicles:
        dep = veh_to_depot.get(v)
        if dep and dep in depots:
            G.add_edge(dep, v, kind="home")

    # vehicle -> location assignments
    for vid, locs in assignments.items():
        for lid in locs:
            if vid in vehicles and lid in locations:
                G.add_edge(vid, lid, kind="assignment")

    # manual layered layout
    def layered_positions(nodes: List[str], x: float) -> Dict[str, Tuple[float, float]]:
        n = max(1, len(nodes))
        ys = np.linspace(0, 1, n)
        return {node: (x, float(1 - y)) for node, y in zip(nodes, ys)}

    pos = {}
    pos.update(layered_positions(depots, x=0.0))
    pos.update(layered_positions(vehicles, x=0.5))
    pos.update(layered_positions(locations, x=1.0))

    fig, ax = plt.subplots(figsize=(10, 6))

    # draw nodes
    nx.draw_networkx_nodes(G, pos, nodelist=depots, node_shape="s", node_color="#666666", node_size=600, ax=ax, label="Depots")
    vehicle_colors = {v: PALETTE[i % len(PALETTE)] for i, v in enumerate(vehicles)}
    nx.draw_networkx_nodes(G, pos, nodelist=vehicles, node_shape="o", node_color=[vehicle_colors[v] for v in vehicles], node_size=500, ax=ax, label="Vehicles")
    nx.draw_networkx_nodes(G, pos, nodelist=locations, node_shape="o", node_color="#dddddd", node_size=400, ax=ax, label="Locations")

    # labels
    nx.draw_networkx_labels(G, pos, labels={n: n for n in G.nodes}, font_size=8, ax=ax)

    # edges
    home_edges = [(u, v) for u, v, d in G.edges(data=True) if d.get("kind") == "home"]
    assign_edges = [(u, v) for u, v, d in G.edges(data=True) if d.get("kind") == "assignment"]

    nx.draw_networkx_edges(G, pos, edgelist=home_edges, edge_color="#bbbbbb", width=1.5, ax=ax, arrows=True, arrowstyle="-|>")

    # color assignment edges by vehicle
    for v in vehicles:
        ve = [(u, w) for (u, w) in assign_edges if u == v]
        if not ve:
            continue
        nx.draw_networkx_edges(G, pos, edgelist=ve, edge_color=vehicle_colors[v], width=2.5, ax=ax, arrows=True, arrowstyle="-|>")

    ax.set_axis_off()
    ax.set_title("Assignments connections: Depot → Vehicle → Location")
    fig.tight_layout()
    fig.savefig(output_path, dpi=dpi)
    plt.close(fig)
    return output_path


def save_summary_table(per_vehicle_summary: Dict[str, Dict[str, float]], output_path: str = "figures/summary_table.png", dpi: int = 150) -> str:
    """Save a simple table image summarizing per-vehicle stats.

    Args:
        per_vehicle_summary: mapping vehicle_id -> {stops, total_demand, approx_distance_km}
        output_path: path to save the image
        dpi: resolution

    Returns:
        File path of the saved image.
    """
    ensure_dir(os.path.dirname(output_path) or ".")

    rows = []
    for vid, stats in per_vehicle_summary.items():
        rows.append([
            vid,
            int(stats.get("stops", 0)),
            float(stats.get("total_demand", 0.0)),
            float(stats.get("approx_distance_km", 0.0)),
        ])

    col_labels = ["Vehicle", "Stops", "Total Demand", "Approx Distance (km)"]

    fig, ax = plt.subplots(figsize=(8, 0.6 * max(3, len(rows) + 1)))
    ax.axis("off")
    table = ax.table(cellText=rows, colLabels=col_labels, cellLoc="center", loc="center")
    table.auto_set_font_size(False)
    table.set_fontsize(9)
    table.scale(1, 1.3)

    fig.tight_layout()
    fig.savefig(output_path, dpi=dpi)
    plt.close(fig)
    return output_path

