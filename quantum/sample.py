from __future__ import annotations

from typing import List

from optimizer import optimize_vrp
from vrp_data import build_sample_dataset, preprocess_to_features
from visualization import (
    save_counts_histograms,
    save_assignment_geoplot,
    save_summary_table,
    save_assignment_graph,
)
from quantum_layer import build_assignment_circuit_for_location
import pandas as pd


def _tuple_to_series(t):
    if hasattr(t, "_asdict"):
        d = t._asdict()
    else:
        fields = getattr(t, "_fields", [])
        d = {name: getattr(t, name) for name in fields}
    return pd.Series(d)


def main():
    raw = build_sample_dataset()

    # Show circuits per location (text diagrams)
    loc_df, vehicles, depots = preprocess_to_features(raw)
    num_trucks = len(vehicles)

    print("Quantum circuits per location (text diagram):\n")
    for row in loc_df.itertuples(index=False):
        lid = str(row.location_id)
        row_series = _tuple_to_series(row)
        circuit, _ = build_assignment_circuit_for_location(row_series, num_trucks=num_trucks, measure_key="assign")
        print(f"Circuit for {lid}:")
        print(circuit)
        print()

    # Run optimization to get assignments and summaries
    result = optimize_vrp(raw, shots=2000, include_counts=True)

    print("Optimization result (summary):")
    print({
        "assignments": result.get("assignments"),
        "per_vehicle_summary": result.get("per_vehicle_summary"),
        "unassigned": result.get("unassigned"),
    })

    # Save figures
    fig_paths: List[str] = []

    if "counts_by_location" in result:
        fig_paths += save_counts_histograms(result["counts_by_location"], output_dir="figures")

    fig_paths.append(save_assignment_geoplot(raw, result["assignments"], output_path="figures/assignment_map.png"))
    fig_paths.append(save_summary_table(result["per_vehicle_summary"], output_path="figures/summary_table.png"))
    fig_paths.append(save_assignment_graph(raw, result["assignments"], output_path="figures/assignment_graph.png"))

    print("Saved figures:")
    for p in fig_paths:
        print("  ", p)


if __name__ == "__main__":
    main()

