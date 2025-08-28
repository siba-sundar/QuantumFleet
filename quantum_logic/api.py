from __future__ import annotations

from typing import Any, Dict

from fastapi import FastAPI, Body, Query
from fastapi.middleware.cors import CORSMiddleware

from optimizer import optimize_vrp

app = FastAPI(title="Cirq VRP Optimizer", version="0.1.0")

# Allow CORS from anywhere (wildcard). For production, restrict to known origins.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=False,
)


@app.get("/")
def root():
    return {"status": "ok", "service": "Cirq VRP Optimizer"}


@app.post("/optimize")
def optimize(
    request: Dict[str, Any] = Body(..., description="VRP input JSON"),
    shots: int = Query(2000, ge=1, le=100000, description="Simulator repetitions per location"),
    include_counts: bool = Query(True, description="Include measurement histograms per location")
):
    """
    Accepts a VRP JSON input and returns a structured assignment result.

    Example curl:
    curl -X POST "http://127.0.0.1:8000/optimize?shots=2000&include_counts=true" \
         -H "Content-Type: application/json" \
         -d @your_data.json
    """
    result = optimize_vrp(request, shots=shots, include_counts=include_counts)
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="127.0.0.1", port=8000, reload=True)

