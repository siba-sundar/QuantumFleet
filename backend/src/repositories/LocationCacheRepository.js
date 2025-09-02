import { BaseRepository } from './BaseRepository.js';

/**
 * LocationCacheRepository - Manages location cache for performance optimization
 */
export class LocationCacheRepository extends BaseRepository {
  constructor() {
    super('locationCache');
  }

  generateAddressHash(address) {
    let hash = 0;
    const normalizedAddress = (address || '').toLowerCase().trim();
    if (normalizedAddress.length === 0) return '0';
    for (let i = 0; i < normalizedAddress.length; i++) {
      const char = normalizedAddress.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  async cacheLocation(address, locationData) {
    try {
      const addressHash = this.generateAddressHash(address);
      const now = new Date();
      const expiryTime = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
      const cacheData = {
        id: addressHash,
        address: (address || '').trim(),
        coordinates: {
          latitude: locationData?.coordinates?.lat || 0,
          longitude: locationData?.coordinates?.lng || 0
        },
        placeId: locationData?.placeId || null,
        formattedAddress: locationData?.address || null,
        addressComponents: locationData?.addressComponents || {},
        placeTypes: locationData?.types || [],
        placeName: locationData?.name || '',
        plusCode: locationData?.plusCode || '',
        usageCount: 1,
        lastUsed: now,
        createdAt: now,
        expiresAt: expiryTime
      };
      await this.upsert?.(addressHash, cacheData);
      // fallback to createWithId if upsert not available
      if (!this.upsert) await this.createWithId(addressHash, cacheData);
      return { success: true, cached: true, addressHash };
    } catch (error) {
      console.error('Error caching location:', error);
      return { success: false, error: error.message };
    }
  }

  async getCachedLocation(address) {
    try {
      const addressHash = this.generateAddressHash(address);
      const cached = await this.findById(addressHash);
      if (!cached) return null;
      const now = new Date();
      if (cached.expiresAt && new Date(cached.expiresAt) < now) {
        await this.delete(addressHash);
        return null;
      }
      await this.update(addressHash, { lastUsed: now, usageCount: (cached.usageCount || 0) + 1 });
      return {
        address: cached.formattedAddress || cached.address,
        coordinates: { lat: cached.coordinates.latitude, lng: cached.coordinates.longitude },
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

  async searchSimilarCached(query, limit = 5) {
    try {
      const allCached = await this.findAll();
      const q = (query || '').toLowerCase();
      const similar = allCached.filter(c => {
        const addressLower = (c.address || '').toLowerCase();
        const formattedLower = (c.formattedAddress || '').toLowerCase();
        return addressLower.includes(q) || formattedLower.includes(q) || (c.placeName || '').toLowerCase().includes(q);
      }).slice(0, limit).map(c => ({ address: c.formattedAddress || c.address, coordinates: { lat: c.coordinates.latitude, lng: c.coordinates.longitude }, placeId: c.placeId, name: c.placeName, usageCount: c.usageCount, lastUsed: c.lastUsed }));
      return similar;
    } catch (error) {
      console.error('Error searching similar cached locations:', error);
      return [];
    }
  }
}

export default LocationCacheRepository;
