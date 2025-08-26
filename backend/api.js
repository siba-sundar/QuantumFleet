// Express backend for IndiFleet components
import express from "express";
import cors from "cors";
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Import GPS tracking services
import gpsRoutes from './src/routes/gpsRoutes.js';
import webSocketService from './src/services/webSocketService.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

// Initialize WebSocket service
webSocketService.initialize(server);

app.use(cors());
app.use(express.json());

// Authentication endpoints for testing
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, userType, profileData } = req.body;
    
    // Basic validation
    if (!email || !password || !userType) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and user type are required'
      });
    }
    
    // For testing purposes, we'll create a mock response
    // In a real implementation, this would use Firebase Admin SDK
    const mockUser = {
      uid: 'mock_' + Date.now(),
      email,
      userType,
      createdAt: new Date().toISOString()
    };
    
    console.log('Mock user registration:', mockUser);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully (mock)',
      user: mockUser
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }
    
    // Mock login for testing
    const mockUser = {
      uid: 'mock_login_' + Date.now(),
      email,
      userType: 'business', // Mock user type
      lastLogin: new Date().toISOString()
    };
    
    console.log('Mock user login:', mockUser);
    
    res.json({
      success: true,
      message: 'Login successful (mock)',
      user: mockUser
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

// Data retrieval endpoints for testing
app.get('/api/users', async (req, res) => {
  try {
    // Mock response - in real implementation would fetch from Firebase
    const mockUsers = [
      {
        id: 'user1',
        email: 'business@indifleet.com',
        userType: 'business',
        createdAt: new Date().toISOString()
      },
      {
        id: 'user2',
        phoneNumber: '+919876543210',
        userType: 'driver',
        createdAt: new Date().toISOString()
      },
      {
        id: 'user3',
        email: 'postal@indifleet.com',
        userType: 'postal',
        createdAt: new Date().toISOString()
      }
    ];
    
    res.json({
      success: true,
      users: mockUsers,
      count: mockUsers.length
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

app.get('/api/business-profiles', async (req, res) => {
  try {
    const mockProfiles = [
      {
        id: 'business1',
        companyName: 'IndiFleet Test Company',
        email: 'business@indifleet.com',
        phoneNumber: '+919876543211',
        address: '123 Business Street, Mumbai',
        registrationStatus: 'approved'
      }
    ];
    
    res.json({
      success: true,
      profiles: mockProfiles,
      count: mockProfiles.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch business profiles'
    });
  }
});

app.get('/api/tracking-sessions', async (req, res) => {
  try {
    const mockSessions = [
      {
        sessionId: 'TS_' + Date.now(),
        vehicleId: 'VH_001',
        routeId: 'RT_MUM_DEL_001',
        status: 'active',
        driverPhone: '+919876543210',
        startLocation: {
          latitude: 19.0760,
          longitude: 72.8877,
          address: 'Mumbai, Maharashtra'
        },
        destinationLocation: {
          latitude: 28.6139,
          longitude: 77.2090,
          address: 'Delhi, India'
        }
      }
    ];
    
    res.json({
      success: true,
      sessions: mockSessions,
      count: mockSessions.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tracking sessions'
    });
  }
});


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

// List all trucks
app.get('/api/trucks', (req, res) => {
  res.json({ message: 'Trucks list', trucks });
});

// GetRouteInfo
app.get('/api/routes/:id', (req, res) => {
  const routeId = Number(req.params.id);
  const route = routes.find(r => r.routeId === routeId);
  if (!route) return res.status(404).json({ error: 'Route not found' });
  res.json({ message: 'Route info', route });
});

// List all routes
app.get('/api/routes', (req, res) => {
  res.json({ message: 'Routes list', routes });
});

// Dev: Seed trucks with full objects (driver, number, status, image, etc.)
// This endpoint is for testing and won't be present in production.
app.post('/api/seed-trucks', (req, res) => {
  const payload = req.body;
  const items = Array.isArray(payload) ? payload : [payload];
  const added = [];
  items.forEach(item => {
    const truckId = trucks.length + 1;
    const truck = {
      truckId,
      maxCapacity: Number(item.maxCapacity || 0),
      currentLoad: Number(item.currentLoad || 0),
      routeId: Number(item.routeId || 0),
      isDelayed: item.isDelayed || false,
      gpsStatus: item.gpsStatus || 'OK',
      schedule: Array.isArray(item.schedule) ? item.schedule : [],
      loadUnload: Array.isArray(item.loadUnload) ? item.loadUnload : [],
      // optional display fields used by frontend
      number: item.number || null,
      driver: item.driver || null,
      status: item.status || null,
      image: item.image || null,
    };
    trucks.push(truck);
    added.push(truck);
  });
  res.json({ message: 'Seeded trucks', added });
});

// GPS Tracking Routes
app.use('/api/tracking', gpsRoutes);

// Serve driver tracking page
app.get('/track/:sessionId', (req, res) => {
  // In production, this would serve the built React app
  // For development, redirect to frontend URL
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  res.redirect(`${frontendUrl}/track/${req.params.sessionId}`);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const stats = webSocketService.getConnectionStats();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    webSocket: stats,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

// Start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 IndiFleet API server running on port ${PORT}`);
  console.log(`📍 GPS Tracking enabled`);
  console.log(`🔌 WebSocket server initialized`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
