# Cirq Quantum System Pipeline Demo (Layered)

This repository contains a minimal, end-to-end demonstration of a layered pipeline using Cirq to assist a tiny vehicle routing-like assignment.

Layers covered:
- Input Layer: loads data (built-in sample or JSON)
- Preprocessing: pandas feature engineering + scaling to [0,1]
- Quantum Processing: Cirq circuit per location (angle encoding, entanglement, simple variational bias)
- Measurement: simulate with shots to obtain histogram counts
- Post-processing: select truck per location from counts, then greedily enforce simple constraints (capacity, max stops, distance/time)
- Visualization: matplotlib histograms of per-location measurement counts

What this is not:
- This is not a full VRP solver. It’s a minimal hybrid classical-quantum demo showing how to wire the layers together in code using Cirq.

## Files
- `vrp_data.py` — data models, sample dataset, input & preprocessing utilities
- `quantum_layer.py` — Cirq circuit construction and simulation helpers
- `constraints_layer.py` — greedy constraint enforcement and distance estimates
- `optimizer.py` — optimize_vrp function used by the API and sample runner
- `visualization.py` — image generation (histograms, geo-plot, layered graph, summary table)
- `api.py` — FastAPI server exposing POST /optimize
- `sample.py` — runs the sample dataset and saves images
- `requirements.txt` — dependencies

## Install
On Windows PowerShell:

1) Create and (optionally) activate a virtual environment.
2) Install dependencies:

    pip install -r requirements.txt

## Run (script or sample)

    # quick sample run that saves images into ./figures
    python .\sample.py

    # or run the original script (prints circuits) — optional
    python .\cirq_pipeline_vrp.py

This will:
- Build a small sample dataset (3 trucks, 5 locations)
- Preprocess and scale features
- Build and print one Cirq circuit per location
- Simulate measurement histograms and pick the most likely truck
- Enforce capacity/max-stops/distance/time constraints greedily
- Print a final assignment summary
- Show per-location histograms (close the figure window to exit)

## Run (API)
Start the FastAPI server:

    python -m pip install -r requirements.txt
    python -m uvicorn api:app --host 127.0.0.1 --port 8000 --reload

Then POST your VRP JSON to /optimize. Example (PowerShell):

    Invoke-WebRequest -Uri "http://127.0.0.1:8000/optimize?shots=2000&include_counts=true" -Method POST -ContentType "application/json" -InFile ".\your_data.json"

Or using curl:

    curl -X POST "http://127.0.0.1:8000/optimize?shots=2000&include_counts=true" \
         -H "Content-Type: application/json" \
         --data-binary @your_data.json

The response JSON includes:
- assignments: vehicle_id -> [location_id]
- per_vehicle_summary: stops, total_demand, approx_distance_km per vehicle
- unassigned: locations dropped due to constraints
- counts_by_location (optional): location_id -> {vehicle_id -> measurement count}

## Visualization helpers
Use `visualization.py` to save images from API output.

- Save per-location histograms:

    from visualization import save_counts_histograms
    img_paths = save_counts_histograms(result["counts_by_location"], output_dir="figures")

- Save assignment map (needs the original input JSON for lat/lon):

    from visualization import save_assignment_geoplot
    save_assignment_geoplot(input_json, result["assignments"], output_path="figures/assignment_map.png")

- Save per-vehicle summary table:

- Save layered connection graph (depots → vehicles → locations):

    from visualization import save_assignment_graph
    save_assignment_graph(input_json, result["assignments"], output_path="figures/assignment_graph.png")

    from visualization import save_summary_table
    save_summary_table(result["per_vehicle_summary"], output_path="figures/summary_table.png")

## Using your own JSON
You can modify `run_pipeline()` in `cirq_pipeline_vrp.py` to pass a `json_path` that points to a file with the following structure (fields beyond these are ignored):

{
  "num_vehicles": 3,
  "vehicles": [
    {"id": "truck_1", "capacity": 1000, "type": "small",  "max_shift_hours": 8,  "current_location": "depot_1"},
    {"id": "truck_2", "capacity": 1500, "type": "medium", "max_shift_hours": 10, "current_location": "depot_2"},
    {"id": "truck_3", "capacity": 1200, "type": "medium", "max_shift_hours": 9,  "current_location": "depot_1"}
  ],
  "depots": [
    {"id": "depot_1", "lat": 12.9716, "lon": 77.5946},
    {"id": "depot_2", "lat": 12.9350, "lon": 77.6100}
  ],
  "locations": [
    {"id": "loc_1", "lat": 12.9352, "lon": 77.6245, "demand": 300, "priority": 1, "time_window": [8, 12]},
    ...
  ],
  "constraints": {
    "max_stops_per_vehicle": 4,
    "max_distance_per_vehicle": 20,
    "max_time_per_vehicle": 10,
    "priority_handling": true,
    "allowed_vehicle_types": ["small", "medium", "large"]
  }
}

Then change the last line in `cirq_pipeline_vrp.py` to:

    if __name__ == "__main__":
        run_pipeline(json_path="path_to_your_data.json")

## Notes
- The mapping from measurement outcomes to truck IDs is integer-based; for N trucks, bitstrings ≥ N are ignored.
- The constraint enforcement is deliberately simple and greedy for clarity.
- For more complex encodings (e.g., amplitude encoding) or training the variational parameters, you can extend `build_assignment_circuit_for_location` and introduce an optimizer loop.

