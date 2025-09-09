from __future__ import annotations

import json
import math
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd


@dataclass
class Vehicle:
    id: str
    capacity: float
    type: str
    max_shift_hours: float
    current_location: str  # depot id


@dataclass
class Depot:
    id: str
    lat: float
    lon: float


@dataclass
class Location:
    id: str
    lat: float
    lon: float
    demand: float
    priority: int  # lower = higher priority (1 highest)
    time_window: Tuple[float, float]


# -----------------------------
# Sample small dataset (3 trucks, 5 locations)
# -----------------------------

def build_sample_dataset() -> Dict:
    return {
        "num_vehicles": 3,
        "vehicles": [
            {"id": "truck_1", "capacity": 1000, "type": "small",  "max_shift_hours": 8,  "current_location": "depot_1"},
            {"id": "truck_2", "capacity": 1500, "type": "medium", "max_shift_hours": 10, "current_location": "depot_2"},
            {"id": "truck_3", "capacity": 1200, "type": "medium", "max_shift_hours": 9,  "current_location": "depot_1"},
        ],
        "depots": [
            {"id": "depot_1", "lat": 12.9716, "lon": 77.5946},
            {"id": "depot_2", "lat": 12.9350, "lon": 77.6100},
        ],
        "locations": [
            {"id": "loc_1", "lat": 12.9352, "lon": 77.6245, "demand": 300, "priority": 1, "time_window": [8, 12]},
            {"id": "loc_2", "lat": 12.9878, "lon": 77.5966, "demand": 200, "priority": 2, "time_window": [10, 15]},
            {"id": "loc_3", "lat": 12.9200, "lon": 77.6100, "demand": 400, "priority": 1, "time_window": [9, 14]},
            {"id": "loc_5", "lat": 12.9600, "lon": 77.6000, "demand": 500, "priority": 2, "time_window": [8, 11]},
            {"id": "loc_8", "lat": 12.9700, "lon": 77.6200, "demand": 300, "priority": 1, "time_window": [9, 13]},
        ],
        "constraints": {
            "max_stops_per_vehicle": 4,
            "max_distance_per_vehicle": 20.0,  # km (approximation)
            "max_time_per_vehicle": 10.0,      # hours (approximation)
            "priority_handling": True,
            "allowed_vehicle_types": ["small", "medium", "large"],
        }
    }


# -----------------------------
# Geographic / Feature utilities
# -----------------------------

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0  # Earth radius in km
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def minmax_scale(values: np.ndarray, eps: float = 1e-9) -> np.ndarray:
    vmin = float(np.min(values))
    vmax = float(np.max(values))
    if abs(vmax - vmin) < eps:
        return np.zeros_like(values, dtype=float)
    return (values - vmin) / (vmax - vmin)


# -----------------------------
# Input & Preprocessing
# -----------------------------

def load_data(data: Optional[Dict] = None, json_path: Optional[str] = None) -> Dict:
    if data is not None:
        return data
    if json_path:
        with open(json_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return build_sample_dataset()


def preprocess_to_features(raw: Dict) -> Tuple[pd.DataFrame, Dict[str, Vehicle], Dict[str, Depot]]:
    # Create vehicles with default values for missing fields
    vehicles = {}
    for v in raw["vehicles"]:
        vehicles[v["id"]] = Vehicle(
            id=v["id"], 
            capacity=float(v["capacity"]), 
            type=v.get("type", "medium"),  # Default to medium
            max_shift_hours=float(v.get("max_shift_hours", 8.0)),  # Default to 8 hours
            current_location=v["current_location"]
        )

    depots = {d["id"]: Depot(id=d["id"], lat=float(d["lat"]), lon=float(d["lon"])) for d in raw["depots"]}

    loc_rows = []
    for l in raw["locations"]:
        # Handle different possible field names for location ID
        loc_id = l.get("id") or l.get("location_id")
        if not loc_id:
            raise ValueError("Location must have 'id' or 'location_id' field")
            
        loc = Location(
            id=loc_id, 
            lat=float(l["lat"]), 
            lon=float(l["lon"]),
            demand=float(l.get("demand", 0)),  # Default to 0 demand
            priority=int(l.get("priority", 3)),  # Default to priority 3
            time_window=(
                float(l.get("time_window", [0, 24])[0]), 
                float(l.get("time_window", [0, 24])[1])
            )  # Default to 24-hour window
        )
        
        # distance to nearest depot
        nearest_depot_id, nearest_km = None, float("inf")
        for dep in depots.values():
            d_km = haversine_km(loc.lat, loc.lon, dep.lat, dep.lon)
            if d_km < nearest_km:
                nearest_km = d_km
                nearest_depot_id = dep.id

        tw_start, tw_end = loc.time_window
        tw_width = max(0.0, tw_end - tw_start)
        loc_rows.append({
            "location_id": loc.id,
            "lat": loc.lat,
            "lon": loc.lon,
            "demand": loc.demand,
            "priority": loc.priority,
            "tw_start": tw_start,
            "tw_end": tw_end,
            "tw_width": tw_width,
            "nearest_depot_id": nearest_depot_id,
            "distance_to_nearest_depot_km": nearest_km,
        })

    df = pd.DataFrame(loc_rows)

    # Scale features to [0,1]
    df["demand_scaled"] = minmax_scale(df["demand"].to_numpy())

    # Higher priority (1) -> higher scaled value. If all equal, set ones
    prio_raw = df["priority"].to_numpy(dtype=float)
    if len(np.unique(prio_raw)) > 1:
        prio_scaled = 1.0 - minmax_scale(prio_raw)
    else:
        prio_scaled = np.ones_like(prio_raw)
    df["priority_scaled"] = prio_scaled

    df["tw_width_scaled"] = minmax_scale(df["tw_width"].to_numpy())
    df["distance_scaled"] = minmax_scale(df["distance_to_nearest_depot_km"].to_numpy())

    return df, vehicles, depots