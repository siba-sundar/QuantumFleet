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
import gpsTrackingService from './src/services/gpsTrackingService.js';

// Import Firebase repositories
import { TruckReservationRepository } from './src/repositories/TruckReservationRepository.js';
import { BaseRepository } from './src/repositories/BaseRepository.js';
import { SentimentRepository, EnhancedDriverRepository } from './src/repositories/SentimentRepository.js';
import { LocationCacheRepository } from './src/repositories/LocationCacheRepository.js';
// Use backend BaseRepository for business profiles to avoid importing frontend code

// Import sentiment analysis service
import SentimentAnalysisService from './src/services/sentimentAnalysisService.js';

// Import enhanced truck models
import { TruckDataTransformers } from './src/models/enhancedTruckModels.js';

// Load environment variables
dotenv.config();

// Initialize repositories
const truckReservationRepo = new TruckReservationRepository();
const trucksRepo = new BaseRepository('trucks');
const routesRepo = new BaseRepository('routes');
const usersRepo = new BaseRepository('users');
const businessProfilesRepo = new BaseRepository('businessProfiles');
const driverProfilesRepo = new BaseRepository('driverProfiles');
const postalProfilesRepo = new BaseRepository('postalProfiles');
const sentimentRepo = new SentimentRepository();
const enhancedDriverRepo = new EnhancedDriverRepository();
const locationCacheRepo = new LocationCacheRepository();

// Initialize services
const sentimentAnalysisService = new SentimentAnalysisService();

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
    const { email, password, userType, profileData, phoneNumber } = req.body;
    
    // Basic validation
    if (!userType) {
      return res.status(400).json({
        success: false,
        error: 'User type is required'
      });
    }
    
    if (!email && !phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Email or phone number is required'
      });
    }
    
    // Create user record
    const userData = {
      email: email || null,
      phoneNumber: phoneNumber || null,
      userType,
      isActive: true,
      isEmailVerified: false,
      isPhoneVerified: false,
      lastLogin: new Date(),
      profileData: profileData || {}
    };
    
    const user = await usersRepo.create(userData);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        userType: user.userType
      }
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
    const { email, phoneNumber, password } = req.body;
    
    if (!email && !phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Email or phone number is required'
      });
    }
    
    // Find user by email or phone
    let users = [];
    if (email) {
      users = await usersRepo.findWhere([{ field: 'email', operator: '==', value: email }]);
    } else if (phoneNumber) {
      users = await usersRepo.findWhere([{ field: 'phoneNumber', operator: '==', value: phoneNumber }]);
    }
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const user = users[0];
    
    // Update last login
    await usersRepo.update(user.id, { lastLogin: new Date() });
    
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        userType: user.userType,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

// User profile management
app.get('/api/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await usersRepo.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        userType: user.userType,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user'
    });
  }
});

app.patch('/api/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const updateData = req.body;
    
    // Remove sensitive fields from update
    delete updateData.password;
    delete updateData.id;
    
    const updatedUser = await usersRepo.update(userId, updateData);
    
    res.json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user'
    });
  }
});

// Business Profile Management

// Get all business profiles (for super admin)
app.get('/api/business-profiles', async (req, res) => {
  try {
    const profiles = await businessProfilesRepo.findAll('createdAt', 'desc');
    
    res.json({
      success: true,
      profiles,
      count: profiles.length
    });
  } catch (error) {
    console.error('Error fetching business profiles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch business profiles'
    });
  }
});

// Create business profile
app.post('/api/business-profiles', async (req, res) => {
  try {
    const { uid, personalInfo, businessInfo, address } = req.body;
    
    if (!uid) {
      return res.status(400).json({
        success: false,
        error: 'User UID is required'
      });
    }
    
    const profileData = {
      personalInfo: personalInfo || {},
      businessInfo: businessInfo || {},
      address: address || {},
      registrationStatus: 'completed'
    };
    
    const profile = await businessProfilesRepo.createWithId(uid, profileData);
    
    res.status(201).json({
      success: true,
      message: 'Business profile created successfully',
      profile
    });
  } catch (error) {
    console.error('Error creating business profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create business profile'
    });
  }
});

// Get business profile by UID
app.get('/api/business-profiles/:uid', async (req, res) => {
  try {
    const uid = req.params.uid;
    const profile = await businessProfilesRepo.findById(uid);
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Business profile not found'
      });
    }
    
    res.json({
      success: true,
      profile
    });
  } catch (error) {
    console.error('Error fetching business profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch business profile'
    });
  }
});

// Update business profile
app.patch('/api/business-profiles/:uid', async (req, res) => {
  try {
    const uid = req.params.uid;
    const updateData = req.body;
    
    const updatedProfile = await businessProfilesRepo.update(uid, updateData);
    
    res.json({
      success: true,
      message: 'Business profile updated successfully',
      profile: updatedProfile
    });
  } catch (error) {
    console.error('Error updating business profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update business profile'
    });
  }
});

// List business profiles (for postal/admin)
app.get('/api/business-profiles', async (req, res) => {
  try {
    const { limit, postalBranch, businessType } = req.query;
    
    let conditions = [];
    if (postalBranch) {
      conditions.push({ field: 'businessInfo.postalBranchName', operator: '==', value: postalBranch });
    }
    if (businessType) {
      conditions.push({ field: 'businessInfo.businessType', operator: '==', value: businessType });
    }
    
    const profiles = await businessProfilesRepo.findWhere(
      conditions,
      'createdAt',
      'desc',
      limit ? Number(limit) : null
    );
    
    res.json({
      success: true,
      profiles,
      count: profiles.length
    });
  } catch (error) {
    console.error('Error fetching business profiles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch business profiles'
    });
  }
});

// Driver Profile Management

// Create driver profile
app.post('/api/driver-profiles', async (req, res) => {
  try {
    const { uid, personalInfo, address, licenseInfo, background, professionalInfo } = req.body;
    
    if (!uid) {
      return res.status(400).json({
        success: false,
        error: 'User UID is required'
      });
    }
    
    const profileData = {
      personalInfo: personalInfo || {},
      address: address || {},
      licenseInfo: licenseInfo || {},
      background: background || {},
      professionalInfo: professionalInfo || {},
      registrationStatus: 'pending'
    };
    
    const profile = await driverProfilesRepo.createWithId(uid, profileData);
    
    res.status(201).json({
      success: true,
      message: 'Driver profile created successfully',
      profile
    });
  } catch (error) {
    console.error('Error creating driver profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create driver profile'
    });
  }
});

// Get driver profile by UID
app.get('/api/driver-profiles/:uid', async (req, res) => {
  try {
    const uid = req.params.uid;
    const profile = await driverProfilesRepo.findById(uid);
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Driver profile not found'
      });
    }
    
    res.json({
      success: true,
      profile
    });
  } catch (error) {
    console.error('Error fetching driver profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch driver profile'
    });
  }
});

// Update driver profile
app.patch('/api/driver-profiles/:uid', async (req, res) => {
  try {
    const uid = req.params.uid;
    const updateData = req.body;
    
    const updatedProfile = await driverProfilesRepo.update(uid, updateData);
    
    res.json({
      success: true,
      message: 'Driver profile updated successfully',
      profile: updatedProfile
    });
  } catch (error) {
    console.error('Error updating driver profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update driver profile'
    });
  }
});

// List driver profiles (for postal/admin)
app.get('/api/driver-profiles', async (req, res) => {
  try {
    const { limit, status, verified, stateOfIssue } = req.query;
    
    let conditions = [];
    if (status) {
      conditions.push({ field: 'registrationStatus', operator: '==', value: status });
    }
    if (verified === 'true') {
      conditions.push({ field: 'isPhoneVerified', operator: '==', value: true });
    }
    if (stateOfIssue) {
      conditions.push({ field: 'licenseInfo.stateOfIssue', operator: '==', value: stateOfIssue });
    }
    
    const profiles = await driverProfilesRepo.findWhere(
      conditions,
      'createdAt',
      'desc',
      limit ? Number(limit) : null
    );
    
    res.json({
      success: true,
      profiles,
      count: profiles.length
    });
  } catch (error) {
    console.error('Error fetching driver profiles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch driver profiles'
    });
  }
});

// Update driver professional info
app.patch('/api/driver-profiles/:uid/professional', async (req, res) => {
  try {
    const uid = req.params.uid;
    const { professionalInfo } = req.body;
    
    if (!professionalInfo) {
      return res.status(400).json({
        success: false,
        error: 'Professional information is required'
      });
    }
    
    const updatedProfile = await driverProfilesRepo.update(uid, {
      professionalInfo,
      registrationStatus: 'completed'
    });
    
    res.json({
      success: true,
      message: 'Professional information updated successfully',
      profile: updatedProfile
    });
  } catch (error) {
    console.error('Error updating professional info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update professional information'
    });
  }
});

// Get available drivers for truck assignment
app.get('/api/drivers/available', async (req, res) => {
  try {
    const { includeAssigned = 'false', includeSentiment = 'true' } = req.query;
    
    // Fetch all completed, approved, and pending driver profiles
    const completedConditions = [
      { field: 'registrationStatus', operator: '==', value: 'completed' }
    ];
    
    const approvedConditions = [
      { field: 'registrationStatus', operator: '==', value: 'approved' }
    ];
    
    const pendingConditions = [
      { field: 'registrationStatus', operator: '==', value: 'pending' }
    ];
    
    // Also include drivers with no registration status (legacy data)
    const noStatusConditions = [
      { field: 'registrationStatus', operator: '==', value: null }
    ];
    
    // Get completed, approved, pending, and no status drivers
    const [completedDrivers, approvedDrivers, pendingDrivers, noStatusDrivers] = await Promise.all([
      driverProfilesRepo.findWhere(completedConditions),
      driverProfilesRepo.findWhere(approvedConditions),
      driverProfilesRepo.findWhere(pendingConditions),
      driverProfilesRepo.findWhere(noStatusConditions)
    ]);
    
    // Combine all arrays and remove duplicates
    const allDriverProfiles = [...completedDrivers, ...approvedDrivers, ...pendingDrivers, ...noStatusDrivers]
      .filter((driver, index, self) => index === self.findIndex(d => d.id === driver.id));
    
    // Transform drivers for assignment selection
    const availableDrivers = await Promise.all(
      allDriverProfiles.map(async (profile) => {
        // Get driver name from profile - prioritize firstName/lastName, fallback to other fields
        let driverName = 'Unknown Driver';
        if (profile.firstName && profile.lastName) {
          driverName = `${profile.firstName} ${profile.lastName}`;
        } else if (profile.personalInfo?.firstName && profile.personalInfo?.lastName) {
          driverName = `${profile.personalInfo.firstName} ${profile.personalInfo.lastName}`;
        } else if (profile.firstName) {
          driverName = profile.firstName;
        } else if (profile.lastName) {
          driverName = profile.lastName;
        } else if (profile.personalInfo?.firstName) {
          driverName = profile.personalInfo.firstName;
        } else if (profile.personalInfo?.lastName) {
          driverName = profile.personalInfo.lastName;
        }
        
        const driver = {
          id: profile.id,
          name: driverName.trim(),
          phone: profile.phoneNumber || profile.personalInfo?.phone || profile.contactNumber,
          licenseNumber: profile.licenseInfo?.licenseNumber || profile.licenseNumber,
          licenseType: profile.licenseInfo?.licenseType,
          experience: profile.professionalInfo?.experience || profile.experience || 0,
          location: {
            state: profile.licenseInfo?.stateOfIssue || profile.address?.state,
            city: profile.address?.city
          },
          availability: {
            status: profile.availability?.status || 'available',
            lastAssigned: profile.availability?.lastAssigned || null,
            currentTruck: profile.availability?.currentTruck || null
          },
          profile: {
            rating: (4.0 + Math.random() * 1.0).toFixed(1), // Mock rating for now
            totalTrips: Math.round(10 + Math.random() * 40),
            safetyScore: (75 + Math.random() * 25).toFixed(1)
          }
        };
        
        // Add sentiment data if requested
        if (includeSentiment === 'true') {
          try {
            const sentimentData = await sentimentAnalysisService.getCurrentSentiment(profile.id);
            if (sentimentData.hasSentimentData) {
              driver.sentiment = {
                score: sentimentData.currentScore,
                label: sentimentData.currentLabel,
                lastUpdated: sentimentData.lastUpdated
              };
            }
          } catch (error) {
            console.warn(`Failed to get sentiment for driver ${profile.id}:`, error.message);
            driver.sentiment = {
              score: null,
              label: 'No Data',
              lastUpdated: null
            };
          }
        }
        
        return driver;
      })
    );
    
    // Filter out assigned drivers if includeAssigned is false
    const filteredDrivers = includeAssigned === 'false' 
      ? availableDrivers.filter(driver => driver.availability.status === 'available')
      : availableDrivers;
    
    // Sort by experience and sentiment score
    filteredDrivers.sort((a, b) => {
      const scoreA = (a.sentiment?.score || 50) + (a.experience * 2);
      const scoreB = (b.sentiment?.score || 50) + (b.experience * 2);
      return scoreB - scoreA;
    });
    
    res.json({
      success: true,
      drivers: filteredDrivers,
      count: filteredDrivers.length,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching available drivers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available drivers'
    });
  }
});

// Driver Assignment and Availability Endpoints

// Update driver assignment status
app.patch('/api/drivers/:id/assignment', async (req, res) => {
  try {
    const driverId = req.params.id;
    const { truckId, reservationId, status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Assignment status is required'
      });
    }
    
    // Update driver profile with assignment information
    const updateData = {
      'availability.status': status,
      'availability.lastAssigned': new Date(),
      'availability.currentTruck': truckId || null,
      'availability.currentReservation': reservationId || null
    };
    
    const updatedProfile = await driverProfilesRepo.update(driverId, updateData);
    
    res.json({
      success: true,
      message: 'Driver assignment updated successfully',
      driver: {
        id: driverId,
        status: status,
        assignedTruck: truckId,
        assignedReservation: reservationId
      }
    });
  } catch (error) {
    console.error('Error updating driver assignment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update driver assignment'
    });
  }
});

// Sentiment Analysis Endpoints

// Submit driver sentiment survey
app.post('/api/sentiment/survey', async (req, res) => {
  try {
    const { driverId, surveyData } = req.body;
    
    if (!driverId) {
      return res.status(400).json({
        success: false,
        error: 'Driver ID is required'
      });
    }
    
    if (!surveyData || typeof surveyData !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Valid survey data is required'
      });
    }
    
    console.log(`Processing sentiment survey for driver: ${driverId}`);

    // Check monthly submission limit before processing
    const gate = await sentimentAnalysisService.canSubmitSurvey(driverId, 2);
    if (!gate.allowed) {
      return res.status(429).json({
        success: false,
        error: `Monthly limit reached. Only ${gate.limit} submissions allowed per month.`,
        resetsAt: gate.resetsAt
      });
    }
    
    // Process survey using sentiment analysis service
    const result = await sentimentAnalysisService.processSurvey(driverId, surveyData);
    // Recompute gate after save to reflect current count
    const postGate = await sentimentAnalysisService.canSubmitSurvey(driverId, 2);
    res.status(201).json({
      success: true,
      message: 'Sentiment survey processed successfully',
      sentimentId: result.sentimentId,
      analysis: result.analysis,
      remainingThisMonth: postGate.remaining,
      limitPerMonth: postGate.limit,
      resetsAt: postGate.resetsAt
    });
  } catch (error) {
    console.error('Error processing sentiment survey:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process sentiment survey'
    });
  }
});

// Get driver sentiment history
app.get('/api/sentiment/driver/:id', async (req, res) => {
  try {
    const driverId = req.params.id;
    const { limit } = req.query;
    
    const sentimentHistory = await sentimentAnalysisService.getDriverSentimentHistory(
      driverId, 
      limit ? parseInt(limit) : 10
    );
    
    res.json({
      success: true,
      driverId,
      history: sentimentHistory
    });
  } catch (error) {
    console.error('Error fetching sentiment history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sentiment history'
    });
  }
});

// Get driver submission quota (for 2-per-month limit)
app.get('/api/sentiment/driver/:id/quota', async (req, res) => {
  try {
    const driverId = req.params.id;
    
    const quotaInfo = await sentimentAnalysisService.canSubmitSurvey(driverId, 2);
    
    res.json({
      success: true,
      driverId,
      allowed: quotaInfo.allowed,
      remaining: quotaInfo.remaining,
      limit: quotaInfo.limit,
      resetsAt: quotaInfo.resetsAt,
      currentMonth: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    });
  } catch (error) {
    console.error('Error fetching sentiment quota:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sentiment quota'
    });
  }
});

// Get current driver sentiment
app.get('/api/sentiment/driver/:id/current', async (req, res) => {
  try {
    const driverId = req.params.id;
    
    const currentSentiment = await sentimentAnalysisService.getCurrentSentiment(driverId);
    
    res.json({
      success: true,
      ...currentSentiment
    });
  } catch (error) {
    console.error('Error fetching current sentiment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch current sentiment'
    });
  }
});

// Get fleet sentiment statistics
app.get('/api/sentiment/fleet/stats', async (req, res) => {
  try {
    const fleetStats = await sentimentAnalysisService.getFleetSentimentStats();
    
    res.json({
      success: true,
      fleetSentiment: fleetStats
    });
  } catch (error) {
    console.error('Error fetching fleet sentiment stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch fleet sentiment statistics'
    });
  }
});

// Enhanced Fleet Management Endpoints

// Get enhanced fleet data with reservations and sentiment
app.get('/api/trucks/enhanced', async (req, res) => {
  try {
    const { includeReserved, includeSentiment, businessUid } = req.query;
    
    // Get trucks - filter by business if businessUid is provided
    let trucks;
    if (businessUid) {
      trucks = await trucksRepo.findWhere([
        { field: 'businessUid', operator: '==', value: businessUid }
      ]);
    } else {
      trucks = await trucksRepo.findAll();
    }
    
    // Get reservations if requested - filter by business if businessUid is provided
    let reservations = [];
    let reservedTrucks = [];
    if (includeReserved === 'true') {
      if (businessUid) {
        reservations = await truckReservationRepo.findByBusinessUid(businessUid);
      } else {
        reservations = await truckReservationRepo.findAll();
      }
      
      // Convert confirmed reservations to truck format
      reservedTrucks = reservations
        .filter(res => res.status === 'confirmed')
        .map(reservation => TruckDataTransformers.reservationToTruck(reservation));
    }
    
    // Combine trucks and remove duplicates (in case a truck is both in trucks and reservedTrucks)
    const combinedTrucks = [...trucks];
    
    // Add reserved trucks, but avoid adding if a truck with the same ID already exists
    for (const reservedTruck of reservedTrucks) {
      const exists = combinedTrucks.some(truck => truck.id === reservedTruck.id);
      if (!exists) {
        combinedTrucks.push(reservedTruck);
      }
    }
    
    // Add sentiment data if requested
    if (includeSentiment === 'true') {
      for (let truck of combinedTrucks) {
        if (truck.driver?.id) {
          try {
            const sentimentData = await sentimentAnalysisService.getCurrentSentiment(truck.driver.id);
            if (sentimentData.hasSentimentData) {
              truck.driver = {
                ...truck.driver,
                sentimentScore: sentimentData.currentScore,
                sentimentLabel: sentimentData.currentLabel,
                lastSentimentUpdate: sentimentData.lastUpdated
              };
            }
          } catch (error) {
            console.warn(`Failed to get sentiment for driver ${truck.driver.id}:`, error.message);
          }
        }
      }
    }
    
    // Transform to list items for frontend display
    const enhancedTrucks = combinedTrucks.map(truck => 
      TruckDataTransformers.truckToListItem(truck)
    );
    
    res.json({
      success: true,
      trucks: enhancedTrucks,
      totalCount: enhancedTrucks.length,
      reservedCount: enhancedTrucks.filter(t => t.isReserved).length,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching enhanced fleet data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch enhanced fleet data'
    });
  }
});

// Assign truck to existing reservation
app.post('/api/trucks/:id/reserve', async (req, res) => {
  try {
    const truckId = req.params.id;
    const { reservationId, assignDriver } = req.body;
    
    if (!reservationId) {
      return res.status(400).json({
        success: false,
        error: 'Reservation ID is required'
      });
    }
    
    // Get the truck and reservation
    const truck = await trucksRepo.findById(truckId);
    const reservation = await truckReservationRepo.findById(reservationId);
    
    if (!truck) {
      return res.status(404).json({
        success: false,
        error: 'Truck not found'
      });
    }
    
    if (!reservation) {
      return res.status(404).json({
        success: false,
        error: 'Reservation not found'
      });
    }
    
    // Update truck with reservation details
    const updatedTruck = TruckDataTransformers.reservationToTruck(reservation, truck);
    await trucksRepo.update(truckId, updatedTruck);
    
    // Update reservation status
    await truckReservationRepo.update(reservationId, {
      assignedTruckId: truckId,
      status: 'confirmed',
      confirmedAt: new Date()
    });
    
    res.json({
      success: true,
      message: 'Truck reserved successfully',
      truck: updatedTruck,
      reservation
    });
  } catch (error) {
    console.error('Error reserving truck:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reserve truck'
    });
  }
});


// Firebase-backed storage (removed in-memory arrays)
// Data is now persisted in Firebase Firestore

// WebSocket Real-time Events

// Simulate real-time location updates
app.post('/api/realtime/location-update', async (req, res) => {
  try {
    const { vehicleId, location, sessionId, driverUid } = req.body;
    
    if (!vehicleId || !location) {
      return res.status(400).json({
        success: false,
        error: 'Vehicle ID and location are required'
      });
    }
    
    // Update vehicle location in database
    const updateData = {
      currentLocation: {
        ...location,
        timestamp: new Date()
      },
      lastLocationUpdate: new Date()
    };
    
    await trucksRepo.update(vehicleId, updateData);
    
    // Broadcast location update via WebSocket
    const locationUpdate = {
      vehicleId,
      location: updateData.currentLocation,
      sessionId,
      driverUid,
      timestamp: new Date().toISOString()
    };
    
    // Emit to all connected clients subscribed to this vehicle
    webSocketService.broadcastLocationUpdate(locationUpdate);
    
    res.json({
      success: true,
      message: 'Location updated successfully',
      locationUpdate
    });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update location'
    });
  }
});

// Create alert with real-time notification
app.post('/api/realtime/alert', async (req, res) => {
  try {
    const { vehicleId, type, severity, message, location } = req.body;
    
    if (!vehicleId || !type || !message) {
      return res.status(400).json({
        success: false,
        error: 'Vehicle ID, type, and message are required'
      });
    }
    
    // Create alert in database
    const alertsRepo = new BaseRepository('alerts');
    const alertData = {
      vehicleId,
      type,
      severity: severity || 'medium',
      message,
      location: location || null,
      status: 'active',
      acknowledgedBy: null,
      acknowledgedAt: null
    };
    
    const alert = await alertsRepo.create(alertData);
    
    // Broadcast alert via WebSocket
    webSocketService.broadcastAlert(alert);
    
    res.status(201).json({
      success: true,
      message: 'Alert created and broadcasted successfully',
      alert
    });
  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create alert'
    });
  }
});

// Get WebSocket connection statistics
app.get('/api/realtime/stats', (req, res) => {
  try {
    const stats = webSocketService.getConnectionStats();
    
    res.json({
      success: true,
      stats: {
        ...stats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching WebSocket stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch connection statistics'
    });
  }
});

// Send test message via WebSocket
app.post('/api/realtime/test', (req, res) => {
  try {
    const { message, event } = req.body;
    
    const testData = {
      event: event || 'test_message',
      message: message || 'Test message from API',
      timestamp: new Date().toISOString()
    };
    
    webSocketService.broadcast(testData.event, testData);
    
    res.json({
      success: true,
      message: 'Test message sent successfully',
      data: testData
    });
  } catch (error) {
    console.error('Error sending test message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test message'
    });
  }
});

// AddTruck - Firebase integrated
app.post('/api/trucks', async (req, res) => {
  try {
    const { maxCapacity, routeId, number, driver, status, image } = req.body;
    
    // Validation
    if (!maxCapacity) {
      return res.status(400).json({
        success: false,
        error: 'Max capacity is required'
      });
    }
    
    const truckData = {
      maxCapacity: Number(maxCapacity),
      currentLoad: 0,
      routeId: routeId ? Number(routeId) : null,
      isDelayed: false,
      gpsStatus: 'OK',
      schedule: [],
      loadUnload: [],
      // Additional fields for frontend display
      number: number || null,
      driver: driver || null,
      status: status || 'available',
      image: image || null
    };
    
    const truck = await trucksRepo.create(truckData);
    
    res.status(201).json({
      success: true,
      message: 'Truck added successfully',
      truck
    });
  } catch (error) {
    console.error('Error adding truck:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add truck'
    });
  }
});

// AddRoute - Firebase integrated
app.post('/api/routes', async (req, res) => {
  try {
    const { touchpoints, loadUnloadPoints, maxCapacity } = req.body;
    
    // Validation
    if (!touchpoints || !maxCapacity) {
      return res.status(400).json({
        success: false,
        error: 'Touchpoints and max capacity are required'
      });
    }
    
    const routeData = {
      touchpoints: Array.isArray(touchpoints) ? touchpoints : 
        (typeof touchpoints === 'string' ? touchpoints.split(',') : []),
      loadUnloadPoints: Array.isArray(loadUnloadPoints) ? loadUnloadPoints.map(Number) : 
        (typeof loadUnloadPoints === 'string' ? loadUnloadPoints.split(',').map(Number) : []),
      maxCapacity: Number(maxCapacity)
    };
    
    const route = await routesRepo.create(routeData);
    
    res.status(201).json({
      success: true,
      message: 'Route added successfully',
      route
    });
  } catch (error) {
    console.error('Error adding route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add route'
    });
  }
});

// UpdateLoadUnload - Firebase integrated
app.post('/api/trucks/:id/load-unload', async (req, res) => {
  try {
    const truckId = req.params.id;
    const { touchpointIndex, unloadAmount, loadAmount } = req.body;
    
    const truck = await trucksRepo.findById(truckId);
    if (!truck) {
      return res.status(404).json({
        success: false,
        error: 'Truck not found'
      });
    }
    
    // Update load/unload data
    const newLoadUnload = {
      touchpointIndex: Number(touchpointIndex),
      unloadAmount: Number(unloadAmount || 0),
      loadAmount: Number(loadAmount || 0),
      timestamp: new Date()
    };
    
    const updatedLoadUnload = [...(truck.loadUnload || []), newLoadUnload];
    const newCurrentLoad = (truck.currentLoad || 0) - Number(unloadAmount || 0) + Number(loadAmount || 0);
    
    const updatedTruck = await trucksRepo.update(truckId, {
      loadUnload: updatedLoadUnload,
      currentLoad: Math.max(0, newCurrentLoad) // Ensure non-negative
    });
    
    res.json({
      success: true,
      message: 'Load/Unload updated successfully',
      truck: updatedTruck
    });
  } catch (error) {
    console.error('Error updating load/unload:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update load/unload'
    });
  }
});

// ReportDelay - Firebase integrated
app.post('/api/trucks/:id/delay', async (req, res) => {
  try {
    const truckId = req.params.id;
    const { reason, timeDelayed } = req.body;
    
    const truck = await trucksRepo.findById(truckId);
    if (!truck) {
      return res.status(404).json({
        success: false,
        error: 'Truck not found'
      });
    }
    
    // Update truck with delay information
    const delayData = {
      reason,
      timeDelayed: Number(timeDelayed || 0),
      reportedAt: new Date()
    };
    
    const delays = [...(truck.delays || []), delayData];
    
    const updatedTruck = await trucksRepo.update(truckId, {
      isDelayed: true,
      delays: delays,
      lastDelayReported: new Date()
    });
    
    res.json({
      success: true,
      message: 'Delay reported successfully',
      truck: updatedTruck
    });
  } catch (error) {
    console.error('Error reporting delay:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to report delay'
    });
  }
});

// ReportDetour - Firebase integrated
app.post('/api/trucks/:id/detour', async (req, res) => {
  try {
    const truckId = req.params.id;
    const { detourPoint, reason } = req.body;
    
    const truck = await trucksRepo.findById(truckId);
    if (!truck) {
      return res.status(404).json({
        success: false,
        error: 'Truck not found'
      });
    }
    
    const detourData = {
      detourPoint,
      reason: reason || 'Unspecified',
      reportedAt: new Date()
    };
    
    const detours = [...(truck.detours || []), detourData];
    
    const updatedTruck = await trucksRepo.update(truckId, {
      detours: detours,
      hasDetour: true,
      lastDetourReported: new Date()
    });
    
    res.json({
      success: true,
      message: 'Detour reported successfully',
      truck: updatedTruck
    });
  } catch (error) {
    console.error('Error reporting detour:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to report detour'
    });
  }
});

// BookThirdPartyCapacity - Firebase integrated
app.post('/api/third-party/book', async (req, res) => {
  try {
    const { truckId, capacity, provider, cost } = req.body;
    
    if (!truckId || !capacity) {
      return res.status(400).json({
        success: false,
        error: 'Truck ID and capacity are required'
      });
    }
    
    const truck = await trucksRepo.findById(truckId);
    if (!truck) {
      return res.status(404).json({
        success: false,
        error: 'Truck not found'
      });
    }
    
    // Create third-party booking record
    const thirdPartyRepo = new BaseRepository('thirdPartyBookings');
    const bookingData = {
      truckId,
      capacity: Number(capacity),
      provider: provider || 'Unknown Provider',
      cost: cost ? Number(cost) : null,
      status: 'booked',
      bookedAt: new Date()
    };
    
    const booking = await thirdPartyRepo.create(bookingData);
    
    res.json({
      success: true,
      message: 'Third-party capacity booked successfully',
      booking
    });
  } catch (error) {
    console.error('Error booking third-party capacity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to book third-party capacity'
    });
  }
});

// UpdateSchedule - Firebase integrated
app.post('/api/trucks/:id/schedule', async (req, res) => {
  try {
    const truckId = req.params.id;
    const { arrivalTimes, scheduleData } = req.body;
    
    const truck = await trucksRepo.findById(truckId);
    if (!truck) {
      return res.status(404).json({
        success: false,
        error: 'Truck not found'
      });
    }
    
    const schedule = {
      arrivalTimes: Array.isArray(arrivalTimes) ? arrivalTimes : 
        (typeof arrivalTimes === 'string' ? arrivalTimes.split(',').map(Number) : []),
      scheduleData: scheduleData || {},
      updatedAt: new Date()
    };
    
    const updatedTruck = await trucksRepo.update(truckId, {
      schedule: schedule,
      lastScheduleUpdate: new Date()
    });
    
    res.json({
      success: true,
      message: 'Schedule updated successfully',
      truck: updatedTruck
    });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update schedule'
    });
  }
});

// UpdateGPSStatus - Firebase integrated
app.post('/api/trucks/:id/gps', async (req, res) => {
  try {
    const truckId = req.params.id;
    const { status, location } = req.body;
    
    const truck = await trucksRepo.findById(truckId);
    if (!truck) {
      return res.status(404).json({
        success: false,
        error: 'Truck not found'
      });
    }
    
    const gpsUpdate = {
      gpsStatus: status || 'OK',
      lastGPSUpdate: new Date()
    };
    
    // Add location if provided
    if (location) {
      gpsUpdate.currentLocation = {
        ...location,
        timestamp: new Date()
      };
    }
    
    const updatedTruck = await trucksRepo.update(truckId, gpsUpdate);
    
    res.json({
      success: true,
      message: 'GPS status updated successfully',
      truck: updatedTruck
    });
  } catch (error) {
    console.error('Error updating GPS status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update GPS status'
    });
  }
});

// GetTruckInfo - Firebase integrated
app.get('/api/trucks/:id', async (req, res) => {
  try {
    const truckId = req.params.id;
    const truck = await trucksRepo.findById(truckId);
    
    if (!truck) {
      return res.status(404).json({
        success: false,
        error: 'Truck not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Truck info retrieved successfully',
      truck
    });
  } catch (error) {
    console.error('Error fetching truck:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch truck'
    });
  }
});

// List all trucks - Firebase integrated
app.get('/api/trucks', async (req, res) => {
  try {
    const { status, limit } = req.query;
    
    let trucks;
    if (status) {
      trucks = await trucksRepo.findWhere([
        { field: 'status', operator: '==', value: status }
      ], 'createdAt', 'desc', limit ? Number(limit) : null);
    } else {
      trucks = await trucksRepo.findAll('createdAt', 'desc', limit ? Number(limit) : null);
    }
    
    res.json({
      success: true,
      message: 'Trucks list retrieved successfully',
      trucks,
      count: trucks.length
    });
  } catch (error) {
    console.error('Error fetching trucks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trucks'
    });
  }
});

// GetRouteInfo - Firebase integrated
app.get('/api/routes/:id', async (req, res) => {
  try {
    const routeId = req.params.id;
    const route = await routesRepo.findById(routeId);
    
    if (!route) {
      return res.status(404).json({
        success: false,
        error: 'Route not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Route info retrieved successfully',
      route
    });
  } catch (error) {
    console.error('Error fetching route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch route'
    });
  }
});

// List all routes - Firebase integrated
app.get('/api/routes', async (req, res) => {
  try {
    const { limit } = req.query;
    const routes = await routesRepo.findAll('createdAt', 'desc', limit ? Number(limit) : null);
    
    res.json({
      success: true,
      message: 'Routes list retrieved successfully',
      routes,
      count: routes.length
    });
  } catch (error) {
    console.error('Error fetching routes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch routes'
    });
  }
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

// Location API Endpoints

// Search locations using Google Places API
app.get('/api/locations/search', async (req, res) => {
  try {
    const { q: query, limit = 10, types } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Query must be at least 2 characters long'
      });
    }

    const options = {
      types: types || 'establishment|geocode'
    };

    const suggestions = await gpsTrackingService.getLocationSuggestions(query, options);
    
    res.json({
      success: true,
      results: suggestions.slice(0, parseInt(limit)),
      query,
      count: suggestions.length
    });
  } catch (error) {
    console.error('Error searching locations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search locations'
    });
  }
});

// Get place details by Place ID
app.get('/api/locations/details/:placeId', async (req, res) => {
  try {
    const { placeId } = req.params;
    
    if (!placeId) {
      return res.status(400).json({
        success: false,
        error: 'Place ID is required'
      });
    }

    // This would typically use Google Places Details API
    // For now, we'll return a placeholder response
    res.json({
      success: true,
      message: 'Place details functionality to be implemented',
      placeId
    });
  } catch (error) {
    console.error('Error getting place details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get place details'
    });
  }
});

// Batch geocode addresses
app.post('/api/locations/geocode', async (req, res) => {
  try {
    const { addresses } = req.body;
    
    if (!addresses || !Array.isArray(addresses)) {
      return res.status(400).json({
        success: false,
        error: 'Addresses array is required'
      });
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < addresses.length; i++) {
      try {
        const address = addresses[i];
        const locationData = await gpsTrackingService.geocodeAddress(address);
        results.push({
          index: i,
          address,
          success: true,
          data: locationData
        });
      } catch (error) {
        errors.push({
          index: i,
          address: addresses[i],
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      results,
      errors,
      total: addresses.length,
      successful: results.length,
      failed: errors.length
    });
  } catch (error) {
    console.error('Error batch geocoding:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to geocode addresses'
    });
  }
});

// Update vehicle location with enhanced data
app.put('/api/vehicles/:vehicleId/location', async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { address, coordinates, placeId, source = 'manual' } = req.body;
    
    if (!vehicleId) {
      return res.status(400).json({
        success: false,
        error: 'Vehicle ID is required'
      });
    }

    if (!coordinates || !coordinates.lat || !coordinates.lng) {
      return res.status(400).json({
        success: false,
        error: 'Valid coordinates (lat, lng) are required'
      });
    }

    const locationData = {
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      accuracy: coordinates.accuracy || null,
      timestamp: new Date(),
      source
    };

    const result = await gpsTrackingService.updateVehicleLocationEnhanced(
      vehicleId, 
      locationData,
      { includeNearbyPlaces: true }
    );
    
    res.json({
      success: true,
      message: 'Vehicle location updated successfully',
      location: result.location,
      vehicleId
    });
  } catch (error) {
    console.error('Error updating vehicle location:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update vehicle location'
    });
  }
});

// Get vehicles within radius of a location
app.get('/api/vehicles/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 5 } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusKm = parseFloat(radius);

    if (isNaN(latitude) || isNaN(longitude) || isNaN(radiusKm)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates or radius'
      });
    }

    // Get all trucks and filter by distance
    const allTrucks = await trucksRepo.findAll();
    const nearbyVehicles = [];

    allTrucks.forEach(truck => {
      if (truck.currentLocation && truck.currentLocation.latitude && truck.currentLocation.longitude) {
        const distance = calculateDistance(
          latitude, longitude,
          truck.currentLocation.latitude, truck.currentLocation.longitude
        );
        
        if (distance <= radiusKm) {
          nearbyVehicles.push({
            ...truck,
            distance: Math.round(distance * 100) / 100 // Round to 2 decimal places
          });
        }
      }
    });

    // Sort by distance
    nearbyVehicles.sort((a, b) => a.distance - b.distance);
    
    res.json({
      success: true,
      vehicles: nearbyVehicles,
      count: nearbyVehicles.length,
      searchCenter: { lat: latitude, lng: longitude },
      radius: radiusKm
    });
  } catch (error) {
    console.error('Error finding nearby vehicles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to find nearby vehicles'
    });
  }
});

// Get cached location
app.get('/api/locations/cache', async (req, res) => {
  try {
    const { address } = req.query;
    
    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Address parameter is required'
      });
    }

    const cached = await locationCacheRepo.getCachedLocation(address);
    
    if (cached) {
      res.json({
        success: true,
        cached: true,
        location: cached
      });
    } else {
      res.status(404).json({
        success: false,
        cached: false,
        message: 'Location not found in cache'
      });
    }
  } catch (error) {
    console.error('Error getting cached location:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cached location'
    });
  }
});

// Cache statistics
app.get('/api/locations/cache/stats', async (req, res) => {
  try {
    const stats = await locationCacheRepo.getCacheStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting cache stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache statistics'
    });
  }
});

// Clean expired cache entries
app.post('/api/locations/cache/clean', async (req, res) => {
  try {
    const result = await locationCacheRepo.cleanExpiredEntries();
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error cleaning cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clean cache'
    });
  }
});

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Truck Reservation Endpoints

// Create truck reservation
app.post('/api/reservations', async (req, res) => {
  try {
    const { businessUid, customerInfo, trucks } = req.body;
    
    // Validation
    if (!businessUid || !trucks || !Array.isArray(trucks) || trucks.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Business UID and truck data are required'
      });
    }
    
    // Validate truck data
    for (const truck of trucks) {
      if (!truck.pickupLocation || !truck.dropLocation) {
        return res.status(400).json({
          success: false,
          error: 'Pickup and drop locations are required for all trucks'
        });
      }
    }
    
    const reservationData = {
      businessUid,
      customerInfo: customerInfo || {},
      trucks,
      submittedAt: new Date()
    };
    
    const reservation = await truckReservationRepo.createReservation(reservationData);
    
    res.status(201).json({
      success: true,
      message: 'Reservation created successfully',
      reservation
    });
  } catch (error) {
    console.error('Error creating reservation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create reservation'
    });
  }
});

// Get reservations by business
app.get('/api/reservations', async (req, res) => {
  try {
    const { businessUid, status } = req.query;
    
    let reservations;
    if (businessUid) {
      reservations = await truckReservationRepo.findByBusinessUid(businessUid, status);
    } else {
      reservations = status ? 
        await truckReservationRepo.findByStatus(status) :
        await truckReservationRepo.findAll();
    }
    
    res.json({
      success: true,
      reservations,
      count: reservations.length
    });
  } catch (error) {
    console.error('Error fetching reservations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reservations'
    });
  }
});

// Get single reservation
app.get('/api/reservations/:id', async (req, res) => {
  try {
    const reservationId = req.params.id;
    const reservation = await truckReservationRepo.findById(reservationId);
    
    if (!reservation) {
      return res.status(404).json({
        success: false,
        error: 'Reservation not found'
      });
    }
    
    res.json({
      success: true,
      reservation
    });
  } catch (error) {
    console.error('Error fetching reservation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reservation'
    });
  }
});

// Update reservation status
app.patch('/api/reservations/:id/status', async (req, res) => {
  try {
    const reservationId = req.params.id;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }
    
    const validStatuses = ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status value'
      });
    }
    
    const updatedReservation = await truckReservationRepo.updateStatus(reservationId, status);
    
    res.json({
      success: true,
      message: 'Reservation status updated successfully',
      reservation: updatedReservation
    });
  } catch (error) {
    console.error('Error updating reservation status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update reservation status'
    });
  }
});

// Update payment status
app.patch('/api/reservations/:id/payment', async (req, res) => {
  try {
    const reservationId = req.params.id;
    const { paymentStatus, paymentDetails } = req.body;
    
    if (!paymentStatus) {
      return res.status(400).json({
        success: false,
        error: 'Payment status is required'
      });
    }
    
    const validPaymentStatuses = ['pending', 'paid', 'failed', 'refunded'];
    if (!validPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment status value'
      });
    }
    
    const updatedReservation = await truckReservationRepo.updatePaymentStatus(
      reservationId, 
      paymentStatus, 
      paymentDetails || {}
    );
    
    res.json({
      success: true,
      message: 'Payment status updated successfully',
      reservation: updatedReservation
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update payment status'
    });
  }
});

// Get reservation statistics
app.get('/api/reservations/stats/summary', async (req, res) => {
  try {
    const { businessUid } = req.query;
    const stats = await truckReservationRepo.getStatistics(businessUid);
    
    res.json({
      success: true,
      statistics: stats
    });
  } catch (error) {
    console.error('Error fetching reservation statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

// Get upcoming pickups
app.get('/api/reservations/upcoming/pickups', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const upcomingPickups = await truckReservationRepo.getUpcomingPickups(Number(days));
    
    res.json({
      success: true,
      upcomingPickups,
      count: upcomingPickups.length
    });
  } catch (error) {
    console.error('Error fetching upcoming pickups:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch upcoming pickups'
    });
  }
});

// Get reservation for a specific driver
app.get('/api/reservations/driver/:driverId', async (req, res) => {
  try {
    const { driverId } = req.params;
    
    // Find reservation where the driver is assigned to any truck
    const reservations = await truckReservationRepo.findAll();
    const driverReservation = reservations.find(reservation => 
      reservation.trucks?.some(truck => truck.assignedDriver?.id === driverId)
    );
    
    if (!driverReservation) {
      return res.json({
        success: true,
        reservation: null,
        message: 'No active reservation found for driver'
      });
    }
    
    res.json({
      success: true,
      reservation: driverReservation
    });
  } catch (error) {
    console.error('Error fetching driver reservation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch driver reservation'
    });
  }
});

// Business Dashboard Data Endpoints

// Get comprehensive dashboard data for a business
app.get('/api/business/:uid/dashboard', async (req, res) => {
  try {
    const businessUid = req.params.uid;
    
    // Get business profile
    const profile = await businessProfilesRepo.findById(businessUid);
    
    // Get reservation count
    const reservations = await truckReservationRepo.findByBusinessUid(businessUid);
    const reservationCount = reservations.length;
    
    // Get active reservations
    const activeReservations = reservations.filter(res => 
      ['confirmed', 'in-progress'].includes(res.status)
    );
    
    // Calculate delivery status summary
    const deliveryStatus = {
      total: reservations.length,
      pending: reservations.filter(r => r.status === 'pending').length,
      confirmed: reservations.filter(r => r.status === 'confirmed').length,
      'in-progress': reservations.filter(r => r.status === 'in-progress').length,
      completed: reservations.filter(r => r.status === 'completed').length,
      cancelled: reservations.filter(r => r.status === 'cancelled').length
    };
    
    // Calculate trucks in use
    const trucksInUse = activeReservations.reduce((count, res) => 
      count + (res.trucks?.length || 0), 0
    );
    
    res.json({
      success: true,
      profile,
      reservationCount,
      activeReservations,
      deliveryStatus,
      trucksInUse
    });
  } catch (error) {
    console.error('Error fetching business dashboard data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch business dashboard data'
    });
  }
});

// Get delivery status for a business
app.get('/api/business/:uid/delivery-status', async (req, res) => {
  try {
    const businessUid = req.params.uid;
    
    const reservations = await truckReservationRepo.findByBusinessUid(businessUid);
    const activeReservations = reservations.filter(res => 
      ['confirmed', 'in-progress'].includes(res.status)
    );
    
    const deliveryStatus = {
      total: reservations.length,
      pending: reservations.filter(r => r.status === 'pending').length,
      confirmed: reservations.filter(r => r.status === 'confirmed').length,
      'in-progress': reservations.filter(r => r.status === 'in-progress').length,
      completed: reservations.filter(r => r.status === 'completed').length,
      cancelled: reservations.filter(r => r.status === 'cancelled').length
    };
    
    res.json({
      success: true,
      deliveryStatus,
      activeReservations
    });
  } catch (error) {
    console.error('Error fetching delivery status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch delivery status'
    });
  }
});

// Get trucks assigned to a business
app.get('/api/business/:uid/trucks', async (req, res) => {
  try {
    const businessUid = req.params.uid;
    
    const reservations = await truckReservationRepo.findByBusinessUid(businessUid, 'confirmed');
    const trucks = [];
    
    reservations.forEach(reservation => {
      if (reservation.trucks) {
        reservation.trucks.forEach(truck => {
          // Normalize a readable truck identifier so UI doesn't show "Unknown"
          const normalizedNumber =
            truck.number ||
            truck.truckNumber ||
            truck.truckId ||
            truck.licensePlate ||
            truck.plate ||
            truck.id ||
            `AUTO-${String(reservation.id || '').slice(0, 6).toUpperCase()}`;

          trucks.push({
            ...truck,
            number: normalizedNumber,
            reservationId: reservation.id,
            status: truck.status || 'Active',
            location: truck.currentLocation || { lat: 28.7041, lng: 77.1025 },
            route: `${truck.pickupLocation || 'Unknown'} to ${truck.dropLocation || 'Unknown'}`
          });
        });
      }
    });
    
    res.json({
      success: true,
      trucks
    });
  } catch (error) {
    console.error('Error fetching business trucks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch business trucks'
    });
  }
});

// MIS Reports and Analytics

// Fleet statistics
app.get('/api/analytics/fleet-stats', async (req, res) => {
  try {
    const { businessUid, timeRange = '30d' } = req.query;
    
    // Get trucks data
    let trucksConditions = [];
    if (businessUid) {
      trucksConditions.push({ field: 'businessUid', operator: '==', value: businessUid });
    }
    
    const trucks = await trucksRepo.findWhere(trucksConditions);
    const totalTrucks = trucks.length;
    const activeTrucks = trucks.filter(t => t.status === 'in_transit').length;
    const availableTrucks = trucks.filter(t => t.status === 'available').length;
    const maintenanceTrucks = trucks.filter(t => t.status === 'maintenance').length;
    
    // Get reservations data
    const reservations = businessUid ? 
      await truckReservationRepo.findByBusinessUid(businessUid) :
      await truckReservationRepo.findAll();
    
    const totalReservations = reservations.length;
    const pendingReservations = reservations.filter(r => r.status === 'pending').length;
    const confirmedReservations = reservations.filter(r => r.status === 'confirmed').length;
    const completedReservations = reservations.filter(r => r.status === 'completed').length;
    
    // Calculate revenue
    const totalRevenue = reservations
      .filter(r => r.paymentStatus === 'paid')
      .reduce((sum, r) => sum + (r.totalCost || 0), 0);
    
    const stats = {
      fleet: {
        totalTrucks,
        activeTrucks,
        availableTrucks,
        maintenanceTrucks,
        utilizationRate: totalTrucks > 0 ? (activeTrucks / totalTrucks * 100).toFixed(1) : 0
      },
      reservations: {
        totalReservations,
        pendingReservations,
        confirmedReservations,
        completedReservations,
        completionRate: totalReservations > 0 ? (completedReservations / totalReservations * 100).toFixed(1) : 0
      },
      financial: {
        totalRevenue,
        averageOrderValue: totalReservations > 0 ? (totalRevenue / totalReservations).toFixed(2) : 0
      }
    };
    
    res.json({
      success: true,
      stats,
      timeRange
    });
  } catch (error) {
    console.error('Error fetching fleet stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch fleet statistics'
    });
  }
});

// Performance metrics for charts
app.get('/api/analytics/performance', async (req, res) => {
  try {
    const { businessUid, period = 'monthly' } = req.query;
    
    // Generate mock time-series data for charts
    const now = new Date();
    const data = [];
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now);
      if (period === 'daily') {
        date.setDate(date.getDate() - i);
      } else {
        date.setMonth(date.getMonth() - i);
      }
      
      // Generate realistic mock data
      const baseRevenue = 50000 + Math.random() * 30000;
      const baseTrucks = 15 + Math.random() * 10;
      const baseOrders = 20 + Math.random() * 15;
      
      data.push({
        date: date.toISOString().split('T')[0],
        revenue: Math.round(baseRevenue),
        trucksActive: Math.round(baseTrucks),
        ordersCompleted: Math.round(baseOrders),
        efficiency: Math.round(75 + Math.random() * 20), // 75-95%
        fuelConsumption: Math.round(1000 + Math.random() * 500) // Liters
      });
    }
    
    res.json({
      success: true,
      data,
      period
    });
  } catch (error) {
    console.error('Error fetching performance data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch performance data'
    });
  }
});

// Route efficiency analytics
app.get('/api/analytics/routes', async (req, res) => {
  try {
    const { businessUid } = req.query;
    
    const routes = await routesRepo.findAll();
    
    const routeAnalytics = routes.map(route => {
      // Mock analytics data
      const avgDuration = 4 + Math.random() * 8; // 4-12 hours
      const completionRate = 85 + Math.random() * 15; // 85-100%
      const fuelEfficiency = 6 + Math.random() * 4; // 6-10 km/l
      
      return {
        routeId: route.id,
        touchpoints: route.touchpoints || [],
        avgDuration: avgDuration.toFixed(1),
        completionRate: completionRate.toFixed(1),
        fuelEfficiency: fuelEfficiency.toFixed(1),
        totalTrips: Math.round(20 + Math.random() * 50),
        onTimePerformance: (80 + Math.random() * 20).toFixed(1)
      };
    });
    
    res.json({
      success: true,
      routes: routeAnalytics,
      count: routeAnalytics.length
    });
  } catch (error) {
    console.error('Error fetching route analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch route analytics'
    });
  }
});

// Driver performance analytics
app.get('/api/analytics/drivers', async (req, res) => {
  try {
    const { businessUid } = req.query;
    
    const drivers = await driverProfilesRepo.findWhere([
      { field: 'registrationStatus', operator: '==', value: 'completed' }
    ]);
    
    const driverAnalytics = drivers.map(driver => {
      // Mock performance data
      const safetyScore = 75 + Math.random() * 25; // 75-100
      const onTimeRate = 80 + Math.random() * 20; // 80-100%
      const fuelEfficiency = 85 + Math.random() * 15; // 85-100%
      
      return {
        driverId: driver.id,
        name: `${driver.personalInfo?.firstName || ''} ${driver.personalInfo?.lastName || ''}`.trim() || 'Unknown Driver',
        safetyScore: safetyScore.toFixed(1),
        onTimeDeliveryRate: onTimeRate.toFixed(1),
        fuelEfficiencyScore: fuelEfficiency.toFixed(1),
        totalTrips: Math.round(10 + Math.random() * 40),
        avgRating: (4.0 + Math.random() * 1.0).toFixed(1)
      };
    });
    
    res.json({
      success: true,
      drivers: driverAnalytics,
      count: driverAnalytics.length
    });
  } catch (error) {
    console.error('Error fetching driver analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch driver analytics'
    });
  }
});

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
