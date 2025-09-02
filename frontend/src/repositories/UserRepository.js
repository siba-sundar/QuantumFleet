import { BaseRepository } from "./BaseRepository.js";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase.js";

/**
 * UserRepository handles operations for the main users collection
 */
export class UserRepository extends BaseRepository {
  constructor() {
    super('users');
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<Object|null>} User data or null
   */
  async findByEmail(email) {
    try {
      const users = await this.findWhere([
        { field: 'email', operator: '==', value: email }
      ]);
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  /**
   * Find user by phone number
   * @param {string} phoneNumber - User phone number
   * @returns {Promise<Object|null>} User data or null
   */
  async findByPhoneNumber(phoneNumber) {
    try {
      const users = await this.findWhere([
        { field: 'phoneNumber', operator: '==', value: phoneNumber }
      ]);
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      console.error('Error finding user by phone number:', error);
      throw error;
    }
  }

  /**
   * Find users by type
   * @param {string} userType - Type of user (business, driver, postal)
   * @returns {Promise<Array>} Array of users
   */
  async findByUserType(userType) {
    try {
      return await this.findWhere([
        { field: 'userType', operator: '==', value: userType }
      ]);
    } catch (error) {
      console.error('Error finding users by type:', error);
      throw error;
    }
  }

  /**
   * Get active users
   * @param {string} userType - Optional user type filter
   * @returns {Promise<Array>} Array of active users
   */
  async getActiveUsers(userType = null) {
    try {
      const conditions = [
        { field: 'isActive', operator: '==', value: true }
      ];
      
      if (userType) {
        conditions.push({ field: 'userType', operator: '==', value: userType });
      }
      
      return await this.findWhere(conditions);
    } catch (error) {
      console.error('Error getting active users:', error);
      throw error;
    }
  }

  /**
   * Update user's last login timestamp
   * @param {string} uid - User ID
   * @returns {Promise<void>}
   */
  async updateLastLogin(uid) {
    try {
      await this.update(uid, {
        lastLogin: new Date()
      });
    } catch (error) {
      console.error('Error updating last login:', error);
      throw error;
    }
  }

  /**
   * Toggle user active status
   * @param {string} uid - User ID
   * @param {boolean} isActive - Active status
   * @returns {Promise<Object>} Updated user data
   */
  async toggleActiveStatus(uid, isActive) {
    try {
      return await this.update(uid, {
        isActive: isActive
      });
    } catch (error) {
      console.error('Error toggling user active status:', error);
      throw error;
    }
  }

  /**
   * Verify user's email
   * @param {string} uid - User ID
   * @returns {Promise<Object>} Updated user data
   */
  async verifyEmail(uid) {
    try {
      return await this.update(uid, {
        isEmailVerified: true
      });
    } catch (error) {
      console.error('Error verifying email:', error);
      throw error;
    }
  }

  /**
   * Verify user's phone
   * @param {string} uid - User ID
   * @returns {Promise<Object>} Updated user data
   */
  async verifyPhone(uid) {
    try {
      return await this.update(uid, {
        isPhoneVerified: true
      });
    } catch (error) {
      console.error('Error verifying phone:', error);
      throw error;
    }
  }
}