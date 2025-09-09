from __future__ import annotations
from typing import Any, Dict, Optional, List
import numpy as np
import pandas as pd
from concurrent.futures import ThreadPoolExecutor
import time

# Import your existing modules
from vrp_data import load_data, preprocess_to_features, haversine_km
from constraints_layer import enforce_constraints, compute_depot_for_vehicle, estimate_total_distance_km
from qaoa_assign import run_qaoa_assignment  

def _process_location_qaoa(args) -> Tuple[str, Dict[str, int], List[str]]:
    """Process a single location with QAOA - for parallel execution."""
    (lid, row_series, vehicle_ids, vehicles, depots, backend, 
     shots, qaoa_p, qaoa_penalty, include_counts) = args
    
    try:
        # Build costs efficiently
        costs = []
        for vid in vehicle_ids:
            veh = vehicles[vid]
            if veh.current_location in depots:
                dep = depots[veh.current_location]
            else:
                dep = list(depots.values())[0]
            
            dkm = haversine_km(
                float(row_series["lat"]), float(row_series["lon"]), 
                dep.lat, dep.lon
            )
            costs.append(dkm)
        
        costs = np.array(costs, dtype=float)
        
        # Normalize costs for stability
        cmin, cmax = float(costs.min()), float(costs.max())
        if cmax - cmin > 1e-9:
            costs_norm = (costs - cmin) / (cmax - cmin)
        else:
            costs_norm = np.zeros_like(costs)
        
        # Use smaller grid for speed
        if len(costs) <= 3:
            grid_vals = [0.3, 0.7]
        else:
            grid_vals = [0.5]  # Single point for larger problems
        grid = [(g, b) for g in grid_vals for b in grid_vals]
        
        # Run QAOA with reduced shots for speed
        adaptive_shots = min(shots, max(300, shots // 2))
        counts_idx, best_pair = run_qaoa_assignment(
            costs=costs_norm, 
            backend=backend,
            shots=adaptive_shots, 
            p=qaoa_p, 
            A=qaoa_penalty, 
            grid=grid
        )
        
        # Create ranking
        if counts_idx:
            order_idx = sorted(range(len(vehicle_ids)), 
                             key=lambda i: counts_idx.get(i, 0), reverse=True)
        else:
            order_idx = sorted(range(len(vehicle_ids)), key=lambda i: costs[i])
        
        ranking = [vehicle_ids[i] for i in order_idx]
        
        # Prepare counts for return
        counts_result = {}
        if include_counts and counts_idx:
            counts_result = {vehicle_ids[i]: int(c) for i, c in counts_idx.items() 
                           if i < len(vehicle_ids)}
        
        return lid, counts_result, ranking
        
    except Exception as e:
        print(f"Error processing location {lid}: {e}")
        # Fallback to distance-based ranking
        costs = []
        for vid in vehicle_ids:
            veh = vehicles[vid]
            dep = depots.get(veh.current_location, list(depots.values())[0])
            dkm = haversine_km(
                float(row_series["lat"]), float(row_series["lon"]), 
                dep.lat, dep.lon
            )
            costs.append(dkm)
        
        order_idx = sorted(range(len(vehicle_ids)), key=lambda i: costs[i])
        ranking = [vehicle_ids[i] for i in order_idx]
        return lid, {}, ranking

def optimize_vrp(raw: Dict, shots: int = 1000, include_counts: bool = True, method: str = "qaoa",
                 qaoa_penalty: float = 2.0, qaoa_p: int = 1, qaoa_grid_vals: Optional[List[float]] = None,
                 backend=None) -> Dict:
    """
    Optimized VRP optimization with parallel processing and smart defaults.
    """
    start_time = time.time()
    
    try:
        # Load and preprocess data
        data = load_data(data=raw)
        loc_df, vehicles, depots = preprocess_to_features(data)
        num_trucks = len(vehicles)
        vehicle_ids = list(vehicles.keys())

        print(f"\n=== OPTIMIZED VRP OPTIMIZATION ===")
        print(f"Method: {method}, Vehicles: {num_trucks}, Locations: {len(loc_df)}")

        # Adaptive parameters based on problem size
        if len(loc_df) > 20:
            adaptive_shots = min(shots, 800)  # Reduce shots for large problems
            max_workers = 3
            print(f"Large problem detected: reducing shots to {adaptive_shots}")
        elif len(loc_df) > 10:
            adaptive_shots = min(shots, 1000)
            max_workers = 2
        else:
            adaptive_shots = shots
            max_workers = 2

        counts_by_loc_id: Dict[str, Dict[str, int]] = {}
        ranking_by_loc_id: Dict[str, List[str]] = {}

        def tuple_to_series(t):
            """Convert namedtuple to pandas Series."""
            if hasattr(t, "_asdict"):
                d = t._asdict()
            else:
                fields = getattr(t, "_fields", [])
                d = {name: getattr(t, name) for name in fields}
            return pd.Series(d)

        if method == "qaoa" and backend is not None:
            print(f"Processing {len(loc_df)} locations in parallel...")
            
            # Prepare arguments for parallel processing
            args_list = []
            for _, row in enumerate(loc_df.itertuples(index=False)):
                lid = str(row.location_id)
                row_series = tuple_to_series(row)
                args = (lid, row_series, vehicle_ids, vehicles, depots, backend,
                       adaptive_shots, qaoa_p, qaoa_penalty, include_counts)
                args_list.append(args)
            
            # Process locations in parallel with timeout
            try:
                with ThreadPoolExecutor(max_workers=max_workers) as executor:
                    futures = [executor.submit(_process_location_qaoa, args) for args in args_list]
                    
                    for i, future in enumerate(futures):
                        try:
                            lid, counts_result, ranking = future.result(timeout=15)  # 15s timeout per location
                            
                            if include_counts and counts_result:
                                counts_by_loc_id[lid] = counts_result
                            ranking_by_loc_id[lid] = ranking
                            
                            if (i + 1) % 5 == 0:  # Progress update every 5 locations
                                print(f"Processed {i + 1}/{len(loc_df)} locations")
                                
                        except Exception as e:
                            print(f"Location processing timeout/error: {e}")
                            # Use distance-based fallback
                            lid = args_list[i][0]
                            row_series = args_list[i][1]
                            
                            costs = []
                            for vid in vehicle_ids:
                                veh = vehicles[vid]
                                dep = depots.get(veh.current_location, list(depots.values())[0])
                                dkm = haversine_km(
                                    float(row_series["lat"]), float(row_series["lon"]), 
                                    dep.lat, dep.lon
                                )
                                costs.append(dkm)
                            
                            order_idx = sorted(range(len(vehicle_ids)), key=lambda i: costs[i])
                            ranking_by_loc_id[lid] = [vehicle_ids[i] for i in order_idx]
                            
            except Exception as e:
                print(f"Parallel processing failed: {e}, falling back to sequential")
                # Sequential fallback with reduced parameters
                for i, row in enumerate(loc_df.itertuples(index=False)):
                    lid = str(row.location_id)
                    row_series = tuple_to_series(row)
                    
                    try:
                        args = (lid, row_series, vehicle_ids, vehicles, depots, backend,
                               adaptive_shots // 2, qaoa_p, qaoa_penalty, include_counts)
                        lid, counts_result, ranking = _process_location_qaoa(args)
                        
                        if include_counts and counts_result:
                            counts_by_loc_id[lid] = counts_result
                        ranking_by_loc_id[lid] = ranking
                        
                    except Exception as loc_error:
                        print(f"Failed to process location {lid}: {loc_error}")
                        # Ultimate fallback - distance-based ranking
                        costs = []
                        for vid in vehicle_ids:
                            veh = vehicles[vid]
                            dep = depots.get(veh.current_location, list(depots.values())[0])
                            dkm = haversine_km(
                                float(row_series["lat"]), float(row_series["lon"]), 
                                dep.lat, dep.lon
                            )
                            costs.append(dkm)
                        
                        order_idx = sorted(range(len(vehicle_ids)), key=lambda i: costs[i])
                        ranking_by_loc_id[lid] = [vehicle_ids[i] for i in order_idx]

        else:
            # Default PQC method or classical fallback
            print("Using classical/PQC method...")
            for i, row in enumerate(loc_df.itertuples(index=False)):
                lid = str(row.location_id)
                row_series = tuple_to_series(row)
                
                if method == "qaoa":
                    # Classical distance-based assignment when no backend
                    costs = []
                    for vid in vehicle_ids:
                        veh = vehicles[vid]
                        dep = depots.get(veh.current_location, list(depots.values())[0])
                        dkm = haversine_km(
                            float(row_series["lat"]), float(row_series["lon"]), 
                            dep.lat, dep.lon
                        )
                        costs.append(dkm)
                    
                    order_idx = sorted(range(len(vehicle_ids)), key=lambda i: costs[i])
                    ranking_by_loc_id[lid] = [vehicle_ids[i] for i in order_idx]
                    
                else:
                    # Original PQC method
                    circuit, _ = build_assignment_circuit_for_location(
                        row_series, num_trucks=num_trucks, measure_key="assign"
                    )
                    counts_idx = simulate_counts(
                        circuit, key="assign", num_trucks=num_trucks, shots=adaptive_shots
                    )
                    
                    if include_counts:
                        counts_by_loc_id[lid] = {
                            vehicle_ids[i]: int(c) for i, c in counts_idx.items() 
                            if i < num_trucks
                        }
                    
                    order_idx = truck_index_order_from_counts(counts_idx, num_trucks)
                    ranking_by_loc_id[lid] = [vehicle_ids[i] for i in order_idx]

        print(f"Location processing completed in {time.time() - start_time:.2f}s")

        # Constraint enforcement and result building (same as original)
        print("Creating initial assignments...")
        assignments: Dict[str, List[str]] = {vid: [] for vid in vehicle_ids}
        for lid, order_ids in ranking_by_loc_id.items():
            best_vid = order_ids[0] if order_ids else vehicle_ids[0]
            assignments[best_vid].append(lid)

        print("Enforcing constraints...")
        assignments, unassigned = enforce_constraints(
            assignments, ranking_by_loc_id, vehicles, depots, loc_df, 
            data.get("constraints", {})
        )

        # Build result summary efficiently
        by_loc = {r.location_id: r for r in loc_df.itertuples(index=False)}
        per_vehicle_summary: Dict[str, Dict[str, Any]] = {}
        
        for vid, locs in assignments.items():
            veh = vehicles[vid]
            depot = compute_depot_for_vehicle(veh, depots)
            total_demand = sum(float(by_loc[lid].demand) for lid in locs)
            
            per_vehicle_summary[vid] = {
                "vehicle_type": veh.type,
                "capacity": veh.capacity,
                "max_shift_hours": veh.max_shift_hours,
                "starting_depot": depot.id,
                "starting_location": {"lat": depot.lat, "lon": depot.lon},
                "stops": len(locs),
                "total_demand": total_demand,
                "capacity_utilization": total_demand / veh.capacity * 100,
                "approx_distance_km": 0.0,
                "assigned_locations": locs
            }

        # Compute distances
        distance_map = estimate_total_distance_km(assignments, vehicles, depots, loc_df)
        for vid in per_vehicle_summary:
            per_vehicle_summary[vid]["approx_distance_km"] = float(distance_map.get(vid, 0.0))

        # Build final result
        result: Dict[str, Any] = {
            "status": "success",
            "method": method,
            "meta": {
                "num_trucks": num_trucks, 
                "num_locations": len(loc_df),
                "shots": adaptive_shots,
                "backend": backend.name if backend and hasattr(backend, 'name') else "simulator",
                "total_locations_assigned": sum(len(locs) for locs in assignments.values()),
                "total_unassigned": len(unassigned),
                "processing_time": round(time.time() - start_time, 2)
            },
            "assignments": assignments,
            "per_vehicle_summary": per_vehicle_summary,
            "unassigned": unassigned,
            "optimization_summary": {
                "total_distance_km": sum(distance_map.values()),
                "average_capacity_utilization": np.mean([
                    v["capacity_utilization"] for v in per_vehicle_summary.values()
                ]) if per_vehicle_summary else 0.0,
                "vehicles_used": sum(1 for locs in assignments.values() if len(locs) > 0)
            }
        }
        
        if include_counts:
            result["counts_by_location"] = counts_by_loc_id

        print(f"VRP OPTIMIZATION COMPLETED in {result['meta']['processing_time']}s")
        print(f"Total distance: {result['optimization_summary']['total_distance_km']:.2f}km")
        print(f"Vehicles used: {result['optimization_summary']['vehicles_used']}/{num_trucks}")
            
        return result
        
    except Exception as e:
        error_result = {
            "status": "error",
            "message": str(e),
            "method": method,
            "meta": {
                "shots": shots,
                "backend": backend.name if backend and hasattr(backend, 'name') else "unknown",
                "processing_time": round(time.time() - start_time, 2)
            }
        }
        print(f"ERROR: {e}")
        return error_result