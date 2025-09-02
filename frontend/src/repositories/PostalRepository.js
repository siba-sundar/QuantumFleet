import { BaseRepository } from "./BaseRepository.js";

/**
 * PostalRepository handles operations for postal department user profiles
 */
export class PostalRepository extends BaseRepository {
  constructor() {
    super('postalProfiles');
  }

  /**
   * Create or update a postal profile using the user's UID as document ID
   * @param {Object} profileData - Profile data including uid
   * @returns {Promise<Object>} Created/updated profile
   */
  async createProfile(profileData) {
    try {
      const { uid, ...data } = profileData;
      if (!uid) {
        throw new Error('UID is required for creating postal profile');
      }
      return await this.upsert(uid, data);
    } catch (error) {
      console.error('Error creating postal profile:', error);
      throw error;
    }
  }

  /**
   * Find postal profile by user ID
   * @param {string} uid - User ID
   * @returns {Promise<Object|null>} Postal profile or null
   */
  async findByUserId(uid) {
    try {
      return await this.findById(uid);
    } catch (error) {
      console.error('Error finding postal profile by user ID:', error);
      throw error;
    }
  }

  /**
   * Find postal profiles by department
   * @param {string} department - Department name
   * @returns {Promise<Array>} Array of profiles in the department
   */
  async findByDepartment(department) {
    try {
      return await this.findWhere([
        { field: 'department', operator: '==', value: department }
      ]);
    } catch (error) {
      console.error('Error finding postal profiles by department:', error);
      throw error;
    }
  }

  /**
   * Find postal profiles by designation
   * @param {string} designation - Job designation
   * @returns {Promise<Array>} Array of profiles with the designation
   */
  async findByDesignation(designation) {
    try {
      return await this.findWhere([
        { field: 'designation', operator: '==', value: designation }
      ]);
    } catch (error) {
      console.error('Error finding postal profiles by designation:', error);
      throw error;
    }
  }

  /**
   * Search postal profiles by name
   * @param {string} searchTerm - Search term for first or last name
   * @returns {Promise<Array>} Array of matching postal profiles
   */
  async searchByName(searchTerm) {
    try {
      const searchTermLower = searchTerm.toLowerCase();
      
      // Get all postal profiles and filter client-side
      const allProfiles = await this.findAll();
      
      return allProfiles.filter(profile => {
        const firstName = profile.personalInfo?.firstName?.toLowerCase() || '';
        const lastName = profile.personalInfo?.lastName?.toLowerCase() || '';
        
        return firstName.includes(searchTermLower) || 
               lastName.includes(searchTermLower);
      });
    } catch (error) {
      console.error('Error searching postal profiles by name:', error);
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
      console.error('Error updating postal personal info:', error);
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
      console.error('Error updating postal address:', error);
      throw error;
    }
  }

  /**
   * Update department information
   * @param {string} uid - User ID
   * @param {string} department - New department
   * @returns {Promise<Object>} Updated profile
   */
  async updateDepartment(uid, department) {
    try {
      return await this.update(uid, {
        department: department
      });
    } catch (error) {
      console.error('Error updating department:', error);
      throw error;
    }
  }

  /**
   * Update designation
   * @param {string} uid - User ID
   * @param {string} designation - New designation
   * @returns {Promise<Object>} Updated profile
   */
  async updateDesignation(uid, designation) {
    try {
      return await this.update(uid, {
        designation: designation
      });
    } catch (error) {
      console.error('Error updating designation:', error);
      throw error;
    }
  }

  /**
   * Get postal staff by department hierarchy
   * @param {string} department - Department to filter by
   * @param {string} designation - Optional designation filter
   * @returns {Promise<Array>} Array of postal staff
   */
  async getStaffByDepartment(department, designation = null) {
    try {
      const conditions = [
        { field: 'department', operator: '==', value: department }
      ];
      
      if (designation) {
        conditions.push({ field: 'designation', operator: '==', value: designation });
      }
      
      return await this.findWhere(conditions, 'createdAt', 'desc');
    } catch (error) {
      console.error('Error getting staff by department:', error);
      throw error;
    }
  }

  /**
   * Get recent postal registrations
   * @param {number} limitCount - Number of recent registrations to get
   * @returns {Promise<Array>} Array of recent postal profiles
   */
  async getRecentRegistrations(limitCount = 10) {
    try {
      return await this.findAll('createdAt', 'desc', limitCount);
    } catch (error) {
      console.error('Error getting recent postal registrations:', error);
      throw error;
    }
  }

  /**
   * Get all departments
   * @returns {Promise<Array>} Array of unique department names
   */
  async getAllDepartments() {
    try {
      const allProfiles = await this.findAll();
      const departments = [...new Set(allProfiles.map(profile => profile.department).filter(Boolean))];
      return departments.sort();
    } catch (error) {
      console.error('Error getting all departments:', error);
      throw error;
    }
  }

  /**
   * Get all designations
   * @param {string} department - Optional department filter
   * @returns {Promise<Array>} Array of unique designation names
   */
  async getAllDesignations(department = null) {
    try {
      let profiles;
      if (department) {
        profiles = await this.findByDepartment(department);
      } else {
        profiles = await this.findAll();
      }
      
      const designations = [...new Set(profiles.map(profile => profile.designation).filter(Boolean))];
      return designations.sort();
    } catch (error) {
      console.error('Error getting all designations:', error);
      throw error;
    }
  }

  /**
   * Get postal staff statistics by department
   * @returns {Promise<Object>} Statistics object with department counts
   */
  async getDepartmentStatistics() {
    try {
      const allProfiles = await this.findAll();
      const stats = {};
      
      allProfiles.forEach(profile => {
        const department = profile.department || 'Unknown';
        stats[department] = (stats[department] || 0) + 1;
      });
      
      return stats;
    } catch (error) {
      console.error('Error getting department statistics:', error);
      throw error;
    }
  }
}