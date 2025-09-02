/**
 * Enhanced truck data models for fleet management with reservation integration
 */

/**
 * Location Data Model for standardized location objects
 */
export const LocationDataModel = {
  // Basic location information
  address: String,           // Full address string
  formattedAddress: String,  // Google-formatted address
  latitude: Number,          // Precise coordinates
  longitude: Number,
  
  // Google Places metadata
  placeId: String,           // Google Place ID for reference
  placeName: String,         // Place name (if applicable)
  placeTypes: [String],      // e.g., ["establishment", "hospital"]
  plusCode: String,          // Google Plus Code
  
  // Address components for filtering/search
  addressComponents: {
    streetNumber: String,
    route: String,
    locality: String,        // City
    administrativeArea: String, // State
    administrativeAreaLevel2: String, // District
    country: String,
    countryCode: String,
    postalCode: String,
    sublocality: String
  },
  
  // Metadata
  accuracy: Number,          // GPS accuracy in meters
  timestamp: Date,
  source: String,            // "manual", "gps", "api", "search"
  isVerified: Boolean,       // Manual verification flag
  confidence: Number         // Location confidence score (0-100)
};

/**
 * Location Cache Model for performance optimization
 */
export const LocationCacheModel = {
  id: String,                 // Hash of the address
  address: String,
  coordinates: {
    latitude: Number,
    longitude: Number
  },
  placeId: String,
  formattedAddress: String,
  addressComponents: Object,
  placeTypes: [String],
  lastUsed: Date,
  usageCount: Number,
  createdAt: Date,
  expiresAt: Date            // Cache expiration
};

/**
 * Enhanced Truck Model with reservation and sentiment integration
 */
export const EnhancedTruckModel = {
  // Basic truck information
  id: String,
  number: String,          // Truck license plate
  model: String,          // Truck model/make
  year: Number,           // Manufacturing year
  capacity: Number,       // Maximum load capacity in kg
  fuelType: String,       // 'Diesel', 'Petrol', 'Electric', 'Hybrid'
  
  // Driver information with sentiment
  driver: {
    id: String,
    name: String,
    phone: String,
    licenseNumber: String,
    experience: Number,     // Years of experience
    
    // Sentiment data integration
    sentimentScore: Number, // 0-100
    sentimentLabel: String, // 'Very Positive', 'Positive', 'Neutral', 'Negative', 'Very Negative'
    lastSentimentUpdate: Date,
    sentimentTrend: String  // 'improving', 'declining', 'stable'
  },
  
  // Current status and location with enhanced Google Places integration
  status: String,         // 'Available', 'In Transit', 'Loading', 'Unloading', 'Maintenance', 'Reserved'
  currentLocation: {
    address: String,           // "123 Main St, City, State, Country"
    formattedAddress: String,  // Google-formatted address
    latitude: Number,          // Precise coordinates
    longitude: Number,
    
    // Address components for filtering/search
    addressComponents: {
      streetNumber: String,
      route: String,
      locality: String,        // City
      administrativeArea: String, // State
      administrativeAreaLevel2: String, // District
      country: String,
      countryCode: String,
      postalCode: String,
      sublocality: String
    },
    
    // Google Places metadata
    placeId: String,           // Google Place ID for reference
    placeName: String,         // Place name (if applicable)
    placeTypes: [String],      // e.g., ["establishment", "hospital"]
    plusCode: String,          // Google Plus Code
    
    // Tracking metadata
    accuracy: Number,          // GPS accuracy in meters
    timestamp: Date,
    source: String,            // "manual", "gps", "api", "search"
    isVerified: Boolean,       // Manual verification flag
    confidence: Number         // Location confidence score (0-100)
  },
  
  // Location history for analytics and tracking
  locationHistory: [{
    address: String,
    formattedAddress: String,
    latitude: Number,
    longitude: Number,
    placeId: String,
    placeName: String,
    addressComponents: Object,
    timestamp: Date,
    event: String,             // "pickup", "delivery", "checkpoint", "break", "refuel", "maintenance"
    source: String,            // "manual", "gps", "api"
    accuracy: Number,
    speed: Number,             // Speed at time of location update
    heading: Number            // Direction of travel (0-360 degrees)
  }],
  
  // Reservation integration
  isReserved: Boolean,
  reservationDetails: {
    reservationId: String,
    businessUid: String,
    customerInfo: {
      contactName: String,
      contactPhone: String,
      contactEmail: String,
      company: String
    },
    route: {
      pickupLocation: String,
      dropLocation: String,
      pickupDate: Date,
      dropDate: Date,
      estimatedDistance: Number, // km
      estimatedDuration: Number  // hours
    },
    checkpoints: [{
      location: String,
      date: Date,
      weight: Number,
      goodsType: String,
      status: String, // 'Pending', 'Completed', 'Skipped'
      timestamp: Date
    }],
    totalCost: Number,
    paymentStatus: String, // 'Pending', 'Paid', 'Partial', 'Overdue'
    reservedAt: Date,
    confirmedAt: Date,
    assignedDriver: {
      id: String,
      name: String,
      phone: String,
      licenseNumber: String,
      assignedAt: Date
    }
  },
  
  // Maintenance and performance
  maintenance: {
    lastService: Date,
    nextServiceDue: Date,
    mileage: Number,
    fuelEfficiency: Number, // km per liter
    issues: [String]
  },
  
  // Real-time metrics
  metrics: {
    currentSpeed: Number,   // km/h
    fuelLevel: Number,      // percentage
    engineTemperature: Number,
    lastPingTime: Date,
    batteryLevel: Number    // for GPS device
  },
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date,
  lastActiveAt: Date
};

/**
 * Fleet Status Model for dashboard display
 */
export const FleetStatusModel = {
  totalTrucks: Number,
  activeCount: Number,
  reservedCount: Number,
  inTransitCount: Number,
  availableCount: Number,
  maintenanceCount: Number,
  
  // Sentiment overview
  avgSentimentScore: Number,
  sentimentDistribution: {
    veryPositive: Number,
    positive: Number,
    neutral: Number,
    negative: Number,
    veryNegative: Number
  },
  
  // Performance metrics
  totalRevenue: Number,
  utilizationRate: Number, // percentage
  onTimeDeliveryRate: Number,
  fuelEfficiency: Number,
  
  lastUpdated: Date
};

/**
 * Truck List Item Model for sidebar display
 */
export const TruckListItemModel = {
  id: String,
  number: String,
  driver: {
    name: String,
    sentimentScore: Number,
    sentimentLabel: String
  },
  status: String,
  isReserved: Boolean,
  
  // Reservation summary for display
  reservationSummary: {
    customerName: String,
    route: String,        // "From -> To"
    pickupDate: Date
  },
  
  // Location summary
  currentLocation: {
    city: String,
    state: String,
    lastUpdate: Date
  },
  
  // Visual indicators
  indicators: {
    hasAlerts: Boolean,
    lowFuel: Boolean,
    maintenanceDue: Boolean,
    lowSentiment: Boolean
  },
  
  // For sorting and filtering
  lastActivity: Date,
  priority: String      // 'High', 'Medium', 'Low'
};

/**
 * Truck Detail Model for comprehensive view
 */
export const TruckDetailModel = {
  ...EnhancedTruckModel,
  
  // Additional detail fields
  route: {
    plannedRoute: [{
      location: String,
      estimatedArrival: Date,
      actualArrival: Date,
      status: String
    }],
    deviation: {
      hasDeviation: Boolean,
      reason: String,
      timestamp: Date
    }
  },
  
  // Historical data for charts
  history: {
    locations: [{
      latitude: Number,
      longitude: Number,
      timestamp: Date,
      speed: Number
    }],
    sentimentHistory: [{
      score: Number,
      date: Date,
      source: String
    }],
    performanceMetrics: [{
      date: Date,
      fuelEfficiency: Number,
      distance: Number,
      revenue: Number
    }]
  },
  
  // Alerts and notifications
  alerts: [{
    id: String,
    type: String,        // 'Maintenance', 'Route', 'Fuel', 'Sentiment', 'Security'
    severity: String,    // 'Low', 'Medium', 'High', 'Critical'
    message: String,
    timestamp: Date,
    acknowledged: Boolean,
    resolvedAt: Date
  }]
};

/**
 * Helper functions for data transformation
 */
export const TruckDataTransformers = {
  /**
   * Convert reservation data to truck model
   */
  reservationToTruck: (reservation, existingTruck = null) => {
    const baseData = existingTruck || {
      id: `reserved_truck_${reservation.id}`,
      number: `AUTO-${reservation.id.substring(0, 6).toUpperCase()}`,
      model: 'Standard Cargo',
      capacity: 10000,
      status: 'Reserved'
    };
    
    // Get the first truck from the reservation (multi-truck support can be added later)
    const firstTruck = reservation.trucks[0] || {};
    
    return {
      ...baseData,
      isReserved: true,
      
      // Include assigned driver information
      driver: firstTruck.assignedDriver ? {
        id: firstTruck.assignedDriver.id,
        name: firstTruck.assignedDriver.name,
        phone: firstTruck.assignedDriver.phone,
        licenseNumber: firstTruck.assignedDriver.licenseNumber,
        // Sentiment data will be filled in separately if needed
        sentimentScore: null,
        sentimentLabel: null,
        lastSentimentUpdate: null
      } : {
        id: null,
        name: 'Unassigned',
        phone: null,
        licenseNumber: null,
        sentimentScore: null,
        sentimentLabel: null
      },
      
      reservationDetails: {
        reservationId: reservation.id,
        businessUid: reservation.businessUid,
        customerInfo: reservation.customerInfo,
        route: {
          pickupLocation: firstTruck.pickupLocation,
          dropLocation: firstTruck.dropLocation,
          pickupDate: new Date(firstTruck.pickupDate),
          dropDate: new Date(firstTruck.dropDate)
        },
        checkpoints: firstTruck.checkpoints || [],
        totalCost: reservation.totalCost,
        paymentStatus: reservation.paymentStatus || 'Pending',
        reservedAt: new Date(reservation.createdAt),
        confirmedAt: reservation.status === 'confirmed' ? new Date() : null,
        assignedDriver: firstTruck.assignedDriver || null
      },
      updatedAt: new Date()
    };
  },
  
  /**
   * Convert enhanced truck to list item
   */
  truckToListItem: (truck) => {
    return {
      id: truck.id,
      number: truck.number,
      driver: {
        name: truck.driver?.name || 'Unassigned',
        sentimentScore: truck.driver?.sentimentScore || null,
        sentimentLabel: truck.driver?.sentimentLabel || null,
        id: truck.driver?.id || null,
        phone: truck.driver?.phone || null,
        licenseNumber: truck.driver?.licenseNumber || null
      },
      status: truck.status,
      isReserved: truck.isReserved || false,
      
      reservationSummary: truck.isReserved ? {
        customerName: truck.reservationDetails?.customerInfo?.contactName || 'Unknown',
        route: `${truck.reservationDetails?.route?.pickupLocation} → ${truck.reservationDetails?.route?.dropLocation}`,
        pickupDate: truck.reservationDetails?.route?.pickupDate,
        assignedDriver: truck.reservationDetails?.assignedDriver || truck.driver,
        checkpoints: truck.reservationDetails?.checkpoints || [],
        touchpoints: truck.reservationDetails?.touchpoints || [],
        currentCheckpoint: truck.reservationDetails?.currentCheckpoint || 0,
        pickupLocation: truck.reservationDetails?.route?.pickupLocation,
        dropLocation: truck.reservationDetails?.route?.dropLocation,
        dropDate: truck.reservationDetails?.route?.dropDate
      } : null,
      
      currentLocation: {
        city: truck.currentLocation?.address?.split(',')[0] || 'Unknown',
        state: truck.currentLocation?.address?.split(',')[1] || '',
        lastUpdate: truck.currentLocation?.timestamp
      },
      
      indicators: {
        hasAlerts: (truck.alerts?.length || 0) > 0,
        lowFuel: (truck.metrics?.fuelLevel || 100) < 20,
        maintenanceDue: truck.maintenance?.nextServiceDue < new Date(),
        lowSentiment: (truck.driver?.sentimentScore || 100) < 40
      },
      
      lastActivity: truck.lastActiveAt || truck.updatedAt,
      priority: calculatePriority(truck)
    };
  },
  
  /**
   * Merge sentiment data into truck model
   */
  mergeSentimentData: (truck, sentimentData) => {
    return {
      ...truck,
      driver: {
        ...truck.driver,
        sentimentScore: sentimentData.sentimentScore,
        sentimentLabel: sentimentData.sentimentLabel,
        lastSentimentUpdate: new Date(sentimentData.processedAt),
        sentimentTrend: sentimentData.trend || 'stable'
      },
      updatedAt: new Date()
    };
  }
};

/**
 * Calculate truck priority based on various factors
 */
function calculatePriority(truck) {
  let score = 0;
  
  // Reservation status
  if (truck.isReserved) score += 30;
  
  // Driver sentiment
  if (truck.driver?.sentimentScore < 40) score += 20;
  else if (truck.driver?.sentimentScore > 80) score -= 10;
  
  // Maintenance
  if (truck.maintenance?.nextServiceDue < new Date()) score += 25;
  
  // Fuel level
  if (truck.metrics?.fuelLevel < 20) score += 15;
  
  // Alerts
  score += (truck.alerts?.length || 0) * 5;
  
  if (score >= 50) return 'High';
  if (score >= 25) return 'Medium';
  return 'Low';
}

/**
 * Data validation schemas
 */
export const ValidationSchemas = {
  enhancedTruck: {
    required: ['id', 'number', 'status'],
    optional: ['driver', 'currentLocation', 'reservationDetails', 'metrics'],
    
    validate: (data) => {
      const errors = [];
      
      if (!data.id) errors.push('Truck ID is required');
      if (!data.number) errors.push('Truck number is required');
      if (!['Available', 'In Transit', 'Loading', 'Unloading', 'Maintenance', 'Reserved'].includes(data.status)) {
        errors.push('Invalid truck status');
      }
      
      if (data.driver?.sentimentScore && (data.driver.sentimentScore < 0 || data.driver.sentimentScore > 100)) {
        errors.push('Sentiment score must be between 0 and 100');
      }
      
      return {
        isValid: errors.length === 0,
        errors
      };
    }
  }
};

export default {
  EnhancedTruckModel,
  FleetStatusModel,
  TruckListItemModel,
  TruckDetailModel,
  TruckDataTransformers,
  ValidationSchemas
};