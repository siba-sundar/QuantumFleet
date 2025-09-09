from __future__ import annotations

from typing import Any, Dict, Optional, List
import numpy as np
import pandas as pd
import logging

# Import your existing modules
from vrp_data import load_data, preprocess_to_features
from constraints_layer import enforce_constraints, compute_depot_for_vehicle, estimate_total_distance_km
from vrp_data import haversine_km
from vrp_utils import cluster_locations, get_distance_matrix
from qaoa_assign import run_qaoa_assignment, run_qaoa_assignment_batch

logger = logging.getLogger(__name__)


def compute_enhanced_costs(location_data: pd.Series, vehicles: Dict, depots: Dict, current_assignments: Dict[str, List[str]] = None) -> np.ndarray:
    """
    Compute enhanced cost function that considers multiple factors to prevent
    all locations being assigned to the same vehicle.
    """
    vehicle_ids = list(vehicles.keys())
    costs = np.zeros(len(vehicle_ids))
    
    # Track current load distribution if assignments are provided
    if current_assignments is None:
        current_assignments = {vid: [] for vid in vehicle_ids}
    
    for i, vid in enumerate(vehicle_ids):
        vehicle = vehicles[vid]
        depot = depots.get(vehicle.current_location, list(depots.values())[0])
        
        # Base distance cost
        distance = haversine_km(
            float(location_data["lat"]), float(location_data["lon"]),
            depot.lat, depot.lon
        )
        
        # Vehicle capacity factor (prefer vehicles with more capacity for high-demand locations)
        capacity_factor = vehicle.capacity / 1500.0  # Normalize to typical max capacity
        demand_factor = float(location_data["demand"]) / 500.0  # Normalize to typical max demand
        
        # Current load factor - heavily penalize overloaded vehicles
        current_load = sum(100 for _ in current_assignments.get(vid, []))  # Simplified load calculation
        load_factor = (current_load + float(location_data["demand"])) / vehicle.capacity
        capacity_penalty = 0 if load_factor <= 1.0 else (load_factor - 1.0) * 10  # Heavy penalty for overload
        
        # Priority matching (high priority locations prefer faster vehicles)
        # Handle both scaled and unscaled priority
        if "priority_scaled" in location_data:
            priority_weight = float(location_data["priority_scaled"])
        else:
            # Scale priority manually (lower priority number = higher priority)
            raw_priority = float(location_data.get("priority", 2))
            priority_weight = 1.0 - (raw_priority - 1.0) / 2.0  # Assuming priority range 1-3
        vehicle_speed_factor = 1.0 if vehicle.type == "large" else (0.8 if vehicle.type == "medium" else 0.6)
        priority_mismatch = abs(priority_weight - vehicle_speed_factor)
        
        # Load balancing factor - prefer less loaded vehicles
        current_stops = len(current_assignments.get(vid, []))
        max_stops = max(len(locs) for locs in current_assignments.values()) if current_assignments else 0
        load_imbalance = current_stops / max(1, max_stops + 1)  # Normalize current load
        
        # Distance variation to encourage different depot usage
        base_distance_penalty = distance / 50.0  # Normalize distance
        
        # Combined cost with stronger differentiation
        costs[i] = (
            base_distance_penalty * 0.3 +  # Distance factor
            abs(capacity_factor - demand_factor) * 0.2 +  # Capacity-demand matching
            priority_mismatch * 0.1 +  # Priority matching
            load_imbalance * 0.3 +  # Load balancing - encourage even distribution
            capacity_penalty * 0.1 +  # Capacity constraint penalty
            (i * 0.02)  # Small vehicle index diversity
        )
    
    return costs


def optimize_vrp(raw: Dict, shots: int = 2000, include_counts: bool = True, method: str = "qaoa",
                 qaoa_penalty: float = 3.0, qaoa_p: int = 2, qaoa_grid_vals: Optional[List[float]] = None,
                 backend=None, save_circuit: bool = False) -> Dict:
    """
    Return a structured JSON-friendly result for the VRP assignment using QAOA.
    
    Args:
        raw: Input data dictionary
        shots: Number of shots for quantum sampling
        include_counts: Whether to include measurement counts in output
        method: Only "qaoa" is supported (PQC removed)
        qaoa_penalty: QAOA penalty parameter for one-hot constraint
        qaoa_p: Number of QAOA layers
        qaoa_grid_vals: Parameter values for QAOA grid search
        backend: IBM Quantum backend for QAOA method
    
    Returns:
        Dictionary with VRP optimization results
    """
    try:
        if method != "qaoa":
            raise ValueError("Only QAOA method is supported. PQC has been removed.")
            
        if backend is None:
            raise ValueError("Backend is required for QAOA method")
            
        logger.info(f"Starting VRP optimization with QAOA: {len(raw.get('locations', []))} locations, {len(raw.get('vehicles', []))} vehicles")
        
        data = load_data(data=raw)
        loc_df, vehicles, depots = preprocess_to_features(data)
        num_trucks = len(vehicles)
        vehicle_ids = list(vehicles.keys())
        
        logger.info(f"Processed data: {len(loc_df)} locations, {num_trucks} vehicles")

        # Handle large location sets by clustering if necessary
        max_locations_per_cluster = 6 if len(loc_df) > 50 else 8  # Smaller clusters for very large problems
        
        if len(loc_df) > 10:  # More aggressive clustering
            logger.info(f"Large location set detected ({len(loc_df)} locations), applying clustering...")
            locations_for_clustering = []
            for _, row in loc_df.iterrows():
                locations_for_clustering.append({
                    'id': row.location_id,
                    'lat': row.lat,
                    'lon': row.lon,
                    'demand': row.demand,
                    'priority': row.priority
                })
            
            clusters = cluster_locations(locations_for_clustering, max_cluster_size=max_locations_per_cluster)
            logger.info(f"Created {len(clusters)} clusters (max {max_locations_per_cluster} locations per cluster)")
        else:
            clusters = [loc_df.to_dict('records')]

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

        # Process each cluster
        for cluster_idx, cluster in enumerate(clusters):
            logger.info(f"Processing cluster {cluster_idx + 1}/{len(clusters)} with {len(cluster)} locations")
            
            costs_list = []
            loc_ids = []
            
            # Process each location in the cluster
            for location in cluster:
                if isinstance(location, dict):
                    # Check if this is from clustering (has 'id') or from DataFrame records (has 'location_id')
                    if 'id' in location:
                        # From clustering
                        lid = str(location['id'])
                    else:
                        # From DataFrame.to_dict('records') - uses 'location_id'
                        lid = str(location['location_id'])
                    row_data = pd.Series(location)
                else:
                    # From itertuples
                    lid = str(location.location_id)
                    row_data = tuple_to_series(location)
                    
                loc_ids.append(lid)
                
                # Compute enhanced costs (no normalization to preserve differentiation)
                costs = compute_enhanced_costs(row_data, vehicles, depots)
                costs_list.append(costs)

            # Adaptive parameters based on cluster size
            cluster_size = len(cluster)
            fast_mode = cluster_size <= 4 or len(clusters) > 5  # Use fast mode for small clusters or many clusters
            
            if qaoa_grid_vals is not None:
                grid = [(g, b) for g in qaoa_grid_vals for b in qaoa_grid_vals]
            else:
                grid = None  # Let the QAOA function decide
                
            logger.info(f"Using adaptive QAOA parameters (fast_mode={fast_mode})")

            # Run batched QAOA for this cluster with optimizations
            # Save circuit only for the first cluster and first location
            save_circ = save_circuit and cluster_idx == 0
            
            if save_circ and len(costs_list) > 0:
                # Use single QAOA call for circuit saving
                first_result = run_qaoa_assignment(
                    costs=costs_list[0],
                    backend=backend,
                    shots=shots,
                    p=qaoa_p,
                    A=qaoa_penalty,
                    grid=grid,
                    fast_mode=fast_mode,
                    save_circuit=True
                )
                # Still run batch for the rest
                if len(costs_list) > 1:
                    batch_results_rest = run_qaoa_assignment_batch(
                        costs_list=costs_list[1:],
                        backend=backend,
                        shots=shots,
                        p=qaoa_p,
                        A=qaoa_penalty,
                        grid=grid,
                        fast_mode=fast_mode
                    )
                    batch_results = [first_result] + batch_results_rest
                else:
                    batch_results = [first_result]
            else:
                batch_results = run_qaoa_assignment_batch(
                    costs_list=costs_list,
                    backend=backend,
                    shots=shots,
                    p=qaoa_p,
                    A=qaoa_penalty,
                    grid=grid,
                    fast_mode=fast_mode
                )

            # Populate counts and ranking from batch results
            for lid, (counts_idx, best_pair) in zip(loc_ids, batch_results):
                if include_counts:
                    counts_by_loc_id[lid] = {vehicle_ids[i]: int(c) for i, c in counts_idx.items() if i < num_trucks}
                    
                if counts_idx and sum(counts_idx.values()) > 0:
                    # Sort by counts (highest first)
                    order_idx = sorted(range(num_trucks), key=lambda i: counts_idx.get(i, 0), reverse=True)
                else:
                    # Fallback: sort by cost (lowest first)
                    li = loc_ids.index(lid)
                    costs = costs_list[li]
                    order_idx = sorted(range(num_trucks), key=lambda i: costs[i])
                    
                ranking_by_loc_id[lid] = [vehicle_ids[i] for i in order_idx]
                logger.debug(f"Location {lid} ranking: {ranking_by_loc_id[lid][:3]}...")  # Show top 3

        logger.info("QAOA processing completed, applying constraints...")
        
        # Create initial assignments using balanced greedy: assign to best feasible vehicle considering capacity and current load
        assignments: Dict[str, List[str]] = {vid: [] for vid in vehicle_ids}
        by_loc = {r.location_id: r for r in loc_df.itertuples(index=False)}
        max_stops = int(data.get("constraints", {}).get("max_stops_per_vehicle", 9999))
        for lid, order_ids in ranking_by_loc_id.items():
            # Recompute costs considering current assignments to encourage distribution
            location_row = by_loc[lid]
            location_data = pd.Series({
                'lat': location_row.lat,
                'lon': location_row.lon,
                'demand': location_row.demand,
                'priority_scaled': location_row.priority_scaled
            })
            
            # Get current costs with assignment awareness
            current_costs = compute_enhanced_costs(location_data, vehicles, depots, assignments)
            
            # Rerank vehicles by current cost (lower is better)
            cost_ranking = sorted(enumerate(vehicle_ids), key=lambda x: current_costs[x[0]])
            
            chosen_vid = None
            for idx, vid in cost_ranking:
                # Check stops constraint
                if len(assignments[vid]) >= max_stops:
                    continue
                # Check capacity constraint
                current_demand = sum(float(by_loc[ll].demand) for ll in assignments[vid])
                if current_demand + float(by_loc[lid].demand) <= vehicles[vid].capacity + 1e-6:
                    chosen_vid = vid
                    break
            if chosen_vid is None:
                # Fallback to least loaded vehicle by stops
                chosen_vid = min(vehicle_ids, key=lambda v: len(assignments[v]))
            assignments[chosen_vid].append(lid)

        logger.info(f"Initial assignments: {[(vid, len(locs)) for vid, locs in assignments.items()]}")
        
        # Enforce constraints and handle capacity/distance violations
        assignments, unassigned = enforce_constraints(
            assignments, ranking_by_loc_id, vehicles, depots, loc_df, 
            data.get("constraints", {})
        )
        
        logger.info(f"Final assignments after constraints: {[(vid, len(locs)) for vid, locs in assignments.items()]}")
        if unassigned:
            logger.warning(f"Unassigned locations: {unassigned}")

        # Create lookup for location data
        by_loc = {r.location_id: r for r in loc_df.itertuples(index=False)}
        
        # Calculate per-vehicle summary statistics
        per_vehicle_summary: Dict[str, Dict[str, float]] = {}
        for vid, locs in assignments.items():
            total_demand = sum(float(by_loc[lid].demand) for lid in locs)
            per_vehicle_summary[vid] = {
                "stops": int(len(locs)),
                "total_demand": float(total_demand),
                "approx_distance_km": 0.0,  # will be filled below
            }

        # Compute distances accurately
        distance_map = estimate_total_distance_km(assignments, vehicles, depots, loc_df)
        for vid in per_vehicle_summary:
            per_vehicle_summary[vid]["approx_distance_km"] = float(round(distance_map.get(vid, 0.0), 4))

        # Build final result
        result: Dict[str, Any] = {
            "status": "success",
            "method": method,
            "meta": {
                "num_trucks": num_trucks, 
                "num_locations": int(len(loc_df)),
                "shots": shots,
                "qaoa_layers": qaoa_p,
                "qaoa_penalty": qaoa_penalty,
                "backend": backend.name if backend and hasattr(backend, 'name') else "simulator"
            },
            "assignments": assignments,
            "per_vehicle_summary": per_vehicle_summary,
            "unassigned": unassigned,
        }
        
        if include_counts:
            result["counts_by_location"] = counts_by_loc_id
            
        logger.info("VRP optimization completed successfully")
        return result
        
    except Exception as e:
        logger.error(f"VRP optimization failed: {str(e)}")
        # Return error information for debugging
        return {
            "status": "error",
            "message": str(e),
            "method": method,
            "meta": {
                "shots": shots,
                "backend": backend.name if backend and hasattr(backend, 'name') else "unknown"
            }
        }
