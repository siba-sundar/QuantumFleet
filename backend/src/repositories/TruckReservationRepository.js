import { BaseRepository } from './BaseRepository.js';
import { v4 as uuidv4 } from 'uuid';

export class TruckReservationRepository extends BaseRepository {
  constructor() {
    super('truckReservations');
  }

  /**
   * Create a new truck reservation
   * @param {Object} reservationData - Reservation data
   * @returns {Promise<Object>} Created reservation
   */
  async createReservation(reservationData) {
    try {
      const reservation = {
        ...reservationData,
        reservationId: uuidv4(),
        status: 'confirmed', // Changed from 'pending' to 'confirmed' so trucks appear in tracking
        totalCost: this.calculateTotalCost(reservationData.trucks),
        paymentStatus: 'pending'
      };
      
      return await this.create(reservation);
    } catch (error) {
      console.error('Error creating truck reservation:', error);
      throw error;
    }
  }

  /**
   * Find reservations by business UID
   * @param {string} businessUid - Business user ID
   * @param {string} status - Optional status filter
   * @returns {Promise<Array>} Array of reservations
   */
  async findByBusinessUid(businessUid, status = null) {
    try {
      const conditions = [
        { field: 'businessUid', operator: '==', value: businessUid }
      ];
      if (status) {
        conditions.push({ field: 'status', operator: '==', value: status });
      }
      // Avoid composite index requirement: do not orderBy in Firestore; sort in memory
      const results = await this.findWhere(conditions, null, 'desc');
      return results.sort((a, b) => {
        const ta = a?.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a?.createdAt || 0).getTime();
        const tb = b?.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b?.createdAt || 0).getTime();
        return tb - ta;
      });
    } catch (error) {
      console.error('Error finding reservations by business UID:', error);
      throw error;
    }
  }

  /**
   * Find reservations by status
   * @param {string} status - Reservation status
   * @returns {Promise<Array>} Array of reservations
   */
  async findByStatus(status) {
    try {
      const results = await this.findWhere([
        { field: 'status', operator: '==', value: status }
      ], null, 'desc');
      return results.sort((a, b) => {
        const ta = a?.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a?.createdAt || 0).getTime();
        const tb = b?.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b?.createdAt || 0).getTime();
        return tb - ta;
      });
    } catch (error) {
      console.error('Error finding reservations by status:', error);
      throw error;
    }
  }

  /**
   * Update reservation status
   * @param {string} reservationId - Reservation document ID
   * @param {string} status - New status
   * @returns {Promise<Object>} Updated reservation
   */
  async updateStatus(reservationId, status) {
    try {
      const updateData = { status };
      
      // Add timestamps for specific status changes
      if (status === 'confirmed') {
        updateData.confirmedAt = new Date();
      } else if (status === 'cancelled') {
        updateData.cancelledAt = new Date();
      } else if (status === 'completed') {
        updateData.completedAt = new Date();
      }
      
      return await this.update(reservationId, updateData);
    } catch (error) {
      console.error('Error updating reservation status:', error);
      throw error;
    }
  }

  /**
   * Update payment status
   * @param {string} reservationId - Reservation document ID
   * @param {string} paymentStatus - New payment status
   * @param {Object} paymentDetails - Payment details
   * @returns {Promise<Object>} Updated reservation
   */
  async updatePaymentStatus(reservationId, paymentStatus, paymentDetails = {}) {
    try {
      const updateData = {
        paymentStatus,
        paymentDetails,
        ...(paymentStatus === 'paid' && { paidAt: new Date() })
      };
      
      return await this.update(reservationId, updateData);
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  }

  /**
   * Get reservation statistics
   * @param {string} businessUid - Optional business UID filter
   * @returns {Promise<Object>} Reservation statistics
   */
  async getStatistics(businessUid = null) {
    try {
      let reservations;
      if (businessUid) {
        reservations = await this.findByBusinessUid(businessUid);
      } else {
        reservations = await this.findAll();
      }
      
      const stats = {
        total: reservations.length,
        pending: reservations.filter(r => r.status === 'pending').length,
        confirmed: reservations.filter(r => r.status === 'confirmed').length,
        inProgress: reservations.filter(r => r.status === 'in-progress').length,
        completed: reservations.filter(r => r.status === 'completed').length,
        cancelled: reservations.filter(r => r.status === 'cancelled').length,
        totalRevenue: reservations
          .filter(r => r.paymentStatus === 'paid')
          .reduce((sum, r) => sum + (r.totalCost || 0), 0)
      };
      
      return stats;
    } catch (error) {
      console.error('Error getting reservation statistics:', error);
      throw error;
    }
  }

  /**
   * Calculate total cost for trucks
   * @param {Array} trucks - Array of truck data
   * @returns {number} Total calculated cost
   */
  calculateTotalCost(trucks) {
    const baseCost = 1000;
    const costPerKm = 2;
    const costPerKg = 0.5;
    const costPerCheckpoint = 100;

    return trucks.reduce((total, truck) => {
      // Estimate distance (in real implementation, would use Google Maps API)
      const estimatedDistance = Math.random() * 1000 + 100; // Mock distance
      
      const truckCost = baseCost +
        estimatedDistance * costPerKm +
        truck.checkpoints.reduce((sum, cp) => sum + parseInt(cp.weight || 0) * costPerKg, 0) +
        truck.checkpoints.length * costPerCheckpoint;
      
      return total + truckCost;
    }, 0);
  }

  /**
   * Find reservations by date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Array of reservations in date range
   */
  async findByDateRange(startDate, endDate) {
    try {
      const reservations = await this.findAll();
      
      return reservations.filter(reservation => {
        const createdAt = new Date(reservation.createdAt.seconds * 1000);
        return createdAt >= startDate && createdAt <= endDate;
      });
    } catch (error) {
      console.error('Error finding reservations by date range:', error);
      throw error;
    }
  }

  /**
   * Get upcoming pickups
   * @param {number} daysAhead - Number of days to look ahead
   * @returns {Promise<Array>} Array of upcoming reservations
   */
  async getUpcomingPickups(daysAhead = 7) {
    try {
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(now.getDate() + daysAhead);
      
  const reservations = await this.findByStatus('confirmed');
      
      return reservations.filter(reservation => {
        return reservation.trucks.some(truck => {
          const pickupDate = new Date(truck.pickupDate);
          return pickupDate >= now && pickupDate <= futureDate;
        });
      });
    } catch (error) {
      console.error('Error getting upcoming pickups:', error);
      throw error;
    }
  }
}