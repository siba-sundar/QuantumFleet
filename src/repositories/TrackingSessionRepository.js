import { BaseRepository } from "./BaseRepository.js";
import { collection, doc, addDoc, getDocs, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase.js";

/**
 * TrackingSessionRepository handles operations for tracking sessions
 */
export class TrackingSessionRepository extends BaseRepository {
  constructor() {
    super('trackingSessions');
  }

  /**
   * Find tracking session by session ID
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object|null>} Tracking session or null
   */
  async findBySessionId(sessionId) {
    try {
      const sessions = await this.findWhere([
        { field: 'sessionId', operator: '==', value: sessionId }
      ]);
      return sessions.length > 0 ? sessions[0] : null;
    } catch (error) {
      console.error('Error finding tracking session by session ID:', error);
      throw error;
    }
  }

  /**
   * Find active tracking sessions by vehicle ID
   * @param {string} vehicleId - Vehicle ID
   * @returns {Promise<Array>} Array of active tracking sessions
   */
  async findActiveByVehicleId(vehicleId) {
    try {
      return await this.findWhere([
        { field: 'vehicleId', operator: '==', value: vehicleId },
        { field: 'status', operator: '==', value: 'active' }
      ]);
    } catch (error) {
      console.error('Error finding active sessions by vehicle ID:', error);
      throw error;
    }
  }

  /**
   * Find tracking sessions by driver UID
   * @param {string} driverUid - Driver user ID
   * @param {string} status - Optional status filter
   * @returns {Promise<Array>} Array of tracking sessions
   */
  async findByDriverUid(driverUid, status = null) {
    try {
      const conditions = [
        { field: 'driverUid', operator: '==', value: driverUid }
      ];
      
      if (status) {
        conditions.push({ field: 'status', operator: '==', value: status });
      }
      
      return await this.findWhere(conditions, 'startedAt', 'desc');
    } catch (error) {
      console.error('Error finding sessions by driver UID:', error);
      throw error;
    }
  }

  /**
   * Find tracking sessions by business UID
   * @param {string} businessUid - Business user ID
   * @param {string} status - Optional status filter
   * @returns {Promise<Array>} Array of tracking sessions
   */
  async findByBusinessUid(businessUid, status = null) {
    try {
      const conditions = [
        { field: 'businessUid', operator: '==', value: businessUid }
      ];
      
      if (status) {
        conditions.push({ field: 'status', operator: '==', value: status });
      }
      
      return await this.findWhere(conditions, 'startedAt', 'desc');
    } catch (error) {
      console.error('Error finding sessions by business UID:', error);
      throw error;
    }
  }

  /**
   * Find tracking sessions by driver phone number
   * @param {string} driverPhone - Driver phone number
   * @param {string} status - Optional status filter
   * @returns {Promise<Array>} Array of tracking sessions
   */
  async findByDriverPhone(driverPhone, status = null) {
    try {
      const conditions = [
        { field: 'driverPhone', operator: '==', value: driverPhone }
      ];
      
      if (status) {
        conditions.push({ field: 'status', operator: '==', value: status });
      }
      
      return await this.findWhere(conditions, 'startedAt', 'desc');
    } catch (error) {
      console.error('Error finding sessions by driver phone:', error);
      throw error;
    }
  }

  /**
   * Get active tracking sessions
   * @returns {Promise<Array>} Array of active tracking sessions
   */
  async getActiveSessions() {
    try {
      return await this.findWhere([
        { field: 'status', operator: '==', value: 'active' }
      ], 'startedAt', 'desc');
    } catch (error) {
      console.error('Error getting active sessions:', error);
      throw error;
    }
  }

  /**
   * Get expired sessions that haven't been updated
   * @returns {Promise<Array>} Array of expired sessions
   */
  async getExpiredSessions() {
    try {
      const currentTime = new Date();
      const allActiveSessions = await this.getActiveSessions();
      
      return allActiveSessions.filter(session => {
        if (session.expiresAt) {
          const expirationTime = new Date(session.expiresAt.seconds * 1000);
          return expirationTime < currentTime;
        }
        return false;
      });
    } catch (error) {
      console.error('Error getting expired sessions:', error);
      throw error;
    }
  }

  /**
   * Add location data to a tracking session
   * @param {string} sessionDocId - Session document ID
   * @param {Object} locationData - Location data to add
   * @returns {Promise<Object>} Added location document
   */
  async addLocation(sessionDocId, locationData) {
    try {
      const sessionDocRef = doc(db, 'trackingSessions', sessionDocId);
      const locationsCollection = collection(sessionDocRef, 'locations');
      
      const locationDoc = await addDoc(locationsCollection, {
        ...locationData,
        createdAt: serverTimestamp()
      });
      
      // Update session's lastLocationUpdate
      await this.update(sessionDocId, {
        lastLocationUpdate: serverTimestamp()
      });
      
      return { id: locationDoc.id, ...locationData };
    } catch (error) {
      console.error('Error adding location to session:', error);
      throw error;
    }
  }

  /**
   * Get locations for a tracking session
   * @param {string} sessionDocId - Session document ID
   * @param {number} limitCount - Optional limit for number of locations
   * @returns {Promise<Array>} Array of location documents
   */
  async getSessionLocations(sessionDocId, limitCount = null) {
    try {
      const sessionDocRef = doc(db, 'trackingSessions', sessionDocId);
      const locationsCollection = collection(sessionDocRef, 'locations');
      
      let q = query(locationsCollection, orderBy('createdAt', 'desc'));
      
      if (limitCount) {
        q = query(q, limit(limitCount));
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting session locations:', error);
      throw error;
    }
  }

  /**
   * Update session status
   * @param {string} sessionDocId - Session document ID
   * @param {string} status - New status (active, expired, completed, cancelled)
   * @returns {Promise<Object>} Updated session
   */
  async updateSessionStatus(sessionDocId, status) {
    try {
      return await this.update(sessionDocId, {
        status: status,
        ...(status === 'completed' && { completedAt: serverTimestamp() }),
        ...(status === 'cancelled' && { cancelledAt: serverTimestamp() })
      });
    } catch (error) {
      console.error('Error updating session status:', error);
      throw error;
    }
  }

  /**
   * Update driver consent
   * @param {string} sessionDocId - Session document ID
   * @param {boolean} consent - Driver consent status
   * @returns {Promise<Object>} Updated session
   */
  async updateDriverConsent(sessionDocId, consent) {
    try {
      return await this.update(sessionDocId, {
        driverConsent: consent,
        consentTimestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating driver consent:', error);
      throw error;
    }
  }

  /**
   * Create a new tracking session
   * @param {Object} sessionData - Session data
   * @returns {Promise<Object>} Created session
   */
  async createSession(sessionData) {
    try {
      const session = await this.create({
        ...sessionData,
        status: 'active',
        driverConsent: false,
        startedAt: serverTimestamp(),
        lastLocationUpdate: serverTimestamp()
      });
      
      return session;
    } catch (error) {
      console.error('Error creating tracking session:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time session updates
   * @param {string} sessionDocId - Session document ID
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribeToSession(sessionDocId, callback) {
    try {
      return this.subscribeToDocument(sessionDocId, callback);
    } catch (error) {
      console.error('Error subscribing to session:', error);
      throw error;
    }
  }

  /**
   * Subscribe to session locations
   * @param {string} sessionDocId - Session document ID
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribeToSessionLocations(sessionDocId, callback) {
    try {
      const sessionDocRef = doc(db, 'trackingSessions', sessionDocId);
      const locationsCollection = collection(sessionDocRef, 'locations');
      
      const q = query(locationsCollection, orderBy('createdAt', 'desc'));
      
      return onSnapshot(q, (querySnapshot) => {
        const locations = querySnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }));
        callback(locations);
      }, (error) => {
        console.error('Error in location subscription:', error);
      });
    } catch (error) {
      console.error('Error setting up location subscription:', error);
      throw error;
    }
  }

  /**
   * Get session statistics
   * @param {string} businessUid - Optional business UID filter
   * @returns {Promise<Object>} Session statistics
   */
  async getSessionStatistics(businessUid = null) {
    try {
      let sessions;
      if (businessUid) {
        sessions = await this.findByBusinessUid(businessUid);
      } else {
        sessions = await this.findAll();
      }
      
      const stats = {
        total: sessions.length,
        active: sessions.filter(s => s.status === 'active').length,
        completed: sessions.filter(s => s.status === 'completed').length,
        expired: sessions.filter(s => s.status === 'expired').length,
        cancelled: sessions.filter(s => s.status === 'cancelled').length
      };
      
      return stats;
    } catch (error) {
      console.error('Error getting session statistics:', error);
      throw error;
    }
  }
}