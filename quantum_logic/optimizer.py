from __future__ import annotations

from typing import Any, Dict

import pandas as pd

from vrp_data import load_data, preprocess_to_features
from quantum_layer import build_assignment_circuit_for_location, simulate_counts, truck_index_order_from_counts
from constraints_layer import enforce_constraints, compute_depot_for_vehicle, estimate_total_distance_km


def optimize_vrp(raw: Dict, shots: int = 2000, include_counts: bool = True) -> Dict:
    """Return a structured JSON-friendly result for the VRP assignment."""
    data = load_data(data=raw)
    loc_df, vehicles, depots = preprocess_to_features(data)
    num_trucks = len(vehicles)
    vehicle_ids = list(vehicles.keys())

    counts_by_loc_id: Dict[str, Dict[str, int]] = {}
    ranking_by_loc_id: Dict[str, List[str]] = {}

    def tuple_to_series(t):
        if hasattr(t, "_asdict"):
            d = t._asdict()
        else:
            fields = getattr(t, "_fields", [])
            d = {name: getattr(t, name) for name in fields}
        return pd.Series(d)

    for row in loc_df.itertuples(index=False):
        lid = str(row.location_id)
        row_series = tuple_to_series(row)
        circuit, _ = build_assignment_circuit_for_location(row_series, num_trucks=num_trucks, measure_key="assign")
        counts_idx = simulate_counts(circuit, key="assign", num_trucks=num_trucks, shots=shots)
        if include_counts:
            counts_by_loc_id[lid] = {vehicle_ids[i]: int(c) for i, c in counts_idx.items() if i < num_trucks}
        order_idx = truck_index_order_from_counts(counts_idx, num_trucks)
        ranking_by_loc_id[lid] = [vehicle_ids[i] for i in order_idx]

    assignments: Dict[str, List[str]] = {vid: [] for vid in vehicle_ids}
    for lid, order_ids in ranking_by_loc_id.items():
        best_vid = order_ids[0] if order_ids else vehicle_ids[0]
        assignments[best_vid].append(lid)

    assignments, unassigned = enforce_constraints(assignments, ranking_by_loc_id, vehicles, depots, loc_df, data.get("constraints", {}))

    by_loc = {r.location_id: r for r in loc_df.itertuples(index=False)}
    per_vehicle_summary: Dict[str, Dict[str, float]] = {}
    for vid, locs in assignments.items():
        total_demand = sum(float(by_loc[lid].demand) for lid in locs)
        per_vehicle_summary[vid] = {
            "stops": int(len(locs)),
            "total_demand": float(total_demand),
            "approx_distance_km": 0.0,  # filled below
        }

    # compute distances one time accurately
    distance_map = estimate_total_distance_km(assignments, vehicles, depots, loc_df)
    for vid in per_vehicle_summary:
        per_vehicle_summary[vid]["approx_distance_km"] = float(round(distance_map.get(vid, 0.0), 4))

    result: Dict[str, Any] = {
        "meta": {"num_trucks": num_trucks, "num_locations": int(len(loc_df))},
        "assignments": assignments,
        "per_vehicle_summary": per_vehicle_summary,
        "unassigned": unassigned,
    }
    if include_counts:
        result["counts_by_location"] = counts_by_loc_id
    return result

