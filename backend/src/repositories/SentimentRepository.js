import { BaseRepository } from './BaseRepository.js';
import { 
  query, 
  where, 
  orderBy, 
  limit,
  getDocs,
  Timestamp
} from 'firebase/firestore';

/**
 * Repository for managing driver sentiment data with specialized queries
 */
export class SentimentRepository extends BaseRepository {
  constructor() {
    super('driverSentiment');
  }

  /**
   * Store sentiment analysis result
   * @param {string} driverId - Driver's unique identifier
   * @param {Object} surveyData - Original survey responses
   * @param {Object} analysisResult - AI sentiment analysis result
   * @returns {Promise<Object>} Stored sentiment document
   */
  async createSentimentRecord(driverId, surveyData, analysisResult) {
    const sentimentDocument = {
      driverId,
      surveyData: {
        ...surveyData,
        submittedAt: new Date()
      },
      sentimentAnalysis: {
        score: analysisResult.sentimentScore,
        label: analysisResult.sentimentLabel,
        analysis: analysisResult.analysis,
        recommendations: analysisResult.recommendations || [],
        processedAt: new Date(analysisResult.processedAt)
      },
      metadata: {
        source: 'driver_survey',
        version: '1.0',
        processingMethod: 'gemini_ai'
      }
    };

    return await this.create(sentimentDocument);
  }

  /**
   * Get sentiment history for a specific driver
   * @param {string} driverId - Driver ID
   * @param {number} limitCount - Number of records to retrieve
   * @returns {Promise<Array>} Array of sentiment records
   */
  async getDriverSentimentHistory(driverId, limitCount = 10) {
    const conditions = [
      { field: 'driverId', operator: '==', value: driverId }
    ];
    
    return await this.findWhere(conditions, 'createdAt', 'desc', limitCount);
  }

  /**
   * Get latest sentiment record for a driver
   * @param {string} driverId - Driver ID
   * @returns {Promise<Object|null>} Latest sentiment record or null
   */
  async getLatestSentiment(driverId) {
    const history = await this.getDriverSentimentHistory(driverId, 1);
    return history.length > 0 ? history[0] : null;
  }

  /**
   * Get sentiment records within a date range
   * @param {string} driverId - Driver ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Array of sentiment records
   */
  async getSentimentByDateRange(driverId, startDate, endDate) {
    const conditions = [
      { field: 'driverId', operator: '==', value: driverId },
      { field: 'createdAt', operator: '>=', value: Timestamp.fromDate(startDate) },
      { field: 'createdAt', operator: '<=', value: Timestamp.fromDate(endDate) }
    ];
    
    return await this.findWhere(conditions, 'createdAt', 'desc');
  }

  /**
   * Get sentiment statistics for all drivers
   * @param {Date} sinceDate - Get records since this date (optional)
   * @returns {Promise<Object>} Sentiment statistics
   */
  async getFleetSentimentStats(sinceDate = null) {
    try {
      let conditions = [];
      
      if (sinceDate) {
        conditions.push({ 
          field: 'createdAt', 
          operator: '>=', 
          value: Timestamp.fromDate(sinceDate) 
        });
      }
      
      const allRecords = await this.findWhere(conditions, 'createdAt', 'desc');
      
      // Get latest record for each driver
      const latestByDriver = {};
      allRecords.forEach(record => {
        if (!latestByDriver[record.driverId] || 
            record.createdAt > latestByDriver[record.driverId].createdAt) {
          latestByDriver[record.driverId] = record;
        }
      });
      
      const latestRecords = Object.values(latestByDriver);
      
      if (latestRecords.length === 0) {
        return {
          totalDrivers: 0,
          averageScore: 0,
          distribution: {
            'Very Positive': 0,
            'Positive': 0,
            'Neutral': 0,
            'Negative': 0,
            'Very Negative': 0
          },
          lastUpdated: new Date().toISOString()
        };
      }
      
      // Calculate statistics
      const scores = latestRecords.map(r => r.sentimentAnalysis.score);
      const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      
      // Distribution by sentiment label
      const distribution = {
        'Very Positive': 0,
        'Positive': 0,
        'Neutral': 0,
        'Negative': 0,
        'Very Negative': 0
      };
      
      latestRecords.forEach(record => {
        const label = record.sentimentAnalysis.label;
        if (distribution[label] !== undefined) {
          distribution[label]++;
        }
      });
      
      return {
        totalDrivers: latestRecords.length,
        averageScore: Math.round(averageScore * 100) / 100,
        distribution,
        scoreRange: {
          min: Math.min(...scores),
          max: Math.max(...scores)
        },
        lastUpdated: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Error calculating fleet sentiment stats:', error);
      throw error;
    }
  }

  /**
   * Get drivers with low sentiment scores (below threshold)
   * @param {number} threshold - Sentiment score threshold (default: 40)
   * @returns {Promise<Array>} Array of drivers with low sentiment
   */
  async getDriversWithLowSentiment(threshold = 40) {
    try {
      // Get all recent sentiment records
      const allRecords = await this.findWhere([], 'createdAt', 'desc');
      
      // Get latest record for each driver
      const latestByDriver = {};
      allRecords.forEach(record => {
        if (!latestByDriver[record.driverId] || 
            record.createdAt > latestByDriver[record.driverId].createdAt) {
          latestByDriver[record.driverId] = record;
        }
      });
      
      // Filter by threshold
      return Object.values(latestByDriver)
        .filter(record => record.sentimentAnalysis.score < threshold)
        .sort((a, b) => a.sentimentAnalysis.score - b.sentimentAnalysis.score);
        
    } catch (error) {
      console.error('Error getting drivers with low sentiment:', error);
      throw error;
    }
  }

  /**
   * Get sentiment trends for a specific driver
   * @param {string} driverId - Driver ID
   * @param {number} days - Number of days to look back (default: 30)
   * @returns {Promise<Object>} Sentiment trend analysis
   */
  async getSentimentTrend(driverId, days = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const records = await this.getSentimentByDateRange(driverId, startDate, endDate);
      
      if (records.length < 2) {
        return {
          driverId,
          trend: 'insufficient_data',
          change: 0,
          records: records.length
        };
      }
      
      // Sort by date (oldest first)
      records.sort((a, b) => a.createdAt - b.createdAt);
      
      const firstScore = records[0].sentimentAnalysis.score;
      const lastScore = records[records.length - 1].sentimentAnalysis.score;
      const change = lastScore - firstScore;
      
      let trend = 'stable';
      if (change > 5) trend = 'improving';
      else if (change < -5) trend = 'declining';
      
      return {
        driverId,
        trend,
        change: Math.round(change * 100) / 100,
        firstScore,
        lastScore,
        records: records.length,
        period: `${days} days`
      };
      
    } catch (error) {
      console.error('Error calculating sentiment trend:', error);
      throw error;
    }
  }
}

/**
 * Enhanced driver repository with sentiment integration
 */
export class EnhancedDriverRepository extends BaseRepository {
  constructor() {
    super('driverProfiles');
  }

  /**
   * Update driver profile with sentiment data
   * @param {string} driverId - Driver ID
   * @param {Object} sentimentData - Sentiment analysis data
   * @returns {Promise<Object>} Updated driver profile
   */
  async updateSentimentData(driverId, sentimentData) {
    const updateData = {
      latestSentimentScore: sentimentData.sentimentScore,
      sentimentLabel: sentimentData.sentimentLabel,
      lastSentimentUpdate: new Date(),
      sentimentHistory: {
        lastAnalysis: sentimentData.analysis,
        lastRecommendations: sentimentData.recommendations
      }
    };
    
    try {
      // Check if profile exists
      const existingProfile = await this.findById(driverId);
      
      if (existingProfile) {
        return await this.update(driverId, updateData);
      } else {
        // Create new profile with sentiment data
        const newProfile = {
          driverId,
          ...updateData
        };
        return await this.createWithId(driverId, newProfile);
      }
    } catch (error) {
      console.error('Error updating driver sentiment data:', error);
      throw error;
    }
  }

  /**
   * Get driver profile with latest sentiment data
   * @param {string} driverId - Driver ID
   * @returns {Promise<Object|null>} Driver profile with sentiment data
   */
  async getDriverWithSentiment(driverId) {
    try {
      const profile = await this.findById(driverId);
      return profile;
    } catch (error) {
      console.error('Error getting driver with sentiment:', error);
      throw error;
    }
  }

  /**
   * Get all drivers with their latest sentiment scores
   * @returns {Promise<Array>} Array of driver profiles with sentiment data
   */
  async getAllDriversWithSentiment() {
    try {
      const allProfiles = await this.findAll();
      return allProfiles.filter(profile => 
        profile.latestSentimentScore !== undefined
      );
    } catch (error) {
      console.error('Error getting all drivers with sentiment:', error);
      throw error;
    }
  }
}

export { BaseRepository };