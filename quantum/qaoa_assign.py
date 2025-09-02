from __future__ import annotations

from typing import Dict, List, Tuple, Optional

import numpy as np
import cirq


def _compute_h_coeffs(costs: np.ndarray, A: float) -> Tuple[np.ndarray, float]:
    """Return (h, J) for H_C = sum_i h_i Z_i + sum_{i<j} J Z_i Z_j (const dropped).

    We encode the one-hot constraint with penalty A and linear costs c_i via:
        C(x) = sum_i c_i x_i + A (sum_i x_i - 1)^2
    with x_i in {0,1}. Using x_i = (1 - Z_i)/2, this becomes an Ising Hamiltonian
    with coefficients:
        h_i = -0.5 * (c_i + A*(K - 2))
        J   =  A / 2   (for all i<j)
    where K = len(costs).
    """
    K = len(costs)
    h = -0.5 * (costs + A * (K - 2))
    J = A / 2.0
    return h, J


def _apply_cost_layer(circuit: cirq.Circuit, qubits: List[cirq.Qid], gamma: float, h: np.ndarray, J: float) -> None:
    # Single-Z terms: exp(-i gamma h_i Z_i) = Rz(2*gamma*h_i)
    for i, q in enumerate(qubits):
        theta = 2.0 * gamma * float(h[i])
        circuit.append(cirq.rz(theta)(q))
    # ZZ terms: exp(-i gamma J Z_i Z_j) = ZZPowGate(exponent=2*gamma*J/pi)
    if len(qubits) >= 2 and abs(J) > 0:
        exponent = 2.0 * gamma * float(J) / np.pi
        for i in range(len(qubits)):
            for j in range(i + 1, len(qubits)):
                circuit.append(cirq.ZZPowGate(exponent=exponent).on(qubits[i], qubits[j]))


def _apply_mixer_layer(circuit: cirq.Circuit, qubits: List[cirq.Qid], beta: float) -> None:
    # Mixer: exp(-i beta sum X_i) = prod_i Rx(2*beta)
    for q in qubits:
        circuit.append(cirq.rx(2.0 * beta)(q))


def build_qaoa_circuit(costs: np.ndarray, gammas: List[float], betas: List[float], A: float = 2.0) -> Tuple[cirq.Circuit, List[cirq.Qid]]:
    """Build p-layer QAOA circuit for one-hot assignment with linear costs.

    costs: length-K array of per-truck costs (prefer smaller).
    gammas, betas: lists of p parameters each.
    A: penalty weight for (sum x_i - 1)^2.
    """
    assert len(gammas) == len(betas)
    p = len(gammas)
    K = len(costs)
    qubits = list(cirq.LineQubit.range(K))
    circuit = cirq.Circuit()

    # Initialize |+>^K
    for q in qubits:
        circuit.append(cirq.H(q))

    h, J = _compute_h_coeffs(costs, A)
    for layer in range(p):
        _apply_cost_layer(circuit, qubits, gammas[layer], h, J)
        _apply_mixer_layer(circuit, qubits, betas[layer])

    circuit.append(cirq.measure(*qubits, key="assign"))
    return circuit, qubits


def _bit_cost(bitstr: Tuple[int, ...], costs: np.ndarray, A: float) -> float:
    x = np.array(bitstr, dtype=float)
    return float(np.dot(costs, x) + A * (np.sum(x) - 1.0) ** 2)


def _energy_from_counts(counts: Dict[Tuple[int, ...], int], costs: np.ndarray, A: float, shots: int) -> float:
    if shots <= 0:
        return 0.0
    total = 0.0
    for bit, c in counts.items():
        total += _bit_cost(bit, costs, A) * c
    return total / float(shots)


def _measure_counts(sim: cirq.Simulator, circuit: cirq.Circuit, K: int, shots: int) -> Dict[Tuple[int, ...], int]:
    result = sim.run(circuit, repetitions=shots)
    # Use the measurements dict to get an array of shape (shots, K)
    meas = result.measurements.get("assign")
    if meas is None:
        # Fallback to dataframe if needed
        df = result.data
        # Collect all columns that start with the key name
        cols = [c for c in df.columns if c.startswith("assign")]
        arr = df[cols].to_numpy()
    else:
        arr = meas  # (shots, K)
    # Normalize to int and ensure correct width K
    arr = arr.astype(int)
    if arr.ndim != 2 or arr.shape[1] != K:
        # Attempt to fix ordering by selecting first K columns if wider
        if arr.ndim == 2 and arr.shape[1] > K:
            arr = arr[:, :K]
        else:
            raise ValueError(f"Unexpected measurement shape {arr.shape}, expected (*,{K})")
    out: Dict[Tuple[int, ...], int] = {}
    for row in arr:
        tup = tuple(int(v) for v in row)
        out[tup] = out.get(tup, 0) + 1
    return out


def run_qaoa_assignment(costs: np.ndarray, shots: int = 2000, p: int = 1, A: float = 2.0,
                        grid: Optional[List[Tuple[float, float]]] = None) -> Tuple[Dict[int, int], Tuple[float, float]]:
    """Run a tiny p-layer QAOA with grid-search over (gamma,beta) for one-hot assignment.

    Returns:
      - counts_by_index: counts aggregated only over one-hot bitstrings (exactly one 1). Key = truck index.
      - best_params: (gamma, beta) chosen by lowest sampled energy.
    Fallback: if no one-hot samples, we pick argmin(costs) with all counts assigned there.
    """
    K = len(costs)
    if grid is None:
        vals = [0.1, 0.3, 0.5, 0.7, 1.0]
        grid = [(g, b) for g in vals for b in vals]

    sim = cirq.Simulator()
    best_E = float("inf")
    best_counts_bits: Dict[Tuple[int, ...], int] = {}
    best_pair = (0.3, 0.7)

    for (g, b) in grid:
        gammas = [g] * p
        betas = [b] * p
        circuit, _ = build_qaoa_circuit(costs=costs, gammas=gammas, betas=betas, A=A)
        counts_bits = _measure_counts(sim, circuit, K=K, shots=shots)
        E = _energy_from_counts(counts_bits, costs, A, shots)
        if E < best_E:
            best_E = E
            best_counts_bits = counts_bits
            best_pair = (g, b)

    # Aggregate one-hot counts by index
    counts_by_index: Dict[int, int] = {}
    for bit, c in best_counts_bits.items():
        ones = [i for i, v in enumerate(bit) if v == 1]
        if len(ones) == 1:
            idx = ones[0]
            counts_by_index[idx] = counts_by_index.get(idx, 0) + int(c)

    # Fallback if no valid one-hot observed
    if not counts_by_index:
        idx = int(np.argmin(costs))
        counts_by_index[idx] = shots

    return counts_by_index, best_pair
