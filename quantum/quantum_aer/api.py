from __future__ import annotations
from typing import Any, Dict
import logging
import traceback
import time

from fastapi import FastAPI, Body, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Optimized Qiskit imports
from qiskit_aer import AerSimulator
from vrp_utils import get_distance_matrix, compute_corridors

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Use optimized local simulator with better settings
ibm_backend = AerSimulator(
    method='statevector',  # Faster for small circuits
    max_parallel_threads=4,
    max_parallel_experiments=2,
    shots=1024  # Default shots
)

# Import optimizer after backend initialization
try:
    from optimizer import optimize_vrp
except ImportError as e:
    logger.error(f"Failed to import optimizer: {e}")

    def optimize_vrp(request, **kwargs):
        return {
            "status": "error",
            "message": "Optimizer module not found",
            "backend": kwargs.get('backend').name() if hasattr(kwargs.get('backend'), 'name') else "unknown"
        }

app = FastAPI(
    title="Optimized Quantum VRP API", 
    version="0.2.0",
    description="Fast VRP optimizer using optimized QAOA on local simulator"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
    allow_credentials=False,
)

@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "Optimized Quantum VRP API",
        "backend": ibm_backend.name,
        "optimizations": [
            "Parallel location processing",
            "Adaptive shot reduction",
            "Cached QUBO coefficients", 
            "Limited parameter grid",
            "Fast classical fallbacks"
        ]
    }

@app.post("/optimize")
def optimize(
    request: Dict[str, Any] = Body(..., description="VRP input JSON"),
    shots: int = Query(800, ge=100, le=5000, description="Number of shots (auto-adjusted for large problems)"),
    include_counts: bool = Query(False, description="Include measurement histograms (slower)"),
    method: str = Query("qaoa", description='Assignment method: "qaoa" or "pqc"'),
    qaoa_penalty: float = Query(2.0, gt=0, description="QAOA penalty A for one-hot constraint"),
    qaoa_p: int = Query(1, ge=1, le=2, description="QAOA layers p (limited for speed)")
):
    start_time = time.time()
    
    try:
        logger.info(f"Starting optimization: method={method}, shots={shots}")
        
        if not isinstance(request, dict):
            raise HTTPException(status_code=400, detail="Request must be a JSON object")
        
        depots = request.get("depots", [])
        locations = request.get("locations", [])
        
        # Quick validation
        if not depots or not locations:
            raise HTTPException(status_code=400, detail="Must provide both depots and locations")
            
        if len(locations) > 50:
            logger.warning(f"Large problem with {len(locations)} locations - applying aggressive optimizations")
            shots = min(shots, 500)  # Reduce shots for very large problems
            include_counts = False   # Disable counts for speed

        # Pre-compute distance matrices (with timeout for large problems)
        matrix_start = time.time()
        try:
            distance_matrix, duration_matrix = get_distance_matrix(depots, locations)
            matrix_time = time.time() - matrix_start
            
            if matrix_time > 30:  # If matrix computation is slow
                logger.warning("Distance matrix computation is slow - problem may be too large")
                
        except Exception as e:
            logger.error(f"Distance matrix computation failed: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to compute distance matrix: {str(e)}")

        # Compute corridors efficiently
        corridors_info = {}
        for depot in depots:
            try:
                corridors_info[depot['id']] = compute_corridors(depot, locations, tolerance=30)
            except Exception as e:
                logger.warning(f"Corridor computation failed for depot {depot.get('id', 'unknown')}: {e}")
                corridors_info[depot['id']] = [[loc['id'] for loc in locations]]  # Single corridor fallback

        # Add precomputed data to request
        request["distance_matrix"] = distance_matrix
        request["duration_matrix"] = duration_matrix
        request["corridors"] = corridors_info

        # Call optimized optimizer
        result = optimize_vrp(
            request,
            shots=shots,
            include_counts=include_counts,
            method=method,
            qaoa_penalty=qaoa_penalty,
            qaoa_p=qaoa_p,
            backend=ibm_backend,
        )
        
        # Add API-level timing info
        total_time = time.time() - start_time
        result["meta"]["api_processing_time"] = round(total_time, 2)
        result["meta"]["distance_matrix_time"] = round(matrix_time, 2)
        
        if result.get("status") == "error":
            logger.error(f"Optimization failed: {result.get('message', 'Unknown error')}")
            raise HTTPException(status_code=500, detail=result.get("message", "Optimization failed"))
        
        logger.info(f"Optimization completed successfully in {total_time:.2f}s")
        
        # Log performance metrics
        if "optimization_summary" in result:
            summary = result["optimization_summary"]
            logger.info(f"Performance: {summary.get('total_distance_km', 0):.1f}km, "
                       f"{summary.get('vehicles_used', 0)} vehicles used, "
                       f"{result['meta'].get('total_locations_assigned', 0)} locations assigned")
        
        return result

    except HTTPException:
        raise
    except Exception as e:
        total_time = time.time() - start_time
        logger.error(f"Error during optimization after {total_time:.2f}s: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error after {total_time:.1f}s: {str(e)}"
        )

@app.get("/test")
def test_backend():
    """Test optimized simulator backend with performance check"""
    try:
        from qiskit import QuantumCircuit
        
        # Create a small test circuit
        test_circuit = QuantumCircuit(2, 2)
        test_circuit.h(0)
        test_circuit.cx(0, 1)
        test_circuit.measure_all()
        
        # Time a quick execution
        start = time.time()
        job = ibm_backend.run(test_circuit, shots=100)
        result = job.result()
        execution_time = time.time() - start
        
        return {
            "backend_name": ibm_backend.name,
            "status": "Optimized simulator ready",
            "test_execution_time": round(execution_time, 3),
            "configuration": {
                "method": getattr(ibm_backend.configuration(), 'method', 'default'),
                "max_parallel_threads": getattr(ibm_backend.configuration(), 'max_parallel_threads', 'unknown'),
                "shots": getattr(ibm_backend.configuration(), 'shots', 1024)
            },
            "performance": "optimal" if execution_time < 1.0 else "acceptable" if execution_time < 3.0 else "slow"
        }
    except Exception as e:
        logger.error(f"Backend test failed: {e}")
        raise HTTPException(status_code=500, detail=f"Backend test failed: {str(e)}")

@app.get("/health")
def health_check():
    """Quick health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "backend": ibm_backend.name,
        "ready": True
    }

@app.get("/performance-tips")
def performance_tips():
    """Return optimization tips for users"""
    return {
        "tips": [
            "For problems with >20 locations, consider breaking into smaller clusters",
            "Reduce shots parameter for faster response (minimum 100)",
            "Disable include_counts for production use to improve speed",
            "Use qaoa_p=1 for fastest results with reasonable quality",
            "Large problems (>30 locations) may take several minutes"
        ],
        "recommended_settings": {
            "small_problems": {"locations": "<10", "shots": 1000, "qaoa_p": 1},
            "medium_problems": {"locations": "10-25", "shots": 800, "qaoa_p": 1},  
            "large_problems": {"locations": ">25", "shots": 500, "qaoa_p": 1}
        }
    }

@app.get("/benchmark")
def benchmark():
    """Run a quick benchmark to assess system performance"""
    try:
        from qiskit import QuantumCircuit
        import numpy as np
        
        results = {}
        
        # Test 1: Simple 2-qubit circuit
        start = time.time()
        circuit = QuantumCircuit(2, 2)
        circuit.h(0)
        circuit.cx(0, 1)
        circuit.measure_all()
        
        job = ibm_backend.run(circuit, shots=1000)
        result = job.result()
        results["simple_2qubit"] = {
            "time": round(time.time() - start, 3),
            "shots": 1000,
            "qubits": 2
        }
        
        # Test 2: 4-qubit QAOA-like circuit
        start = time.time()
        circuit = QuantumCircuit(4, 4)
        circuit.h([0, 1, 2, 3])  # Initialize
        
        # Add some rotations (QAOA-like)
        for i in range(4):
            circuit.rz(0.5, i)
        for i in range(3):
            circuit.rzz(0.3, i, i+1)
        for i in range(4):
            circuit.rx(0.4, i)
            
        circuit.measure_all()
        
        job = ibm_backend.run(circuit, shots=500)
        result = job.result()
        results["qaoa_4qubit"] = {
            "time": round(time.time() - start, 3),
            "shots": 500,
            "qubits": 4
        }
        
        # Test 3: Classical computation benchmark
        start = time.time()
        # Simulate some classical VRP computations
        n_points = 20
        coords = np.random.rand(n_points, 2) * 100
        
        # Compute distance matrix
        distances = np.zeros((n_points, n_points))
        for i in range(n_points):
            for j in range(n_points):
                distances[i, j] = np.sqrt(np.sum((coords[i] - coords[j])**2))
        
        # Simple optimization
        best_cost = float('inf')
        for _ in range(100):
            perm = np.random.permutation(n_points)
            cost = sum(distances[perm[i], perm[(i+1)%n_points]] for i in range(n_points))
            best_cost = min(best_cost, cost)
            
        results["classical_computation"] = {
            "time": round(time.time() - start, 3),
            "points": n_points,
            "iterations": 100
        }
        
        # Overall assessment
        quantum_time = results["qaoa_4qubit"]["time"]
        classical_time = results["classical_computation"]["time"]
        
        performance_score = "excellent" if quantum_time < 2 else "good" if quantum_time < 5 else "acceptable"
        
        return {
            "timestamp": time.time(),
            "system_performance": performance_score,
            "backend": ibm_backend.name,
            "benchmarks": results,
            "recommendations": {
                "max_recommended_qubits": 6 if quantum_time < 2 else 4 if quantum_time < 5 else 3,
                "max_recommended_shots": 1000 if quantum_time < 2 else 500 if quantum_time < 5 else 300,
                "parallel_workers": 4 if classical_time < 1 else 2 if classical_time < 3 else 1
            }
        }
        
    except Exception as e:
        logger.error(f"Benchmark failed: {e}")
        raise HTTPException(status_code=500, detail=f"Benchmark failed: {str(e)}")

@app.post("/optimize-batch")
def optimize_batch(
    requests: List[Dict[str, Any]] = Body(..., description="List of VRP requests"),
    shots: int = Query(500, ge=100, le=2000, description="Shots per request"),
    max_concurrent: int = Query(3, ge=1, le=5, description="Max concurrent optimizations")
):
    """Optimize multiple VRP problems in batch with controlled concurrency"""
    from concurrent.futures import ThreadPoolExecutor, as_completed
    
    if len(requests) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 requests per batch")
    
    start_time = time.time()
    results = []
    
    def optimize_single(req_with_idx):
        idx, req = req_with_idx
        try:
            result = optimize_vrp(
                req,
                shots=shots,
                include_counts=False,  # Disable for batch processing speed
                method="qaoa",
                qaoa_penalty=2.0,
                qaoa_p=1,
                backend=ibm_backend
            )
            return idx, result
        except Exception as e:
            return idx, {
                "status": "error", 
                "message": str(e),
                "request_index": idx
            }
    
    try:
        with ThreadPoolExecutor(max_workers=max_concurrent) as executor:
            # Submit all requests
            indexed_requests = [(i, req) for i, req in enumerate(requests)]
            futures = [executor.submit(optimize_single, req) for req in indexed_requests]
            
            # Collect results in order
            results_dict = {}
            for future in as_completed(futures, timeout=300):  # 5 minute timeout
                idx, result = future.result()
                results_dict[idx] = result
            
            # Sort results by original order
            results = [results_dict[i] for i in range(len(requests))]
            
    except Exception as e:
        logger.error(f"Batch processing failed: {e}")
        raise HTTPException(status_code=500, detail=f"Batch processing failed: {str(e)}")
    
    total_time = time.time() - start_time
    
    # Summary statistics
    successful = sum(1 for r in results if r.get("status") == "success")
    failed = len(results) - successful
    
    total_locations = sum(r.get("meta", {}).get("num_locations", 0) for r in results if r.get("status") == "success")
    total_distance = sum(r.get("optimization_summary", {}).get("total_distance_km", 0) for r in results if r.get("status") == "success")
    
    return {
        "batch_summary": {
            "total_requests": len(requests),
            "successful": successful,
            "failed": failed,
            "total_processing_time": round(total_time, 2),
            "average_time_per_request": round(total_time / len(requests), 2),
            "total_locations_processed": total_locations,
            "total_distance_optimized": round(total_distance, 2)
        },
        "individual_results": results
    }

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting Optimized Quantum VRP API...")
    logger.info(f"Backend: {ibm_backend.name}")
    logger.info("Optimizations enabled: parallel processing, adaptive shots, cached coefficients")
    uvicorn.run("api:app", host="127.0.0.1", port=8000, reload=True)