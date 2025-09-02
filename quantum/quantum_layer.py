from __future__ import annotations

from typing import Dict, List, Tuple, Optional

import numpy as np
import pandas as pd
import cirq

from vrp_data import minmax_scale


def num_assignment_qubits(num_trucks: int) -> int:
    import math
    return max(1, math.ceil(math.log2(max(1, num_trucks))))


def build_assignment_circuit_for_location(
    features_row: pd.Series,
    num_trucks: int,
    thetas: Optional[Dict[str, np.ndarray]] = None,
    measure_key: str = "assign",
) -> Tuple[cirq.Circuit, List[cirq.Qid]]:
    """Build a small variational circuit with angle encoding."""
    n_qubits = num_assignment_qubits(num_trucks)
    qs = cirq.LineQubit.range(n_qubits)
    circuit = cirq.Circuit()

    ang_d = float(features_row["demand_scaled"]) * np.pi
    ang_p = float(features_row["priority_scaled"]) * np.pi
    ang_tw = float(features_row["tw_width_scaled"]) * np.pi
    ang_dist = float(features_row["distance_scaled"]) * np.pi

    if thetas is None:
        rng = np.random.default_rng(42)
        thetas = {
            "rx": rng.uniform(0, np.pi/8, size=n_qubits),
            "ry": rng.uniform(0, np.pi/8, size=n_qubits),
            "rz": rng.uniform(0, np.pi/8, size=n_qubits),
            "bias": float(np.pi/6),
        }

    for i, q in enumerate(qs):
        circuit.append(cirq.rx(ang_dist + float(thetas["rx"][i]))(q))
        circuit.append(cirq.ry(ang_d + float(thetas["ry"][i]))(q))
        circuit.append(cirq.rz(ang_p + ang_tw + float(thetas["rz"][i]))(q))

    for i in range(n_qubits - 1):
        circuit.append(cirq.CNOT(qs[i], qs[i + 1]))

    circuit.append(cirq.rz(float(thetas["bias"]))(qs[0]))

    circuit.append(cirq.measure(*qs, key=measure_key))
    return circuit, qs


def simulate_counts(
    circuit: cirq.Circuit,
    key: str,
    num_trucks: int,
    shots: int = 2000,
) -> Dict[int, int]:
    sim = cirq.Simulator()
    result = sim.run(circuit, repetitions=shots)

    def bits_to_int(bits: Tuple[int, ...]) -> int:
        v = 0
        for i, b in enumerate(bits):
            v |= (int(b) & 1) << i
        return v

    hist = result.histogram(key=key, fold_func=bits_to_int)
    truck_counts: Dict[int, int] = {}
    for state, cnt in hist.items():
        if state < num_trucks:
            truck_counts[state] = truck_counts.get(state, 0) + int(cnt)
    return truck_counts


def truck_index_order_from_counts(truck_counts: Dict[int, int], num_trucks: int) -> List[int]:
    base = [(idx, truck_counts.get(idx, 0)) for idx in range(num_trucks)]
    base.sort(key=lambda x: x[1], reverse=True)
    return [idx for idx, _ in base]

