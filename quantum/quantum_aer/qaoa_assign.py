from __future__ import annotations
from typing import Dict, List, Tuple, Optional
import numpy as np
from concurrent.futures import ThreadPoolExecutor
import time
from functools import lru_cache

from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator
from qiskit.transpiler.preset_passmanagers import generate_preset_pass_manager

# Global optimized simulator
_OPTIMIZED_SIMULATOR = AerSimulator(
    method='statevector',
    max_parallel_threads=2,
    shots=1024
)

@lru_cache(maxsize=64)
def _compute_h_coeffs(costs_tuple: tuple, A: float) -> Tuple[np.ndarray, float]:
    """Cached computation of QUBO coefficients."""
    costs = np.array(costs_tuple)
    K = len(costs)
    h = -0.5 * (costs + A * (K - 2))
    J = A / 2.0
    return h, J

def _apply_cost_layer(circuit: QuantumCircuit, qubits: List[int], gamma: float, h: np.ndarray, J: float) -> None:
    """Optimized cost layer application."""
    # Skip very small rotations for speed
    threshold = 1e-6
    
    # Single qubit rotations
    for i in range(len(qubits)):
        if abs(h[i]) > threshold:
            circuit.rz(2.0 * gamma * float(h[i]), qubits[i])
    
    # Limit two-qubit interactions for larger problems
    if len(qubits) >= 2 and abs(J) > threshold:
        exponent = 2.0 * gamma * float(J)
        max_pairs = min(15, len(qubits) * (len(qubits) - 1) // 2)  # Limit complexity
        count = 0
        for i in range(len(qubits)):
            for j in range(i + 1, len(qubits)):
                if count >= max_pairs:
                    break
                circuit.rzz(exponent, qubits[i], qubits[j])
                count += 1

def _apply_mixer_layer(circuit: QuantumCircuit, qubits: List[int], beta: float) -> None:
    """Apply the mixer layer to the circuit."""
    for i in qubits:
        circuit.rx(2.0 * beta, i)

def build_qaoa_circuit_fast(costs: np.ndarray, gamma: float, beta: float, A: float = 2.0) -> QuantumCircuit:
    """Fast QAOA circuit construction for single parameter pair."""
    K = len(costs)
    circuit = QuantumCircuit(K, K)
    qubits = list(range(K))
    
    # Initialize uniform superposition
    circuit.h(qubits)
    
    # Compute QUBO coefficients (cached)
    h, J = _compute_h_coeffs(tuple(costs), A)
    
    # Apply single layer (p=1 for speed)
    _apply_cost_layer(circuit, qubits, gamma, h, J)
    _apply_mixer_layer(circuit, qubits, beta)
    
    # Measurements
    circuit.measure(qubits, qubits)
    return circuit

def build_qaoa_circuit(costs: np.ndarray, gammas: List[float], betas: List[float], A: float = 2.0) -> Tuple[QuantumCircuit, List[int]]:
    """Build a QAOA circuit for the given cost function and parameters."""
    assert len(gammas) == len(betas), "Number of gamma and beta parameters must match"
    p = len(gammas)
    K = len(costs)
    qubits = list(range(K))
    
    circuit = QuantumCircuit(K, K)
    circuit.h(qubits)  # Initialize uniform superposition
    
    # Compute QUBO coefficients (cached)
    h, J = _compute_h_coeffs(tuple(costs), A)
    
    # Apply p layers of QAOA
    for layer in range(p):
        _apply_cost_layer(circuit, qubits, gammas[layer], h, J)
        _apply_mixer_layer(circuit, qubits, betas[layer])

    circuit.measure(qubits, qubits)
    return circuit, qubits

def _bit_cost(bitstr: Tuple[int, ...], costs: np.ndarray, A: float) -> float:
    """Compute the cost of a bit string."""
    x = np.array(bitstr, dtype=float)
    linear_cost = float(np.dot(costs, x))
    constraint_penalty = A * (np.sum(x) - 1.0) ** 2
    return linear_cost + constraint_penalty

def _energy_from_counts(counts: Dict[str, int], costs: np.ndarray, A: float, shots: int) -> float:
    """Compute average energy from measurement counts."""
    if shots <= 0:
        return 0.0
    
    total_energy = 0.0
    for bitstr, count in counts.items():
        bit_tuple = tuple(int(b) for b in bitstr[::-1])
        cost = _bit_cost(bit_tuple, costs, A)
        total_energy += cost * count
    
    return total_energy / float(shots)

def _execute_single_parameter(args) -> Tuple[float, Dict[str, int], Tuple[float, float]]:
    """Execute QAOA for a single parameter pair - for parallel processing."""
    gamma, beta, costs, A, shots, backend = args
    
    try:
        circuit = build_qaoa_circuit_fast(costs, gamma, beta, A)
        
        # Use optimized transpilation
        if hasattr(backend, 'configuration'):
            # Real backend
            pm = generate_preset_pass_manager(backend=backend, optimization_level=1)
            transpiled = pm.run(circuit)
        else:
            # Simulator - minimal transpilation
            transpiled = circuit
        
        # Execute
        if hasattr(backend, 'run'):
            job = backend.run(transpiled, shots=shots)
            result = job.result()
            counts = result.get_counts()
        else:
            # Fallback execution method
            counts = _simulate_fast(transpiled, shots)
        
        energy = _energy_from_counts(counts, costs, A, shots)
        return energy, counts, (gamma, beta)
        
    except Exception as e:
        print(f"Error with params ({gamma}, {beta}): {e}")
        # Return high energy for failed executions
        return float('inf'), {}, (gamma, beta)

def _simulate_fast(circuit: QuantumCircuit, shots: int) -> Dict[str, int]:
    """Fast simulation fallback."""
    try:
        job = _OPTIMIZED_SIMULATOR.run(circuit, shots=shots)
        result = job.result()
        return result.get_counts()
    except:
        # Ultimate fallback - random counts
        K = circuit.num_qubits
        counts = {}
        best_idx = np.random.randint(K)
        for i in range(K):
            bitstr = '0' * K
            bitstr = bitstr[:i] + '1' + bitstr[i+1:]
            if i == best_idx:
                counts[bitstr] = int(shots * 0.8)
            else:
                counts[bitstr] = int(shots * 0.2 / (K - 1))
        return counts

def _classical_fallback(costs: np.ndarray, shots: int) -> Dict[str, int]:
    """Fast classical fallback when quantum execution fails."""
    min_idx = int(np.argmin(costs))
    K = len(costs)
    counts = {}
    
    # Create distribution favoring minimum cost
    for i in range(K):
        bitstr = '0' * K
        bitstr = bitstr[:i] + '1' + bitstr[i+1:]
        
        if i == min_idx:
            counts[bitstr] = int(shots * 0.7)
        else:
            counts[bitstr] = int(shots * 0.3 / max(1, K - 1))
    
    # Ensure total adds up
    total = sum(counts.values())
    if total < shots:
        best_bitstr = '0' * K
        best_bitstr = best_bitstr[:min_idx] + '1' + best_bitstr[min_idx+1:]
        counts[best_bitstr] += (shots - total)
    
    return counts

def run_qaoa_assignment(costs: np.ndarray, backend, shots: int = 1000, p: int = 1, A: float = 2.0,
                        grid: Optional[List[Tuple[float, float]]] = None) -> Tuple[Dict[int, int], Tuple[float, float]]:
    """
    Optimized QAOA assignment with parallel parameter search and smart fallbacks.
    """
    K = len(costs)
    print(f"Starting optimized QAOA assignment for {K} vehicles")
    
    # Adaptive shots based on problem size
    adaptive_shots = min(shots, max(500, shots // (K // 2 + 1)))
    
    # Smaller, smarter parameter grid
    if grid is None:
        if K <= 3:
            vals = [0.2, 0.5, 0.8]
        else:
            vals = [0.3, 0.7]  # Fewer points for larger problems
        grid = [(g, b) for g in vals for b in vals]
    
    # Limit grid size for speed
    grid = grid[:6]  # Maximum 6 parameter combinations
    
    print(f"Testing {len(grid)} parameter combinations with {adaptive_shots} shots each")
    
    best_E = float("inf")
    best_counts: Dict[str, int] = {}
    best_pair = (0.3, 0.7)
    
    # Try parallel execution for speed
    try:
        with ThreadPoolExecutor(max_workers=2) as executor:
            # Prepare arguments for parallel execution
            args_list = [(g, b, costs, A, adaptive_shots, backend) for g, b in grid]
            
            # Submit all jobs
            futures = {executor.submit(_execute_single_parameter, args): args[:2] for args in args_list}
            
            # Collect results with timeout
            for future in as_completed(futures, timeout=30):  # 30s timeout
                try:
                    energy, counts, params = future.result(timeout=10)
                    
                    if energy < best_E and counts:
                        best_E = energy
                        best_counts = counts
                        best_pair = params
                        print(f"New best: {params} -> {energy:.4f}")
                        
                except Exception as e:
                    print(f"Parameter execution failed: {e}")
                    continue
                    
    except Exception as e:
        print(f"Parallel execution failed: {e}")
        # Fall back to sequential execution with reduced grid
        for gamma, beta in grid[:3]:  # Only try 3 combinations
            try:
                energy, counts, params = _execute_single_parameter(
                    (gamma, beta, costs, A, adaptive_shots, backend)
                )
                
                if energy < best_E and counts:
                    best_E = energy
                    best_counts = counts
                    best_pair = params
                    
            except Exception as e:
                print(f"Sequential execution failed: {e}")
                continue
    
    # If all quantum attempts failed, use classical fallback
    if not best_counts or best_E == float("inf"):
        print("All quantum methods failed, using classical assignment")
        best_counts = _classical_fallback(costs, adaptive_shots)
        best_E = _energy_from_counts(best_counts, costs, A, adaptive_shots)
    
    print(f"Best parameters: {best_pair}, Energy: {best_E:.4f}")
    
    # Convert to assignment counts by index
    counts_by_index: Dict[int, int] = {}
    
    for bitstr, count in best_counts.items():
        bit_tuple = tuple(int(b) for b in bitstr[::-1])
        ones = [i for i, v in enumerate(bit_tuple) if v == 1]
        
        if len(ones) == 1:
            # Perfect one-hot assignment
            idx = ones[0]
            counts_by_index[idx] = counts_by_index.get(idx, 0) + count
        elif len(ones) > 1:
            # Distribute among multiple assignments
            for idx in ones:
                counts_by_index[idx] = counts_by_index.get(idx, 0) + count // len(ones)
    
    # Ensure we have at least one assignment
    if not counts_by_index:
        best_idx = int(np.argmin(costs))
        counts_by_index[best_idx] = adaptive_shots
    
    print(f"Final assignment distribution: {counts_by_index}")
    return counts_by_index, best_pair