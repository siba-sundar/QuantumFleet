import { BaseRepository } from "./BaseRepository.js";

/**
 * DriverRepository handles operations for driver profiles
 */
export class DriverRepository extends BaseRepository {
  constructor() {
    super('driverProfiles');
  }

  /**
   * Create or update a driver profile using the user's UID as document ID
   * @param {Object} profileData - Profile data including uid
   * @returns {Promise<Object>} Created/updated profile
   */
  async createProfile(profileData) {
    try {
      const { uid, ...data } = profileData;
      if (!uid) {
        throw new Error('UID is required for creating driver profile');
      }
      return await this.upsert(uid, data);
    } catch (error) {
      console.error('Error creating driver profile:', error);
      throw error;
    }
  }

  /**
   * Find driver profile by user ID
   * @param {string} uid - User ID
   * @returns {Promise<Object|null>} Driver profile or null
   */
  async findByUserId(uid) {
    try {
      return await this.findById(uid);
    } catch (error) {
      console.error('Error finding driver profile by user ID:', error);
      throw error;
    }
  }

  /**
   * Find driver by phone number
   * @param {string} phoneNumber - Driver phone number
   * @returns {Promise<Object|null>} Driver profile or null
   */
  async findByPhoneNumber(phoneNumber) {
    try {
      const drivers = await this.findWhere([
        { field: 'phoneNumber', operator: '==', value: phoneNumber }
      ]);
      return drivers.length > 0 ? drivers[0] : null;
    } catch (error) {
      console.error('Error finding driver by phone number:', error);
      throw error;
    }
  }

  /**
   * Find drivers by license number
   * @param {string} licenseNumber - License number
   * @returns {Promise<Array>} Array of drivers with matching license
   */
  async findByLicenseNumber(licenseNumber) {
    try {
      return await this.findWhere([
        { field: 'licenseInfo.licenseNumber', operator: '==', value: licenseNumber }
      ]);
    } catch (error) {
      console.error('Error finding drivers by license number:', error);
      throw error;
    }
  }

  /**
   * Find drivers by state of license issue
   * @param {string} stateOfIssue - State where license was issued
   * @returns {Promise<Array>} Array of drivers from the state
   */
  async findByStateOfIssue(stateOfIssue) {
    try {
      return await this.findWhere([
        { field: 'licenseInfo.stateOfIssue', operator: '==', value: stateOfIssue }
      ]);
    } catch (error) {
      console.error('Error finding drivers by state of issue:', error);
      throw error;
    }
  }

  /**
   * Find drivers by registration status
   * @param {string} status - Registration status (pending, completed)
   * @returns {Promise<Array>} Array of drivers with matching status
   */
  async findByRegistrationStatus(status) {
    try {
      return await this.findWhere([
        { field: 'registrationStatus', operator: '==', value: status }
      ]);
    } catch (error) {
      console.error('Error finding drivers by registration status:', error);
      throw error;
    }
  }

  /**
   * Search drivers by name
   * @param {string} searchTerm - Search term for first or last name
   * @returns {Promise<Array>} Array of matching driver profiles
   */
  async searchByName(searchTerm) {
    try {
      const searchTermLower = searchTerm.toLowerCase();
      
      // Get all driver profiles and filter client-side
      const allProfiles = await this.findAll();
      
      return allProfiles.filter(profile => {
        const firstName = profile.personalInfo?.firstName?.toLowerCase() || '';
        const lastName = profile.personalInfo?.lastName?.toLowerCase() || '';
        
        return firstName.includes(searchTermLower) || 
               lastName.includes(searchTermLower);
      });
    } catch (error) {
      console.error('Error searching driver profiles by name:', error);
      throw error;
    }
  }

  /**
   * Update driver personal information
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
      console.error('Error updating driver personal info:', error);
      throw error;
    }
  }

  /**
   * Update driver address information
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
      console.error('Error updating driver address:', error);
      throw error;
    }
  }

  /**
   * Update driver license information
   * @param {string} uid - User ID
   * @param {Object} licenseInfo - License information to update
   * @returns {Promise<Object>} Updated profile
   */
  async updateLicenseInfo(uid, licenseInfo) {
    try {
      return await this.update(uid, {
        licenseInfo: licenseInfo
      });
    } catch (error) {
      console.error('Error updating driver license info:', error);
      throw error;
    }
  }

  /**
   * Update driver background information
   * @param {string} uid - User ID
   * @param {Object} background - Background information to update
   * @returns {Promise<Object>} Updated profile
   */
  async updateBackground(uid, background) {
    try {
      return await this.update(uid, {
        background: background
      });
    } catch (error) {
      console.error('Error updating driver background:', error);
      throw error;
    }
  }

  /**
   * Update driver professional information
   * @param {string} uid - User ID
   * @param {Object} professionalInfo - Professional information to update
   * @returns {Promise<Object>} Updated profile
   */
  async updateProfessionalInfo(uid, professionalInfo) {
    try {
      return await this.update(uid, {
        professionalInfo: professionalInfo
      });
    } catch (error) {
      console.error('Error updating driver professional info:', error);
      throw error;
    }
  }

  /**
   * Update driver registration status
   * @param {string} uid - User ID
   * @param {string} status - New registration status
   * @returns {Promise<Object>} Updated profile
   */
  async updateRegistrationStatus(uid, status) {
    try {
      return await this.update(uid, {
        registrationStatus: status
      });
    } catch (error) {
      console.error('Error updating registration status:', error);
      throw error;
    }
  }

  /**
   * Get drivers with expiring licenses
   * @param {number} daysThreshold - Number of days before expiration to check
   * @returns {Promise<Array>} Array of drivers with expiring licenses
   */
  async getDriversWithExpiringLicenses(daysThreshold = 30) {
    try {
      const allDrivers = await this.findAll();
      const currentDate = new Date();
      const thresholdDate = new Date();
      thresholdDate.setDate(currentDate.getDate() + daysThreshold);
      
      return allDrivers.filter(driver => {
        if (driver.licenseInfo?.licenseExpiration) {
          const expirationDate = new Date(driver.licenseInfo.licenseExpiration);
          return expirationDate <= thresholdDate && expirationDate > currentDate;
        }
        return false;
      });
    } catch (error) {
      console.error('Error getting drivers with expiring licenses:', error);
      throw error;
    }
  }

  /**
   * Get verified drivers
   * @returns {Promise<Array>} Array of verified driver profiles
   */
  async getVerifiedDrivers() {
    try {
      return await this.findWhere([
        { field: 'isPhoneVerified', operator: '==', value: true },
        { field: 'registrationStatus', operator: '==', value: 'completed' }
      ]);
    } catch (error) {
      console.error('Error getting verified drivers:', error);
      throw error;
    }
  }

  /**
   * Get pending driver registrations
   * @returns {Promise<Array>} Array of pending driver registrations
   */
  async getPendingRegistrations() {
    try {
      return await this.findWhere([
        { field: 'registrationStatus', operator: '==', value: 'pending' }
      ], 'createdAt', 'desc');
    } catch (error) {
      console.error('Error getting pending registrations:', error);
      throw error;
    }
  }

  /**
   * Get recent driver registrations
   * @param {number} limitCount - Number of recent registrations to get
   * @returns {Promise<Array>} Array of recent driver profiles
   */
  async getRecentRegistrations(limitCount = 10) {
    try {
      return await this.findAll('createdAt', 'desc', limitCount);
    } catch (error) {
      console.error('Error getting recent driver registrations:', error);
      throw error;
    }
  }
}