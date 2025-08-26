const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'

export async function fetchTrucks() {
  const res = await fetch(`${API_BASE}/api/trucks`)
  if (!res.ok) throw new Error('Failed to fetch trucks')
  const data = await res.json()
  return data.trucks || []
}

export async function fetchTruck(id){
  const res = await fetch(`${API_BASE}/api/trucks/${id}`)
  if(!res.ok) throw new Error('Failed to fetch truck')
  const data = await res.json()
  return data.truck
}

export default { fetchTrucks, fetchTruck }
