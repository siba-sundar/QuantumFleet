// Express backend for IndiFleet components
import express from "express";
import cors from "cors";
const app = express();
app.use(cors());
app.use(express.json());


// In-memory storage for demo
let trucks = [];
let routes = [];
let delays = [];
let detours = [];
let thirdPartyBookings = [];

// AddTruck
app.post('/api/trucks', (req, res) => {
  const { maxCapacity, routeId } = req.body;
  const truckId = trucks.length + 1;
  const truck = {
    truckId,
    maxCapacity: Number(maxCapacity),
    currentLoad: 0,

    routeId: Number(routeId),
    isDelayed: false,
    gpsStatus: 'OK',
    schedule: [],
    loadUnload: [],
  };
  trucks.push(truck);
  res.json({ message: 'Truck added', truck });
});

// AddRoute
app.post('/api/routes', (req, res) => {
  const { touchpoints, loadUnloadPoints, maxCapacity } = req.body;
  const routeId = routes.length + 1;
  const route = {
    routeId,
    touchpoints: Array.isArray(touchpoints) ? touchpoints : (typeof touchpoints === 'string' ? touchpoints.split(',') : []),
    loadUnloadPoints: Array.isArray(loadUnloadPoints) ? loadUnloadPoints.map(Number) : (typeof loadUnloadPoints === 'string' ? loadUnloadPoints.split(',').map(Number) : []),
    maxCapacity: Number(maxCapacity)
  };
  routes.push(route);
  res.json({ message: 'Route added', route });
});

// UpdateLoadUnload
app.post('/api/trucks/:id/load-unload', (req, res) => {
  const truckId = Number(req.params.id);
  const { touchpointIndex, unloadAmount, loadAmount } = req.body;
  const truck = trucks.find(t => t.truckId === truckId);
  if (!truck) return res.status(404).json({ error: 'Truck not found' });
  truck.loadUnload.push({ touchpointIndex: Number(touchpointIndex), unloadAmount: Number(unloadAmount), loadAmount: Number(loadAmount) });
  truck.currentLoad = truck.currentLoad - Number(unloadAmount) + Number(loadAmount);
  res.json({ message: 'Load/Unload updated', truck });
});

// ReportDelay
app.post('/api/trucks/:id/delay', (req, res) => {
  const truckId = Number(req.params.id);
  const { reason, timeDelayed } = req.body;
  const truck = trucks.find(t => t.truckId === truckId);
  if (!truck) return res.status(404).json({ error: 'Truck not found' });
  truck.isDelayed = true;
  delays.push({ truckId, reason, timeDelayed: Number(timeDelayed) });
  res.json({ message: 'Delay reported', truck });
});

// ReportDetour
app.post('/api/trucks/:id/detour', (req, res) => {
  const truckId = Number(req.params.id);
  const { detourPoint } = req.body;
  const truck = trucks.find(t => t.truckId === truckId);
  if (!truck) return res.status(404).json({ error: 'Truck not found' });
  detours.push({ truckId, detourPoint });
  res.json({ message: 'Detour reported', truck });
});

// BookThirdPartyCapacity
app.post('/api/third-party/book', (req, res) => {
  const { truckId, capacity } = req.body;
  const truck = trucks.find(t => t.truckId === Number(truckId));
  if (!truck) return res.status(404).json({ error: 'Truck not found' });
  thirdPartyBookings.push({ truckId: Number(truckId), capacity: Number(capacity) });
  res.json({ message: 'Third-party capacity booked', truckId, capacity });
});

// UpdateSchedule
app.post('/api/trucks/:id/schedule', (req, res) => {
  const truckId = Number(req.params.id);
  const { arrivalTimes } = req.body;
  const truck = trucks.find(t => t.truckId === truckId);
  if (!truck) return res.status(404).json({ error: 'Truck not found' });
  truck.schedule = Array.isArray(arrivalTimes) ? arrivalTimes.map(Number) : (typeof arrivalTimes === 'string' ? arrivalTimes.split(',').map(Number) : []);
  res.json({ message: 'Schedule updated', truck });
});

// UpdateGPSStatus
app.post('/api/trucks/:id/gps', (req, res) => {
  const truckId = Number(req.params.id);
  const { status } = req.body;
  const truck = trucks.find(t => t.truckId === truckId);
  if (!truck) return res.status(404).json({ error: 'Truck not found' });
  truck.gpsStatus = status;
  res.json({ message: 'GPS status updated', truck });
});

// GetTruckInfo
app.get('/api/trucks/:id', (req, res) => {
  const truckId = Number(req.params.id);
  const truck = trucks.find(t => t.truckId === truckId);
  if (!truck) return res.status(404).json({ error: 'Truck not found' });
  res.json({ message: 'Truck info', truck });
});

// GetRouteInfo
app.get('/api/routes/:id', (req, res) => {
  const routeId = Number(req.params.id);
  const route = routes.find(r => r.routeId === routeId);
  if (!route) return res.status(404).json({ error: 'Route not found' });
  res.json({ message: 'Route info', route });
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API server running on port ${PORT}`));
