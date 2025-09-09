import math
import requests
from typing import List, Dict, Tuple
import os

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
DISTANCE_MATRIX_URL = "https://maps.googleapis.com/maps/api/distancematrix/json"

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points on the Earth in kilometers."""
    R = 6371.0  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def get_distance_matrix(origins: List[Dict], destinations: List[Dict]) -> Tuple[List[List[float]], List[List[float]]]:
    """Fetch driving distance (km) and duration (hours) matrices."""
    try:
        if GOOGLE_API_KEY == "YOUR_GOOGLE_API_KEY":
            raise ValueError("Google API Key not configured")
            
        # Try Google API first
        origin_str = "|".join([f"{o['lat']},{o['lon']}" for o in origins])
        dest_str = "|".join([f"{d['lat']},{d['lon']}" for d in destinations])
        params = {
            "origins": origin_str,
            "destinations": dest_str,
            "key": GOOGLE_API_KEY,
            "mode": "driving",
            "units": "metric"
        }
        resp = requests.get(DISTANCE_MATRIX_URL, params=params)
        resp.raise_for_status()
        res = resp.json()
        
        distance_matrix = []
        duration_matrix = []
        for row in res['rows']:
            dist_row = []
            dur_row = []
            for elem in row['elements']:
                if elem['status'] == 'OK':
                    dist_row.append(elem['distance']['value'] / 1000)  # km
                    dur_row.append(elem['duration']['value'] / 3600)  # hours
                else:
                    dist_row.append(float('inf'))
                    dur_row.append(float('inf'))
            distance_matrix.append(dist_row)
            duration_matrix.append(dur_row)
            
            
        
        return distance_matrix, duration_matrix
        
    except Exception as e:
        print(f"Warning: Using Haversine distances instead of Google API: {e}")
        # Fallback to Haversine
        distance_matrix = []
        duration_matrix = []
        for origin in origins:
            dist_row = []
            dur_row = []
            for dest in destinations:
                d_km = haversine_km(
                    float(origin['lat']), float(origin['lon']),
                    float(dest['lat']), float(dest['lon'])
                )
                dist_row.append(d_km)
                # Estimate duration assuming 30km/h average speed
                dur_row.append(d_km / 30.0)
            distance_matrix.append(dist_row)
            duration_matrix.append(dur_row)
            
        
            
        return distance_matrix, duration_matrix

def bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Compute bearing from point1 to point2 in degrees."""
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dLon = lon2 - lon1
    x = math.sin(dLon) * math.cos(lat2)
    y = math.cos(lat1)*math.sin(lat2) - math.sin(lat1)*math.cos(lat2)*math.cos(dLon)
    return (math.degrees(math.atan2(x, y)) + 360) % 360

def compute_corridors(depot: Dict, locations: List[Dict], tolerance: float = 20) -> List[List[str]]:
    """
    Cluster nearby locations into corridors based on bearing from depot.
    Locations with similar bearing (+/- tolerance degrees) go into same corridor.
    """
    corridors = []
    unassigned = locations.copy()
    while unassigned:
        loc = unassigned.pop(0)
        b = bearing(depot['lat'], depot['lon'], loc['lat'], loc['lon'])
        corridor = [loc['id']]
        remaining = []
        for other in unassigned:
            other_b = bearing(depot['lat'], depot['lon'], other['lat'], other['lon'])
            if abs((b - other_b + 180) % 360 - 180) <= tolerance:
                corridor.append(other['id'])
            else:
                remaining.append(other)
        corridors.append(corridor)
        unassigned = remaining
    return corridors



def cluster_locations(locations: List[Dict], max_cluster_size: int = 8) -> List[List[Dict]]:
    """Pre-cluster locations to keep quantum circuits manageable"""
    from sklearn.cluster import KMeans
    
    if len(locations) <= max_cluster_size:
        return [locations]
        
    # Extract coordinates
    coords = np.array([[loc['lat'], loc['lon']] for loc in locations])
    
    # Determine optimal number of clusters
    n_clusters = max(2, len(locations) // max_cluster_size)
    kmeans = KMeans(n_clusters=n_clusters)
    labels = kmeans.fit_predict(coords)
    
    # Group locations by cluster
    clusters = [[] for _ in range(n_clusters)]
    for loc, label in zip(locations, labels):
        clusters[label].append(loc)
        
    return clusters