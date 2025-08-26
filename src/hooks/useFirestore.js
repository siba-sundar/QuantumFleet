import { useState, useEffect, useCallback } from "react";
import { UserRepository } from "../repositories/UserRepository.js";
import { BusinessRepository } from "../repositories/BusinessRepository.js";
import { DriverRepository } from "../repositories/DriverRepository.js";
import { PostalRepository } from "../repositories/PostalRepository.js";
import { TrackingSessionRepository } from "../repositories/TrackingSessionRepository.js";
import { AlertRepository } from "../repositories/AlertRepository.js";

// Initialize repositories
const userRepo = new UserRepository();
const businessRepo = new BusinessRepository();
const driverRepo = new DriverRepository();
const postalRepo = new PostalRepository();
const trackingRepo = new TrackingSessionRepository();
const alertRepo = new AlertRepository();

/**
 * Custom hook for Firestore operations
 * @param {string} collectionName - Name of the collection to operate on
 * @returns {Object} Firestore operations and state
 */
export function useFirestore(collectionName) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get the appropriate repository
  const getRepository = useCallback(() => {
    switch (collectionName) {
      case 'users':
        return userRepo;
      case 'businessProfiles':
        return businessRepo;
      case 'driverProfiles':
        return driverRepo;
      case 'postalProfiles':
        return postalRepo;
      case 'trackingSessions':
        return trackingRepo;
      case 'alerts':
        return alertRepo;
      default:
        throw new Error(`Unknown collection: ${collectionName}`);
    }
  }, [collectionName]);

  const repository = getRepository();

  // Generic CRUD operations
  const operations = {
    // Create a new document
    create: async (data) => {
      setLoading(true);
      setError(null);
      try {
        const result = await repository.create(data);
        return { success: true, data: result };
      } catch (error) {
        setError(error.message);
        return { success: false, error: error.message };
      } finally {
        setLoading(false);
      }
    },

    // Find document by ID
    findById: async (id) => {
      setLoading(true);
      setError(null);
      try {
        const result = await repository.findById(id);
        return { success: true, data: result };
      } catch (error) {
        setError(error.message);
        return { success: false, error: error.message };
      } finally {
        setLoading(false);
      }
    },

    // Update document
    update: async (id, data) => {
      setLoading(true);
      setError(null);
      try {
        const result = await repository.update(id, data);
        return { success: true, data: result };
      } catch (error) {
        setError(error.message);
        return { success: false, error: error.message };
      } finally {
        setLoading(false);
      }
    },

    // Delete document
    delete: async (id) => {
      setLoading(true);
      setError(null);
      try {
        await repository.delete(id);
        return { success: true };
      } catch (error) {
        setError(error.message);
        return { success: false, error: error.message };
      } finally {
        setLoading(false);
      }
    },

    // Find documents with conditions
    findWhere: async (conditions, orderByField, orderDirection, limitCount) => {
      setLoading(true);
      setError(null);
      try {
        const result = await repository.findWhere(conditions, orderByField, orderDirection, limitCount);
        setData(result);
        return { success: true, data: result };
      } catch (error) {
        setError(error.message);
        return { success: false, error: error.message };
      } finally {
        setLoading(false);
      }
    },

    // Get all documents
    findAll: async (orderByField, orderDirection, limitCount) => {
      setLoading(true);
      setError(null);
      try {
        const result = await repository.findAll(orderByField, orderDirection, limitCount);
        setData(result);
        return { success: true, data: result };
      } catch (error) {
        setError(error.message);
        return { success: false, error: error.message };
      } finally {
        setLoading(false);
      }
    },

    // Subscribe to real-time changes
    subscribe: (callback, conditions, orderByField, orderDirection) => {
      try {
        return repository.subscribeToChanges((documents) => {
          setData(documents);
          if (callback) callback(documents);
        }, conditions, orderByField, orderDirection);
      } catch (error) {
        setError(error.message);
        return null;
      }
    },

    // Subscribe to a specific document
    subscribeToDocument: (id, callback) => {
      try {
        return repository.subscribeToDocument(id, (document) => {
          if (callback) callback(document);
        });
      } catch (error) {
        setError(error.message);
        return null;
      }
    }
  };

  return {
    data,
    loading,
    error,
    setError,
    ...operations
  };
}

/**
 * Custom hook for user operations
 * @returns {Object} User-specific operations
 */
export function useUsers() {
  const baseHook = useFirestore('users');
  
  return {
    ...baseHook,
    findByEmail: async (email) => {
      baseHook.setError(null);
      try {
        const result = await userRepo.findByEmail(email);
        return { success: true, data: result };
      } catch (error) {
        baseHook.setError(error.message);
        return { success: false, error: error.message };
      }
    },
    
    findByPhoneNumber: async (phoneNumber) => {
      baseHook.setError(null);
      try {
        const result = await userRepo.findByPhoneNumber(phoneNumber);
        return { success: true, data: result };
      } catch (error) {
        baseHook.setError(error.message);
        return { success: false, error: error.message };
      }
    },
    
    findByUserType: async (userType) => {
      baseHook.setError(null);
      try {
        const result = await userRepo.findByUserType(userType);
        return { success: true, data: result };
      } catch (error) {
        baseHook.setError(error.message);
        return { success: false, error: error.message };
      }
    }
  };
}

/**
 * Custom hook for business operations
 * @returns {Object} Business-specific operations
 */
export function useBusiness() {
  const baseHook = useFirestore('businessProfiles');
  
  return {
    ...baseHook,
    createProfile: async (profileData) => {
      baseHook.setError(null);
      try {
        const result = await businessRepo.createProfile(profileData);
        return { success: true, data: result };
      } catch (error) {
        baseHook.setError(error.message);
        return { success: false, error: error.message };
      }
    },
    
    findByUserId: async (uid) => {
      baseHook.setError(null);
      try {
        const result = await businessRepo.findByUserId(uid);
        return { success: true, data: result };
      } catch (error) {
        baseHook.setError(error.message);
        return { success: false, error: error.message };
      }
    },
    
    searchByName: async (searchTerm) => {
      baseHook.setError(null);
      try {
        const result = await businessRepo.searchByName(searchTerm);
        return { success: true, data: result };
      } catch (error) {
        baseHook.setError(error.message);
        return { success: false, error: error.message };
      }
    },
    
    findByPostalBranch: async (postalBranch) => {
      baseHook.setError(null);
      try {
        const result = await businessRepo.findByPostalBranch(postalBranch);
        return { success: true, data: result };
      } catch (error) {
        baseHook.setError(error.message);
        return { success: false, error: error.message };
      }
    }
  };
}

/**
 * Custom hook for driver operations
 * @returns {Object} Driver-specific operations
 */
export function useDrivers() {
  const baseHook = useFirestore('driverProfiles');
  
  return {
    ...baseHook,
    createProfile: async (profileData) => {
      baseHook.setError(null);
      try {
        const result = await driverRepo.createProfile(profileData);
        return { success: true, data: result };
      } catch (error) {
        baseHook.setError(error.message);
        return { success: false, error: error.message };
      }
    },
    
    findByUserId: async (uid) => {
      baseHook.setError(null);
      try {
        const result = await driverRepo.findByUserId(uid);
        return { success: true, data: result };
      } catch (error) {
        baseHook.setError(error.message);
        return { success: false, error: error.message };
      }
    },
    
    findByPhoneNumber: async (phoneNumber) => {
      baseHook.setError(null);
      try {
        const result = await driverRepo.findByPhoneNumber(phoneNumber);
        return { success: true, data: result };
      } catch (error) {
        baseHook.setError(error.message);
        return { success: false, error: error.message };
      }
    },
    
    searchByName: async (searchTerm) => {
      baseHook.setError(null);
      try {
        const result = await driverRepo.searchByName(searchTerm);
        return { success: true, data: result };
      } catch (error) {
        baseHook.setError(error.message);
        return { success: false, error: error.message };
      }
    },
    
    getPendingRegistrations: async () => {
      baseHook.setError(null);
      try {
        const result = await driverRepo.getPendingRegistrations();
        return { success: true, data: result };
      } catch (error) {
        baseHook.setError(error.message);
        return { success: false, error: error.message };
      }
    },
    
    updateProfessionalInfo: async (uid, professionalInfo) => {
      baseHook.setError(null);
      try {
        const result = await driverRepo.updateProfessionalInfo(uid, professionalInfo);
        return { success: true, data: result };
      } catch (error) {
        baseHook.setError(error.message);
        return { success: false, error: error.message };
      }
    }
  };
}

/**
 * Custom hook for postal operations
 * @returns {Object} Postal-specific operations
 */
export function usePostals() {
  const baseHook = useFirestore('postalProfiles');
  
  return {
    ...baseHook,
    createProfile: async (profileData) => {
      baseHook.setError(null);
      try {
        const result = await postalRepo.createProfile(profileData);
        return { success: true, data: result };
      } catch (error) {
        baseHook.setError(error.message);
        return { success: false, error: error.message };
      }
    },
    
    findByUserId: async (uid) => {
      baseHook.setError(null);
      try {
        const result = await postalRepo.findByUserId(uid);
        return { success: true, data: result };
      } catch (error) {
        baseHook.setError(error.message);
        return { success: false, error: error.message };
      }
    },
    
    searchByName: async (searchTerm) => {
      baseHook.setError(null);
      try {
        const result = await postalRepo.searchByName(searchTerm);
        return { success: true, data: result };
      } catch (error) {
        baseHook.setError(error.message);
        return { success: false, error: error.message };
      }
    },
    
    findByDepartment: async (department) => {
      baseHook.setError(null);
      try {
        const result = await postalRepo.findByDepartment(department);
        return { success: true, data: result };
      } catch (error) {
        baseHook.setError(error.message);
        return { success: false, error: error.message };
      }
    }
  };
}

/**
 * Custom hook for tracking sessions
 * @returns {Object} Tracking session operations
 */
export function useTrackingSessions() {
  const baseHook = useFirestore('trackingSessions');
  
  return {
    ...baseHook,
    findBySessionId: async (sessionId) => {
      baseHook.setError(null);
      try {
        const result = await trackingRepo.findBySessionId(sessionId);
        return { success: true, data: result };
      } catch (error) {
        baseHook.setError(error.message);
        return { success: false, error: error.message };
      }
    },
    
    findActiveByVehicleId: async (vehicleId) => {
      baseHook.setError(null);
      try {
        const result = await trackingRepo.findActiveByVehicleId(vehicleId);
        return { success: true, data: result };
      } catch (error) {
        baseHook.setError(error.message);
        return { success: false, error: error.message };
      }
    },
    
    findByDriverUid: async (driverUid, status) => {
      baseHook.setError(null);
      try {
        const result = await trackingRepo.findByDriverUid(driverUid, status);
        return { success: true, data: result };
      } catch (error) {
        baseHook.setError(error.message);
        return { success: false, error: error.message };
      }
    },
    
    addLocation: async (sessionDocId, locationData) => {
      baseHook.setError(null);
      try {
        const result = await trackingRepo.addLocation(sessionDocId, locationData);
        return { success: true, data: result };
      } catch (error) {
        baseHook.setError(error.message);
        return { success: false, error: error.message };
      }
    },
    
    getSessionLocations: async (sessionDocId, limitCount) => {
      baseHook.setError(null);
      try {
        const result = await trackingRepo.getSessionLocations(sessionDocId, limitCount);
        return { success: true, data: result };
      } catch (error) {
        baseHook.setError(error.message);
        return { success: false, error: error.message };
      }
    }
  };
}

/**
 * Custom hook for alerts
 * @returns {Object} Alert operations
 */
export function useAlerts() {
  const baseHook = useFirestore('alerts');
  
  return {
    ...baseHook,
    findByVehicleId: async (vehicleId, alertType) => {
      baseHook.setError(null);
      try {
        const result = await alertRepo.findByVehicleId(vehicleId, alertType);
        return { success: true, data: result };
      } catch (error) {
        baseHook.setError(error.message);
        return { success: false, error: error.message };
      }
    },
    
    findByBusinessUid: async (businessUid, severity) => {
      baseHook.setError(null);
      try {
        const result = await alertRepo.findByBusinessUid(businessUid, severity);
        return { success: true, data: result };
      } catch (error) {
        baseHook.setError(error.message);
        return { success: false, error: error.message };
      }
    },
    
    getUnacknowledgedAlerts: async (businessUid) => {
      baseHook.setError(null);
      try {
        const result = await alertRepo.getUnacknowledgedAlerts(businessUid);
        return { success: true, data: result };
      } catch (error) {
        baseHook.setError(error.message);
        return { success: false, error: error.message };
      }
    },
    
    acknowledgeAlert: async (alertId, acknowledgedBy) => {
      baseHook.setError(null);
      try {
        const result = await alertRepo.acknowledgeAlert(alertId, acknowledgedBy);
        return { success: true, data: result };
      } catch (error) {
        baseHook.setError(error.message);
        return { success: false, error: error.message };
      }
    },
    
    createAlert: async (alertData) => {
      baseHook.setError(null);
      try {
        const result = await alertRepo.createAlert(alertData);
        return { success: true, data: result };
      } catch (error) {
        baseHook.setError(error.message);
        return { success: false, error: error.message };
      }
    }
  };
}

/**
 * Custom hook for real-time data subscription
 * @param {string} collectionName - Collection to subscribe to
 * @param {Array} conditions - Query conditions
 * @param {string} orderByField - Field to order by
 * @returns {Object} Real-time data and controls
 */
export function useRealtimeData(collectionName, conditions = [], orderByField = 'createdAt') {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let unsubscribe;
    
    try {
      const { subscribe } = useFirestore(collectionName);
      
      unsubscribe = subscribe(
        (documents) => {
          setData(documents);
          setLoading(false);
        },
        conditions,
        orderByField,
        'desc'
      );
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [collectionName, JSON.stringify(conditions), orderByField]);

  return { data, loading, error };
}