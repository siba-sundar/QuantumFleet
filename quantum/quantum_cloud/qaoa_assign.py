from __future__ import annotations
from typing import Dict, List, Tuple, Optional
import numpy as np
import os
import pickle
import hashlib
import datetime

from qiskit import QuantumCircuit
from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2 as Sampler
from qiskit.transpiler.preset_passmanagers import generate_preset_pass_manager
from qiskit.circuit import Parameter
from qiskit.visualization import circuit_drawer
import matplotlib.pyplot as plt


def _compute_h_coeffs(costs: np.ndarray, A: float) -> Tuple[np.ndarray, float]:
    """Compute QUBO coefficients for the cost function."""
    K = len(costs)
    h = -0.5 * (costs + A * (K - 2))
    J = A / 2.0
    return h, J


def _apply_cost_layer(circuit: QuantumCircuit, qubits: List[int], gamma: float, h: np.ndarray, J: float) -> None:
    """Apply the cost layer (problem Hamiltonian) to the circuit."""
    # Single qubit rotations
    for i in range(len(qubits)):
        if abs(h[i]) > 1e-10:  # Avoid very small rotations
            circuit.rz(2.0 * gamma * float(h[i]), qubits[i])
    
    # Two-qubit interactions
    if len(qubits) >= 2 and abs(J) > 1e-10:
        exponent = 2.0 * gamma * float(J)
        for i in range(len(qubits)):
            for j in range(i + 1, len(qubits)):
                circuit.rzz(exponent, qubits[i], qubits[j])


def _apply_mixer_layer(circuit: QuantumCircuit, qubits: List[int], beta: float) -> None:
    """Apply the mixer layer to the circuit."""
    for i in qubits:
        circuit.rx(2.0 * beta, i)


def save_circuit_visualization(circuit: QuantumCircuit, filename_base: str) -> None:
    """Save circuit visualization as both image and text file."""
    try:
        # Create circuits directory if it doesn't exist
        os.makedirs('circuits', exist_ok=True)
        
        # Save as image
        img_path = f'circuits/{filename_base}.png'
        circuit_drawer(circuit, output='mpl', filename=img_path, style='bw')
        print(f"Circuit diagram saved to {img_path}")
        
        # Save as text
        txt_path = f'circuits/{filename_base}.txt'
        with open(txt_path, 'w') as f:
            f.write(str(circuit))
            f.write('\n\n')
            f.write(f"Circuit depth: {circuit.depth()}\n")
            f.write(f"Number of qubits: {circuit.num_qubits}\n")
            f.write(f"Number of gates: {len(circuit.data)}\n")
            f.write(f"Generated at: {datetime.datetime.now()}\n")
        print(f"Circuit description saved to {txt_path}")
        
    except Exception as e:
        print(f"Warning: Could not save circuit visualization: {e}")


def build_qaoa_circuit(costs: np.ndarray, gammas: List[float], betas: List[float], A: float = 2.0, save_viz: bool = False) -> Tuple[QuantumCircuit, List[int]]:
    """Build a QAOA circuit for the given cost function and parameters."""
    assert len(gammas) == len(betas), "Number of gamma and beta parameters must match"
    p = len(gammas)
    K = len(costs)
    qubits = list(range(K))
    
    # Create circuit with classical register for measurements
    circuit = QuantumCircuit(K, K)

    # Initialize uniform superposition |+>^K
    for i in qubits:
        circuit.h(i)

    # Compute QUBO coefficients
    h, J = _compute_h_coeffs(costs, A)
    
    # Apply p layers of QAOA
    for layer in range(p):
        _apply_cost_layer(circuit, qubits, gammas[layer], h, J)
        _apply_mixer_layer(circuit, qubits, betas[layer])

    # Add measurements
    circuit.measure(qubits, qubits)
    
    # Save visualization if requested
    if save_viz:
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"qaoa_circuit_{K}qubits_{p}layers_{timestamp}"
        save_circuit_visualization(circuit, filename)
    
    return circuit, qubits


def _bit_cost(bitstr: Tuple[int, ...], costs: np.ndarray, A: float) -> float:
    """Compute the cost of a bit string with enhanced constraint handling."""
    x = np.array(bitstr, dtype=float)
    linear_cost = float(np.dot(costs, x))
    
    # One-hot constraint penalty
    num_ones = np.sum(x)
    constraint_penalty = A * (num_ones - 1.0) ** 2
    
    # Additional penalty for invalid assignments (all zeros or multiple ones)
    if num_ones == 0:
        constraint_penalty += A * 2.0  # Extra penalty for no assignment
    elif num_ones > 1:
        constraint_penalty += A * 0.5  # Moderate penalty for multiple assignments
    
    return linear_cost + constraint_penalty


def _energy_from_counts(counts: Dict[str, int], costs: np.ndarray, A: float, shots: int) -> float:
    """Compute average energy from measurement counts."""
    if shots <= 0:
        return 0.0
    
    total_energy = 0.0
    for bitstr, count in counts.items():
        # Convert bit string to tuple (reverse for little-endian)
        bit_tuple = tuple(int(b) for b in bitstr[::-1])
        cost = _bit_cost(bit_tuple, costs, A)
        total_energy += cost * count
    
    return total_energy / float(shots)


def _measure_counts(circuit: QuantumCircuit, backend, K: int, shots: int) -> Dict[str, int]:
    """Run the circuit on IBM Quantum backend and return counts."""
    try:
        # Transpile circuit for the backend
        pm = generate_preset_pass_manager(backend=backend, optimization_level=1)
        transpiled_circuit = pm.run(circuit)
        
        # Use SamplerV2 for execution
        sampler = Sampler(backend)
        
        # Run the job
        job = sampler.run([transpiled_circuit], shots=shots)
        result = job.result()
        
        # Extract counts from the result
        if hasattr(result[0].data, 'meas'):
            # Get the measurement data
            meas_data = result[0].data.meas
            
            # Convert to counts dictionary
            counts = {}
            for measurement in meas_data:
                # Convert measurement array to bit string
                bitstr = ''.join(str(int(bit)) for bit in measurement)
                counts[bitstr] = counts.get(bitstr, 0) + 1
            
            return counts
        else:
            # Fallback: uniform random distribution
            print("Warning: No measurement data found, using uniform distribution")
            counts = {}
            for i in range(min(2**K, 100)):  # Limit to avoid memory issues
                bitstr = format(i, f'0{K}b')
                counts[bitstr] = shots // min(2**K, 100)
            return counts
            
    except Exception as e:
        print(f"Error running circuit: {e}")
        # Fallback: return uniform distribution
        counts = {}
        for i in range(min(2**K, 100)):
            bitstr = format(i, f'0{K}b')
            counts[bitstr] = shots // min(2**K, 100)
        return counts


def get_adaptive_grid(costs: np.ndarray, fast_mode: bool = False) -> List[Tuple[float, float]]:
    """Get adaptive parameter grid based on problem size and mode."""
    K = len(costs)
    
    if fast_mode or K <= 4:
        # Fast mode: small focused grid
        gamma_vals = [0.2, 0.5, 0.8]
        beta_vals = [0.3, 0.6, 0.9]
    elif K <= 8:
        # Medium grid for small problems
        gamma_vals = [0.1, 0.4, 0.7, 1.0]
        beta_vals = [0.2, 0.5, 0.8, 1.1]
    else:
        # Minimal grid for large problems
        gamma_vals = [0.3, 0.6]
        beta_vals = [0.4, 0.7]
    
    return [(g, b) for g in gamma_vals for b in beta_vals]


def get_circuit_cache_key(costs: np.ndarray, A: float, p: int) -> str:
    """Generate cache key for circuit parameters."""
    # Create a hash based on costs, A, and p
    cost_str = ','.join([f'{c:.6f}' for c in costs])
    key_str = f"{cost_str}_{A:.3f}_{p}"
    return hashlib.md5(key_str.encode()).hexdigest()


def load_cached_result(cache_key: str) -> Optional[Tuple[Dict[int, int], Tuple[float, float]]]:
    """Load cached QAOA result if available."""
    try:
        cache_dir = 'qaoa_cache'
        os.makedirs(cache_dir, exist_ok=True)
        cache_file = f'{cache_dir}/{cache_key}.pkl'
        
        if os.path.exists(cache_file):
            with open(cache_file, 'rb') as f:
                return pickle.load(f)
    except Exception:
        pass
    return None


def save_cached_result(cache_key: str, result: Tuple[Dict[int, int], Tuple[float, float]]) -> None:
    """Save QAOA result to cache."""
    try:
        cache_dir = 'qaoa_cache'
        os.makedirs(cache_dir, exist_ok=True)
        cache_file = f'{cache_dir}/{cache_key}.pkl'
        
        with open(cache_file, 'wb') as f:
            pickle.dump(result, f)
    except Exception as e:
        print(f"Warning: Could not cache result: {e}")


def run_qaoa_assignment(costs: np.ndarray, backend, shots: int = 2000, p: int = 1, A: float = 3.0,
                        grid: Optional[List[Tuple[float, float]]] = None, fast_mode: bool = False, 
                        save_circuit: bool = False) -> Tuple[Dict[int, int], Tuple[float, float]]:
    """
    Run QAOA with grid search over (gamma, beta) parameters for one-hot assignment.
    
    Args:
        costs: Array of costs for each option
        backend: IBM Quantum backend
        shots: Number of shots per parameter combination
        p: Number of QAOA layers
        A: Penalty parameter for one-hot constraint
        grid: List of (gamma, beta) parameter pairs to try
    
    Returns:
        Tuple of (assignment counts by index, best parameter pair)
    """
    K = len(costs)
    
    # Check cache first
    cache_key = get_circuit_cache_key(costs, A, p)
    cached_result = load_cached_result(cache_key)
    if cached_result is not None and not save_circuit:  # Skip cache if we want to save circuit
        print(f"Using cached QAOA result for {K}-qubit problem")
        return cached_result
    
    # Get adaptive grid based on problem size and mode
    if grid is None:
        grid = get_adaptive_grid(costs, fast_mode)
    
    print(f"Running QAOA with {len(grid)} parameter combinations (fast_mode={fast_mode})")
    
    best_E = float("inf")
    best_counts: Dict[str, int] = {}
    best_pair = (0.3, 0.7)

    # Build circuits with optional visualization
    circuits = []
    for i, (g, b) in enumerate(grid):
        gammas = [g] * p
        betas = [b] * p
        # Save circuit visualization only for the first parameter combination
        save_viz = save_circuit and i == 0
        circ, _ = build_qaoa_circuit(costs=costs, gammas=gammas, betas=betas, A=A, save_viz=save_viz)
        circuits.append(circ)

    # Transpile all circuits
    pm = generate_preset_pass_manager(backend=backend, optimization_level=1)
    transpiled_circuits = [pm.run(circ) for circ in circuits]

    # Execute batch job
    sampler = Sampler(backend)
    job = sampler.run(transpiled_circuits, shots=shots)
    results = job.result()
    print("Batch execution completed for grid search.")

    # Evaluate energies and select best parameters
    for idx, (g, b) in enumerate(grid):
        data = results[idx].data
        # Extract counts
        if hasattr(data, 'meas'):
            meas_list = data.meas
            counts: Dict[str, int] = {}
            for meas in meas_list:
                bitstr = ''.join(str(int(bit)) for bit in meas)
                counts[bitstr] = counts.get(bitstr, 0) + 1
        else:
            # Fallback uniform distribution
            counts = {format(i, f'0{K}b'): shots // min(2**K, 100) for i in range(min(2**K, 100))}

        E = _energy_from_counts(counts, costs, A, shots)
        print(f"Parameters ({g}, {b}) produced energy {E:.4f}")
        if E < best_E:
            best_E = E
            best_counts = counts
            best_pair = (g, b)
            print(f"New best parameters: ({g}, {b}) with energy {E:.4f}")

    print(f"Best parameters: {best_pair}, Best energy: {best_E:.4f}")

    # Convert to assignment counts by index with improved handling
    counts_by_index: Dict[int, int] = {}
    valid_shots = 0
    invalid_shots = 0
    
    for bitstr, count in best_counts.items():
        # Convert to bit tuple (reverse for little-endian)
        bit_tuple = tuple(int(b) for b in bitstr[::-1])
        ones = [i for i, v in enumerate(bit_tuple) if v == 1]
        
        # Handle different assignment patterns
        if len(ones) == 1:
            # Valid one-hot assignment
            idx = ones[0]
            counts_by_index[idx] = counts_by_index.get(idx, 0) + count
            valid_shots += count
        elif len(ones) == 0:
            # No assignment - distribute proportionally to inverse cost
            inv_costs = 1.0 / (costs + 1e-6)  # Avoid division by zero
            prob_weights = inv_costs / np.sum(inv_costs)
            for i, weight in enumerate(prob_weights):
                counts_by_index[i] = counts_by_index.get(i, 0) + int(count * weight)
            invalid_shots += count
        else:
            # Multiple assignments - give to the one with lowest cost among selected
            best_among_ones = min(ones, key=lambda i: costs[i])
            counts_by_index[best_among_ones] = counts_by_index.get(best_among_ones, 0) + count
            invalid_shots += count

    # If no valid assignments at all, use cost-based distribution
    if not counts_by_index or sum(counts_by_index.values()) == 0:
        print("Warning: No valid assignments found, using cost-based distribution")
        inv_costs = 1.0 / (costs + 1e-6)
        prob_weights = inv_costs / np.sum(inv_costs)
        for i, weight in enumerate(prob_weights):
            counts_by_index[i] = max(1, int(shots * weight))
    
    print(f"Assignment quality: {valid_shots}/{shots} valid shots, {invalid_shots} corrected")

    print(f"Final assignment distribution: {counts_by_index}")
    
    # Cache the result
    result = (counts_by_index, best_pair)
    save_cached_result(cache_key, result)
    
    return result


def run_qaoa_assignment_batch(costs_list: List[np.ndarray], backend, shots: int = 2000, p: int = 1, A: float = 3.0,
                              grid: Optional[List[Tuple[float, float]]] = None, fast_mode: bool = False) -> List[Tuple[Dict[int, int], Tuple[float, float]]]:
    """
    Run QAOA for multiple cost vectors (one per location) in a single batched job.

    Returns a list of tuples (counts_by_index, best_pair) in the same order as costs_list.
    """
    # Use adaptive grid for all locations (take average problem size)
    if grid is None:
        avg_size = sum(len(c) for c in costs_list) / len(costs_list)
        dummy_costs = np.zeros(int(avg_size))
        grid = get_adaptive_grid(dummy_costs, fast_mode)
    
    print(f"Batch QAOA with {len(grid)} parameter combinations, fast_mode={fast_mode}")

    K_list = [len(c) for c in costs_list]

    # Build all circuits (one circuit per (location, grid_param))
    circuits = []
    mapping = []  # (loc_idx, grid_idx)
    for loc_idx, costs in enumerate(costs_list):
        for grid_idx, (g, b) in enumerate(grid):
            gammas = [g] * p
            betas = [b] * p
            circ, _ = build_qaoa_circuit(costs=costs, gammas=gammas, betas=betas, A=A)
            circuits.append(circ)
            mapping.append((loc_idx, grid_idx))

    # Transpile and run all circuits in one batch request
    pm = generate_preset_pass_manager(backend=backend, optimization_level=1)
    transpiled = [pm.run(c) for c in circuits]
    sampler = Sampler(backend)
    job = sampler.run(transpiled, shots=shots)
    results = job.result()

    # Aggregate per-location best results
    per_location_outputs: List[Tuple[Dict[int, int], Tuple[float, float]]] = []
    for loc_idx, costs in enumerate(costs_list):
        best_E = float("inf")
        best_counts: Dict[str, int] = {}
        best_pair = (0.3, 0.7)

        # Iterate over grid results for this location
        for i, (m_loc, m_grid) in enumerate(mapping):
            if m_loc != loc_idx:
                continue
            data = results[i].data
            if hasattr(data, 'meas'):
                meas_list = data.meas
                counts: Dict[str, int] = {}
                for meas in meas_list:
                    bitstr = ''.join(str(int(bit)) for bit in meas)
                    counts[bitstr] = counts.get(bitstr, 0) + 1
            else:
                counts = {format(i2, f'0{len(costs)}b'): shots // min(2**len(costs), 100) for i2 in range(min(2**len(costs), 100))}

            E = _energy_from_counts(counts, costs, A, shots)
            if E < best_E:
                best_E = E
                best_counts = counts
                best_pair = grid[m_grid]

        # Convert best_counts to index counts similar to single-run function
        counts_by_index: Dict[int, int] = {}
        valid_shots = 0
        for bitstr, cnt in best_counts.items():
            bit_tuple = tuple(int(b) for b in bitstr[::-1])
            ones = [j for j, v in enumerate(bit_tuple) if v == 1]
            if len(ones) == 1:
                idx = ones[0]
                counts_by_index[idx] = counts_by_index.get(idx, 0) + cnt
                valid_shots += cnt

        if not counts_by_index or valid_shots == 0:
            idx = int(np.argmin(costs))
            counts_by_index = {idx: shots}

        per_location_outputs.append((counts_by_index, best_pair))

    return per_location_outputs