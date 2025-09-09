from __future__ import annotations

from typing import Dict, List, Tuple

import pandas as pd

from vrp_data import Vehicle, Depot, haversine_km


def compute_depot_for_vehicle(veh: Vehicle, depots: Dict[str, Depot]) -> Depot:
    if veh.current_location not in depots:
        return list(depots.values())[0]
    return depots[veh.current_location]


def estimate_total_distance_km(
    assignments: Dict[str, List[str]],
    vehicles: Dict[str, Vehicle],
    depots: Dict[str, Depot],
    loc_df: pd.DataFrame,
) -> Dict[str, float]:
    by_loc = {r.location_id: r for r in loc_df.itertuples(index=False)}
    total: Dict[str, float] = {}
    for vid, locs in assignments.items():
        dep = compute_depot_for_vehicle(vehicles[vid], depots)
        s = 0.0
        for lid in locs:
            r = by_loc[lid]
            s += haversine_km(dep.lat, dep.lon, float(r.lat), float(r.lon))
        total[vid] = s
    return total


def enforce_constraints(
    assignments: Dict[str, List[str]],
    ranking_by_loc: Dict[str, List[str]],
    vehicles: Dict[str, Vehicle],
    depots: Dict[str, Depot],
    loc_df: pd.DataFrame,
    constraints: Dict,
) -> Tuple[Dict[str, List[str]], List[str]]:
    import time
    start_time = time.time()
    TIMEOUT_SECONDS = 5  # Maximum time to spend in constraint enforcement

    max_stops = int(constraints.get("max_stops_per_vehicle", 1_000_000))
    max_dist = float(constraints.get("max_distance_per_vehicle", 1e12))
    max_time = float(constraints.get("max_time_per_vehicle", 1e12))  # hours
    priority_handling = bool(constraints.get("priority_handling", True))

    veh_caps = {vid: vehicles[vid].capacity for vid in vehicles}
    veh_types = {vid: vehicles[vid].type for vid in vehicles}
    allowed_types = set(constraints.get("allowed_vehicle_types", ["small", "medium", "large"]))
    allowed_vehicles = [vid for vid in vehicles if veh_types[vid] in allowed_types]

    demand_by_loc = {r.location_id: float(r.demand) for r in loc_df.itertuples(index=False)}
    prio_by_loc = {r.location_id: int(r.priority) for r in loc_df.itertuples(index=False)}

    for vid in list(assignments.keys()):
        if vid not in allowed_vehicles:
            for lid in assignments[vid]:
                choices = [v for v in ranking_by_loc[lid] if v in allowed_vehicles]
                if not choices:
                    continue
                target = choices[0]
                assignments.setdefault(target, []).append(lid)
            assignments[vid] = []

    for vid in allowed_vehicles:
        locs = assignments.get(vid, [])
        if not locs:
            continue
        if priority_handling:
            locs.sort(key=lambda lid: prio_by_loc[lid])
        if len(locs) > max_stops:
            overflow = locs[max_stops:]
            assignments[vid] = locs[:max_stops]
            for lid in overflow:
                for alt in ranking_by_loc[lid]:
                    if alt == vid:
                        continue
                    if alt not in allowed_vehicles:
                        continue
                    assignments.setdefault(alt, []).append(lid)
                    break

    changed = True
    while changed and (time.time() - start_time) < TIMEOUT_SECONDS:
        changed = False
        for vid in allowed_vehicles:
            locs = assignments.get(vid, [])
            cap = veh_caps[vid]
            total_demand = sum(demand_by_loc[lid] for lid in locs)
            if total_demand <= cap + 1e-6:
                continue
            locs_sorted = sorted(locs, key=lambda lid: (prio_by_loc[lid], -demand_by_loc[lid]), reverse=True)
            for lid in locs_sorted:
                locs.remove(lid)
                for alt in ranking_by_loc[lid]:
                    if alt == vid or alt not in allowed_vehicles:
                        continue
                    assignments.setdefault(alt, []).append(lid)
                    break
            assignments[vid] = locs
            changed = True

    AVG_SPEED_KMPH = 30.0
    change_loop = True
    while change_loop and (time.time() - start_time) < TIMEOUT_SECONDS:
        change_loop = False
        total_dist = estimate_total_distance_km(assignments, vehicles, depots, loc_df)
        for vid in allowed_vehicles:
            dist = total_dist.get(vid, 0.0)
            time_est = dist / AVG_SPEED_KMPH
            if dist <= max_dist + 1e-6 and time_est <= max_time + 1e-6:
                continue
            locs = assignments.get(vid, [])
            if not locs:
                continue
            locs_sorted = sorted(locs, key=lambda lid: prio_by_loc[lid], reverse=True)
            removed_any = False
            for lid in locs_sorted:
                if lid not in locs:
                    continue
                locs.remove(lid)
                for alt in ranking_by_loc[lid]:
                    if alt == vid or alt not in allowed_vehicles:
                        continue
                    assignments.setdefault(alt, []).append(lid)
                    break
                removed_any = True
                total_dist = estimate_total_distance_km(assignments, vehicles, depots, loc_df)
                dist = total_dist.get(vid, 0.0)
                time_est = dist / AVG_SPEED_KMPH
                if dist <= max_dist + 1e-6 and time_est <= max_time + 1e-6:
                    break
            assignments[vid] = locs
            if removed_any:
                change_loop = True

    # If we hit timeout, ensure we return valid assignments
    if (time.time() - start_time) >= TIMEOUT_SECONDS:
        print("Warning: Constraint enforcement timed out after 30 seconds")

    assigned_set = {lid for locs in assignments.values() for lid in locs}
    all_locs = set(loc_df["location_id"].tolist())
    unassigned = sorted(list(all_locs - assigned_set))

    return assignments, unassigned

