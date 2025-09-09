from __future__ import annotations
from typing import Any, Dict
import logging
import traceback

from fastapi import FastAPI, Body, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import os
from dotenv import load_dotenv
from qiskit_ibm_runtime import QiskitRuntimeService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables from .env
load_dotenv()
IBM_API_KEY = os.getenv("IBM_QUANTUM_API_KEY")

if not IBM_API_KEY:
    raise ValueError("IBM_QUANTUM_API_KEY not found in environment variables. Please set it in your .env file.")

# Initialize IBM Quantum service
try:
    service = QiskitRuntimeService(
        channel="ibm_quantum_platform", 
        token=IBM_API_KEY
    )
    
    # Get available backends and choose a simulator
    backends = service.backends(simulator=True, operational=True)
    if not backends:
        # Fallback to any available backend
        backends = service.backends(operational=True)
        if not backends:
            raise RuntimeError("No operational backends available")
    
    # Choose the first available simulator backend
    ibm_backend = backends[0]
    logger.info(f"Using backend: {ibm_backend.name}")
    
except Exception as e:
    logger.error(f"Failed to initialize IBM Quantum service: {e}")
    raise

# Import optimizer after backend initialization
try:
    from optimizer import optimize_vrp
except ImportError as e:
    logger.error(f"Failed to import optimizer: {e}")
    logger.error("Make sure optimizer.py exists and is properly implemented")
    
    # Create a dummy optimizer function for testing
    def optimize_vrp(request, **kwargs):
        return {
            "status": "error",
            "message": "Optimizer module not found - this is a test response",
            "backend": kwargs.get('backend', {}).name if hasattr(kwargs.get('backend', {}), 'name') else "unknown"
        }

app = FastAPI(
    title="Quantum VRP Optimizer", 
    version="0.1.0",
    description="A VRP optimizer using QAOA on IBM Quantum backends"
)

# Configure CORS - restrict origins in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to specific origins in production
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
    allow_credentials=False,
)


@app.get("/")
def root():
    """Health check endpoint."""
    return {
        "status": "ok", 
        "service": "Quantum VRP Optimizer", 
        "backend": ibm_backend.name if hasattr(ibm_backend, 'name') else "unknown",
        "backend_version": getattr(ibm_backend, 'version', 'unknown')
    }


@app.get("/backends")
def list_backends():
    """List available IBM Quantum backends."""
    try:
        all_backends = service.backends()
        backend_info = []
        
        for backend in all_backends:
            info = {
                "name": backend.name,
                "status": backend.status().operational,
                "simulator": backend.configuration().simulator,
                "n_qubits": backend.configuration().n_qubits,
            }
            backend_info.append(info)
        
        return {
            "backends": backend_info,
            "current_backend": ibm_backend.name if hasattr(ibm_backend, 'name') else "unknown"
        }
    except Exception as e:
        logger.error(f"Error listing backends: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/optimize")
def optimize(
    request: Dict[str, Any] = Body(..., description="VRP input JSON"),
    shots: int = Query(1000, ge=100, le=10000, description="Number of shots per parameter combination"),
    include_counts: bool = Query(True, description="Include measurement histograms per location"),
    method: str = Query("qaoa", description='Assignment method: "qaoa" or "pqc"'),
    qaoa_penalty: float = Query(2.0, gt=0, description="QAOA penalty A for one-hot constraint"),
    qaoa_p: int = Query(1, ge=1, le=3, description="QAOA layers p"),
    save_circuit: bool = Query(False, description="Save circuit diagrams as images and text files")
):
    
    try:
        logger.info(f"Received optimization request: method={method}, shots={shots}")
        logger.info(f"Backend: {ibm_backend.name}")
        
        # Validate request format
        if not isinstance(request, dict):
            raise HTTPException(status_code=400, detail="Request must be a JSON object")
        
        # Different validation based on method
        if method == "qaoa":
            required_fields = ["locations", "vehicles", "depots"]
            for field in required_fields:
                if field not in request:
                    raise HTTPException(status_code=400, detail=f"Request must contain '{field}' field for QAOA method")
                if not isinstance(request[field], list) or len(request[field]) == 0:
                    raise HTTPException(status_code=400, detail=f"'{field}' must be a non-empty list")
        else:
            # PQC method requirements (adjust based on your quantum_layer expectations)
            if "locations" not in request:
                raise HTTPException(status_code=400, detail="Request must contain 'locations' field")

        # Call the optimizer with the IBM backend
        result = optimize_vrp(
            request,
            shots=shots,
            include_counts=include_counts,
            method=method,
            qaoa_penalty=qaoa_penalty,
            qaoa_p=qaoa_p,
            backend=ibm_backend,
            save_circuit=save_circuit
        )
        
        if result.get("status") == "error":
            logger.error(f"Optimization failed: {result.get('message', 'Unknown error')}")
            raise HTTPException(status_code=500, detail=result.get("message", "Optimization failed"))
        
        logger.info("Optimization completed successfully")
        return result
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Error during optimization: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500, 
            detail=f"Internal server error: {str(e)}"
        )


@app.get("/generate-test-data")
def generate_test_data(
    num_locations: int = Query(100, ge=5, le=200, description="Number of locations to generate"),
    num_vehicles: int = Query(15, ge=2, le=25, description="Number of vehicles to generate"),
    num_depots: int = Query(3, ge=1, le=5, description="Number of depots to generate"),
    area_size: float = Query(1.0, gt=0, le=5.0, description="Geographic area size in degrees")
):
    """Generate test VRP data for performance testing."""
    import random
    import uuid
    
    # Set seed for reproducible results
    random.seed(42)
    
    # Base coordinates (roughly Bangalore area)
    base_lat, base_lon = 12.9716, 77.5946
    
    # Generate depots
    depots = []
    depot_coords = []
    for i in range(num_depots):
        lat = base_lat + random.uniform(-area_size/2, area_size/2)
        lon = base_lon + random.uniform(-area_size/2, area_size/2)
        depot_coords.append((lat, lon))
        depots.append({
            "id": f"depot_{i+1}",
            "lat": round(lat, 6),
            "lon": round(lon, 6)
        })
    
    # Generate vehicles
    vehicles = []
    vehicle_types = ["small", "medium", "large"]
    capacities = {"small": 800, "medium": 1200, "large": 1800}
    
    for i in range(num_vehicles):
        vtype = random.choice(vehicle_types)
        depot_id = random.choice([d["id"] for d in depots])
        vehicles.append({
            "id": f"truck_{i+1}",
            "capacity": capacities[vtype] + random.randint(-200, 200),
            "type": vtype,
            "max_shift_hours": random.randint(6, 12),
            "current_location": depot_id
        })
    
    # Generate locations
    locations = []
    for i in range(num_locations):
        lat = base_lat + random.uniform(-area_size, area_size)
        lon = base_lon + random.uniform(-area_size, area_size)
        locations.append({
            "id": f"loc_{i+1}",
            "lat": round(lat, 6),
            "lon": round(lon, 6),
            "demand": random.randint(50, 600),
            "priority": random.randint(1, 3),
            "time_window": [random.randint(6, 9), random.randint(15, 20)]
        })
    
    # Generate constraints
    constraints = {
        "max_stops_per_vehicle": min(10, max(4, num_locations // num_vehicles + 2)),
        "max_distance_per_vehicle": 50.0 + area_size * 20,
        "max_time_per_vehicle": random.randint(8, 12),
        "priority_handling": "True",
        "allowed_vehicle_types": vehicle_types
    }
    
    test_data = {
        "num_vehicles": len(vehicles),
        "vehicles": vehicles,
        "depots": depots,
        "locations": locations,
        "constraints": constraints,
        "metadata": {
            "generated": True,
            "area_size_degrees": area_size,
            "base_location": "Bangalore, India",
            "total_demand": sum(loc["demand"] for loc in locations),
            "total_capacity": sum(veh["capacity"] for veh in vehicles)
        }
    }
    
    return test_data


@app.get("/test")
def test_backend():
    """Test the connection to IBM Quantum backend."""
    try:
        # Test backend connectivity
        backend_status = ibm_backend.status()
        config = ibm_backend.configuration()
        
        return {
            "backend_name": ibm_backend.name,
            "operational": backend_status.operational,
            "pending_jobs": backend_status.pending_jobs,
            "simulator": config.simulator,
            "n_qubits": config.n_qubits,
            "status": "Backend connection successful"
        }
    except Exception as e:
        logger.error(f"Backend test failed: {e}")
        raise HTTPException(status_code=500, detail=f"Backend test failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    logger.info("Starting Quantum VRP Optimizer API...")
    uvicorn.run("api:app", host="127.0.0.1", port=8080, reload=True)