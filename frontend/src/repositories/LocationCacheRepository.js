import { BaseRepository } from './BaseRepository.js';

/**
 * LocationCacheRepository - Manages location cache for performance optimization
 */
export class LocationCacheRepository extends BaseRepository {
  constructor() {
    super('locationCache');
  }

  /**
   * Generate a hash key for an address
   * @param {string} address - Address to hash
   * @returns {string} Hash key
   */
  generateAddressHash(address) {
    // Simple hash function for address
    let hash = 0;
    const normalizedAddress = address.toLowerCase().trim();
    
    if (normalizedAddress.length === 0) return '0';
    
    for (let i = 0; i < normalizedAddress.length; i++) {
      const char = normalizedAddress.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * Cache location data
   * @param {string} address - Original address
   * @param {Object} locationData - Location data to cache
   * @returns {Promise<Object>} Cache result
   */
  async cacheLocation(address, locationData) {
    try {
      const addressHash = this.generateAddressHash(address);
      const now = new Date();
      const expiryTime = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 days
      
      const cacheData = {
        id: addressHash,
        address: address.trim(),
        coordinates: {
          latitude: locationData.coordinates.lat,
          longitude: locationData.coordinates.lng
        },
        placeId: locationData.placeId,
        formattedAddress: locationData.address,
        addressComponents: locationData.addressComponents || {},
        placeTypes: locationData.types || [],
        placeName: locationData.name || '',
        plusCode: locationData.plusCode || '',
        usageCount: 1,
        lastUsed: now,
        createdAt: now,
        expiresAt: expiryTime
      };

      await this.upsert(addressHash, cacheData);
      
      return {
        success: true,
        cached: true,
        addressHash
      };
    } catch (error) {
      console.error('Error caching location:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get cached location data
   * @param {string} address - Address to lookup
   * @returns {Promise<Object|null>} Cached location data or null
   */
  async getCachedLocation(address) {
    try {
      const addressHash = this.generateAddressHash(address);
      const cached = await this.findById(addressHash);
      
      if (!cached) {
        return null;
      }

      // Check if cache has expired
      const now = new Date();
      if (cached.expiresAt && new Date(cached.expiresAt) < now) {
        // Cache expired, remove it
        await this.delete(addressHash);
        return null;
      }

      // Update usage statistics
      await this.update(addressHash, {
        lastUsed: now,
        usageCount: (cached.usageCount || 0) + 1
      });

      // Convert to standard location format
      return {
        address: cached.formattedAddress || cached.address,
        coordinates: {
          lat: cached.coordinates.latitude,
          lng: cached.coordinates.longitude
        },
        placeId: cached.placeId,
        addressComponents: cached.addressComponents,
        types: cached.placeTypes,
        name: cached.placeName,
        plusCode: cached.plusCode,
        cached: true,
        cacheTimestamp: cached.createdAt
      };
    } catch (error) {
      console.error('Error getting cached location:', error);
      return null;
    }
  }

  /**
   * Update cache usage statistics
   * @param {string} addressHash - Address hash
   * @returns {Promise<boolean>} Update success
   */
  async updateUsageStats(addressHash) {
    try {
      const cached = await this.findById(addressHash);
      if (!cached) return false;

      await this.update(addressHash, {
        lastUsed: new Date(),
        usageCount: (cached.usageCount || 0) + 1
      });

      return true;
    } catch (error) {
      console.error('Error updating usage stats:', error);
      return false;
    }
  }

  /**
   * Search for similar cached locations
   * @param {string} query - Search query
   * @param {number} limit - Maximum results to return
   * @returns {Promise<Array>} Similar cached locations
   */
  async searchSimilarCached(query, limit = 5) {
    try {
      const allCached = await this.findAll();
      const queryLower = query.toLowerCase();
      
      const similar = allCached
        .filter(cached => {
          const addressLower = (cached.address || '').toLowerCase();
          const formattedLower = (cached.formattedAddress || '').toLowerCase();
          
          return addressLower.includes(queryLower) || 
                 formattedLower.includes(queryLower) ||
                 (cached.placeName && cached.placeName.toLowerCase().includes(queryLower));
        })
        .sort((a, b) => {
          // Sort by usage count and recency
          const scoreA = (a.usageCount || 0) + (new Date(a.lastUsed || 0).getTime() / 1000000);
          const scoreB = (b.usageCount || 0) + (new Date(b.lastUsed || 0).getTime() / 1000000);
          return scoreB - scoreA;
        })
        .slice(0, limit)
        .map(cached => ({
          address: cached.formattedAddress || cached.address,
          coordinates: {
            lat: cached.coordinates.latitude,
            lng: cached.coordinates.longitude
          },
          placeId: cached.placeId,
          name: cached.placeName,
          usageCount: cached.usageCount,
          lastUsed: cached.lastUsed
        }));

      return similar;
    } catch (error) {
      console.error('Error searching similar cached locations:', error);
      return [];
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} Cache statistics
   */
  async getCacheStats() {
    try {
      const allCached = await this.findAll();
      const now = new Date();
      
      const stats = {
        totalEntries: allCached.length,
        validEntries: 0,
        expiredEntries: 0,
        totalUsage: 0,
        averageUsage: 0,
        oldestEntry: null,
        newestEntry: null,
        mostUsed: null
      };

      if (allCached.length === 0) {
        return stats;
      }

      let oldestDate = new Date();
      let newestDate = new Date(0);
      let mostUsedEntry = null;
      let maxUsage = 0;

      allCached.forEach(cached => {
        const createdAt = new Date(cached.createdAt || 0);
        const expiresAt = new Date(cached.expiresAt || 0);
        const usageCount = cached.usageCount || 0;

        // Check expiry
        if (expiresAt > now) {
          stats.validEntries++;
        } else {
          stats.expiredEntries++;
        }

        // Usage statistics
        stats.totalUsage += usageCount;

        // Find oldest and newest
        if (createdAt < oldestDate) {
          oldestDate = createdAt;
          stats.oldestEntry = cached.address;
        }
        if (createdAt > newestDate) {
          newestDate = createdAt;
          stats.newestEntry = cached.address;
        }

        // Find most used
        if (usageCount > maxUsage) {
          maxUsage = usageCount;
          mostUsedEntry = cached;
        }
      });

      stats.averageUsage = stats.totalUsage / allCached.length;
      stats.mostUsed = mostUsedEntry ? {
        address: mostUsedEntry.address,
        usageCount: mostUsedEntry.usageCount
      } : null;

      return stats;
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        totalEntries: 0,
        validEntries: 0,
        expiredEntries: 0,
        error: error.message
      };
    }
  }

  /**
   * Clean expired cache entries
   * @returns {Promise<Object>} Cleanup result
   */
  async cleanExpiredEntries() {
    try {
      const allCached = await this.findAll();
      const now = new Date();
      let deletedCount = 0;

      for (const cached of allCached) {
        const expiresAt = new Date(cached.expiresAt || 0);
        if (expiresAt < now) {
          await this.delete(cached.id);
          deletedCount++;
        }
      }

      return {
        success: true,
        deletedCount,
        message: `Cleaned ${deletedCount} expired cache entries`
      };
    } catch (error) {
      console.error('Error cleaning expired cache entries:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get nearby cached locations
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {number} radiusKm - Search radius in kilometers
   * @returns {Promise<Array>} Nearby cached locations
   */
  async getNearbyLocations(lat, lng, radiusKm = 5) {
    try {
      const allCached = await this.findAll();
      const nearby = [];

      allCached.forEach(cached => {
        if (!cached.coordinates) return;

        const distance = this.calculateDistance(
          lat, lng,
          cached.coordinates.latitude,
          cached.coordinates.longitude
        );

        if (distance <= radiusKm) {
          nearby.push({
            ...cached,
            distance: distance
          });
        }
      });

      // Sort by distance
      nearby.sort((a, b) => a.distance - b.distance);

      return nearby.map(location => ({
        address: location.formattedAddress || location.address,
        coordinates: {
          lat: location.coordinates.latitude,
          lng: location.coordinates.longitude
        },
        placeId: location.placeId,
        name: location.placeName,
        distance: location.distance,
        usageCount: location.usageCount
      }));
    } catch (error) {
      console.error('Error getting nearby cached locations:', error);
      return [];
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   * @param {number} lat1 - First latitude
   * @param {number} lng1 - First longitude
   * @param {number} lat2 - Second latitude
   * @param {number} lng2 - Second longitude
   * @returns {number} Distance in kilometers
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   * @param {number} degrees - Degrees
   * @returns {number} Radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Preload common locations for faster access
   * @param {Array} commonAddresses - Array of commonly used addresses
   * @returns {Promise<Object>} Preload result
   */
  async preloadCommonLocations(commonAddresses) {
    try {
      let preloadedCount = 0;
      const errors = [];

      for (const address of commonAddresses) {
        try {
          const existing = await this.getCachedLocation(address);
          if (!existing) {
            // This would typically trigger a geocoding API call
            // For now, we'll just mark it as needing preload
            console.log(`Need to preload location: ${address}`);
          }
          preloadedCount++;
        } catch (error) {
          errors.push({ address, error: error.message });
        }
      }

      return {
        success: true,
        preloadedCount,
        errors: errors.length > 0 ? errors : null
      };
    } catch (error) {
      console.error('Error preloading common locations:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default LocationCacheRepository;