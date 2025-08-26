import { BaseRepository } from "./BaseRepository.js";

/**
 * BusinessRepository handles operations for business user profiles
 */
export class BusinessRepository extends BaseRepository {
  constructor() {
    super('businessProfiles');
  }

  /**
   * Create or update a business profile using the user's UID as document ID
   * @param {Object} profileData - Profile data including uid
   * @returns {Promise<Object>} Created/updated profile
   */
  async createProfile(profileData) {
    try {
      const { uid, ...data } = profileData;
      if (!uid) {
        throw new Error('UID is required for creating business profile');
      }
      return await this.upsert(uid, data);
    } catch (error) {
      console.error('Error creating business profile:', error);
      throw error;
    }
  }

  /**
   * Find business profile by user ID
   * @param {string} uid - User ID
   * @returns {Promise<Object|null>} Business profile or null
   */
  async findByUserId(uid) {
    try {
      return await this.findById(uid);
    } catch (error) {
      console.error('Error finding business profile by user ID:', error);
      throw error;
    }
  }

  /**
   * Find business profiles by firm name
   * @param {string} firmName - Firm name to search for
   * @returns {Promise<Array>} Array of matching business profiles
   */
  async findByFirmName(firmName) {
    try {
      return await this.findWhere([
        { field: 'businessInfo.firmName', operator: '==', value: firmName }
      ]);
    } catch (error) {
      console.error('Error finding business profiles by firm name:', error);
      throw error;
    }
  }

  /**
   * Find business profiles by business type
   * @param {string} businessType - Type of business
   * @returns {Promise<Array>} Array of matching business profiles
   */
  async findByBusinessType(businessType) {
    try {
      return await this.findWhere([
        { field: 'businessInfo.businessType', operator: '==', value: businessType }
      ]);
    } catch (error) {
      console.error('Error finding business profiles by business type:', error);
      throw error;
    }
  }

  /**
   * Find business profiles by postal branch
   * @param {string} postalBranch - Postal branch
   * @returns {Promise<Array>} Array of matching business profiles
   */
  async findByPostalBranch(postalBranch) {
    try {
      return await this.findWhere([
        { field: 'businessInfo.postalBranch', operator: '==', value: postalBranch }
      ]);
    } catch (error) {
      console.error('Error finding business profiles by postal branch:', error);
      throw error;
    }
  }

  /**
   * Search business profiles by name
   * @param {string} searchTerm - Search term for first or last name
   * @returns {Promise<Array>} Array of matching business profiles
   */
  async searchByName(searchTerm) {
    try {
      const searchTermLower = searchTerm.toLowerCase();
      
      // Get all business profiles and filter client-side
      // Note: Firestore doesn't support complex text search, so we fetch all and filter
      const allProfiles = await this.findAll();
      
      return allProfiles.filter(profile => {
        const firstName = profile.personalInfo?.firstName?.toLowerCase() || '';
        const lastName = profile.personalInfo?.lastName?.toLowerCase() || '';
        const firmName = profile.businessInfo?.firmName?.toLowerCase() || '';
        
        return firstName.includes(searchTermLower) || 
               lastName.includes(searchTermLower) ||
               firmName.includes(searchTermLower);
      });
    } catch (error) {
      console.error('Error searching business profiles by name:', error);
      throw error;
    }
  }

  /**
   * Update business information
   * @param {string} uid - User ID
   * @param {Object} businessInfo - Business information to update
   * @returns {Promise<Object>} Updated profile
   */
  async updateBusinessInfo(uid, businessInfo) {
    try {
      return await this.update(uid, {
        businessInfo: businessInfo
      });
    } catch (error) {
      console.error('Error updating business info:', error);
      throw error;
    }
  }

  /**
   * Update personal information
   * @param {string} uid - User ID
   * @param {Object} personalInfo - Personal information to update
   * @returns {Promise<Object>} Updated profile
   */
  async updatePersonalInfo(uid, personalInfo) {
    try {
      return await this.update(uid, {
        personalInfo: personalInfo
      });
    } catch (error) {
      console.error('Error updating personal info:', error);
      throw error;
    }
  }

  /**
   * Update address information
   * @param {string} uid - User ID
   * @param {Object} address - Address information to update
   * @returns {Promise<Object>} Updated profile
   */
  async updateAddress(uid, address) {
    try {
      return await this.update(uid, {
        address: address
      });
    } catch (error) {
      console.error('Error updating address:', error);
      throw error;
    }
  }

  /**
   * Get business profiles for a specific postal branch
   * @param {string} postalBranch - Postal branch name
   * @returns {Promise<Array>} Array of business profiles
   */
  async getProfilesByPostalBranch(postalBranch) {
    try {
      return await this.findWhere([
        { field: 'businessInfo.postalBranch', operator: '==', value: postalBranch }
      ], 'createdAt', 'desc');
    } catch (error) {
      console.error('Error getting profiles by postal branch:', error);
      throw error;
    }
  }

  /**
   * Get recent business registrations
   * @param {number} limitCount - Number of recent registrations to get
   * @returns {Promise<Array>} Array of recent business profiles
   */
  async getRecentRegistrations(limitCount = 10) {
    try {
      return await this.findAll('createdAt', 'desc', limitCount);
    } catch (error) {
      console.error('Error getting recent registrations:', error);
      throw error;
    }
  }
}