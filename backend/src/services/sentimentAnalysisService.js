import GeminiSentimentService from './geminiSentimentService.js';
import { BaseRepository } from '../repositories/BaseRepository.js';
import webSocketService from './webSocketService.js';

/**
 * Main sentiment analysis service that handles driver survey processing,
 * AI analysis, data storage, and real-time updates
 */
class SentimentAnalysisService {
  constructor() {
    this.geminiService = new GeminiSentimentService();
    this.sentimentRepo = new BaseRepository('driverSentiment');
    this.driverRepo = new BaseRepository('driverProfiles');
  }

  /**
   * Process driver survey and perform complete sentiment analysis
   * @param {string} driverId - Driver's unique identifier
   * @param {Object} surveyData - Survey responses from driver
   * @returns {Object} Complete sentiment analysis result
   */
  async processSurvey(driverId, surveyData) {
    try {
      console.log(`Processing sentiment survey for driver: ${driverId}`);
      
      // Validate input data
      if (!driverId) {
        throw new Error('Driver ID is required');
      }
      
      if (!surveyData || typeof surveyData !== 'object') {
        throw new Error('Valid survey data is required');
      }
      
      // Analyze sentiment using Gemini AI
      let analysisResult;
      try {
        analysisResult = await this.geminiService.analyzeSentiment(surveyData);
      } catch (geminiError) {
        console.warn('Gemini analysis failed, using fallback:', geminiError.message);
        analysisResult = this.geminiService.getFallbackAnalysis(surveyData);
      }
      
      // Store sentiment data
      const savedData = await this.storeSentimentData(driverId, surveyData, analysisResult);
      
      // Update driver profile with latest sentiment score
      await this.updateDriverProfile(driverId, analysisResult);
      
      // Broadcast real-time updates
      this.broadcastSentimentUpdate(driverId, analysisResult);
      
      return {
        success: true,
        sentimentId: savedData.id,
        analysis: analysisResult,
        message: 'Sentiment analysis completed successfully'
      };
      
    } catch (error) {
      console.error('Error processing sentiment survey:', error);
      throw new Error(`Failed to process sentiment survey: ${error.message}`);
    }
  }

  /**
   * Store sentiment analysis data in Firebase
   * @param {string} driverId - Driver ID
   * @param {Object} surveyData - Original survey responses
   * @param {Object} analysisResult - AI analysis result
   * @returns {Object} Stored sentiment document
   */
  async storeSentimentData(driverId, surveyData, analysisResult) {
    try {
      const sentimentDocument = {
        driverId,
        surveyData: {
          ...surveyData,
          submittedAt: new Date().toISOString()
        },
        sentimentAnalysis: {
          score: analysisResult.sentimentScore,
          label: analysisResult.sentimentLabel,
          analysis: analysisResult.analysis,
          recommendations: analysisResult.recommendations,
          processedAt: analysisResult.processedAt
        },
        metadata: {
          source: 'driver_survey',
          version: '1.0',
          processingMethod: 'gemini_ai'
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const savedDocument = await this.sentimentRepo.create(sentimentDocument);
      console.log(`Sentiment data stored with ID: ${savedDocument.id}`);
      
      return savedDocument;
      
    } catch (error) {
      console.error('Error storing sentiment data:', error);
      throw new Error(`Failed to store sentiment data: ${error.message}`);
    }
  }

  /**
   * Update driver profile with latest sentiment information
   * @param {string} driverId - Driver ID
   * @param {Object} analysisResult - Sentiment analysis result
   */
  async updateDriverProfile(driverId, analysisResult) {
    try {
      // Check if driver profile exists
      let driverProfile;
      try {
        driverProfile = await this.driverRepo.findById(driverId);
      } catch (error) {
        console.log(`Driver profile not found for ${driverId}, creating new one`);
      }
      
      const updateData = {
        latestSentimentScore: analysisResult.sentimentScore,
        sentimentLabel: analysisResult.sentimentLabel,
        lastSentimentUpdate: new Date().toISOString(),
        sentimentHistory: {
          lastAnalysis: analysisResult.analysis,
          lastRecommendations: analysisResult.recommendations
        }
      };
      
      if (driverProfile) {
        // Update existing profile
        await this.driverRepo.update(driverId, updateData);
      } else {
        // Create new profile with sentiment data
        const newProfile = {
          driverId,
          ...updateData,
          createdAt: new Date().toISOString()
        };
        await this.driverRepo.create(newProfile, driverId);
      }
      
      console.log(`Driver profile updated for ${driverId} with sentiment score: ${analysisResult.sentimentScore}`);
      
    } catch (error) {
      console.error('Error updating driver profile:', error);
      // Don't throw error here as it's not critical for the main process
    }
  }

  /**
   * Broadcast real-time sentiment updates via WebSocket
   * @param {string} driverId - Driver ID
   * @param {Object} analysisResult - Sentiment analysis result
   */
  broadcastSentimentUpdate(driverId, analysisResult) {
    try {
      const sentimentData = {
        sentimentScore: analysisResult.sentimentScore,
        sentimentLabel: analysisResult.sentimentLabel,
        analysis: analysisResult.analysis,
        recommendations: analysisResult.recommendations,
        timestamp: new Date().toISOString()
      };
      
      // Use the WebSocket service's dedicated sentiment broadcast method
      webSocketService.broadcastSentimentUpdate(driverId, sentimentData);
      
    } catch (error) {
      console.error('Error broadcasting sentiment update:', error);
      // Don't throw error as this is not critical
    }
  }

  /**
   * Get sentiment history for a specific driver
   * @param {string} driverId - Driver ID
   * @param {number} limit - Number of records to retrieve
   * @returns {Array} Array of sentiment records
   */
  async getDriverSentimentHistory(driverId, limit = 10) {
    try {
      const conditions = [
        { field: 'driverId', operator: '==', value: driverId }
      ];
      
      const sentimentHistory = await this.sentimentRepo.findWhere(
        conditions,
        'createdAt',
        'desc',
        limit
      );
      
      return sentimentHistory.map(record => ({
        id: record.id,
        score: record.sentimentAnalysis.score,
        label: record.sentimentAnalysis.label,
        analysis: record.sentimentAnalysis.analysis,
        recommendations: record.sentimentAnalysis.recommendations,
        submittedAt: record.surveyData.submittedAt,
        createdAt: record.createdAt
      }));
      
    } catch (error) {
      console.error('Error fetching sentiment history:', error);
      
      // If the composite index is not ready, try a simpler approach
      if (error.code === 'failed-precondition' && error.message.includes('index')) {
        console.log('Composite index not available, using fallback query...');
        try {
          // Get all records for the driver without ordering, then sort in memory
          const conditions = [
            { field: 'driverId', operator: '==', value: driverId }
          ];
          
          const allRecords = await this.sentimentRepo.findWhere(conditions);
          
          // Sort by createdAt in descending order and limit
          const sortedRecords = allRecords
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, limit);
          
          return sortedRecords.map(record => ({
            id: record.id,
            score: record.sentimentAnalysis.score,
            label: record.sentimentAnalysis.label,
            analysis: record.sentimentAnalysis.analysis,
            recommendations: record.sentimentAnalysis.recommendations,
            submittedAt: record.surveyData.submittedAt,
            createdAt: record.createdAt
          }));
        } catch (fallbackError) {
          console.error('Fallback query also failed:', fallbackError);
          throw new Error(`Failed to fetch sentiment history: ${error.message}`);
        }
      }
      
      throw new Error(`Failed to fetch sentiment history: ${error.message}`);
    }
  }

  /**
   * Get current sentiment data for a driver
   * @param {string} driverId - Driver ID
   * @returns {Object} Current sentiment information
   */
  async getCurrentSentiment(driverId) {
    try {
      // Get latest sentiment record
      const latestSentiment = await this.getDriverSentimentHistory(driverId, 1);
      
      if (latestSentiment.length === 0) {
        return {
          driverId,
          hasSentimentData: false,
          message: 'No sentiment data available for this driver'
        };
      }
      
      const current = latestSentiment[0];
      
      // Get driver profile for additional context
      let driverProfile;
      try {
        driverProfile = await this.driverRepo.findById(driverId);
      } catch (error) {
        console.warn(`No driver profile found for ${driverId}`);
      }
      
      return {
        driverId,
        hasSentimentData: true,
        currentScore: current.score,
        currentLabel: current.label,
        lastUpdated: current.submittedAt,
        analysis: current.analysis,
        recommendations: current.recommendations,
        profile: driverProfile || null
      };
      
    } catch (error) {
      console.error('Error getting current sentiment:', error);
      throw new Error(`Failed to get current sentiment: ${error.message}`);
    }
  }

  /**
   * Get sentiment statistics for fleet management
   * @returns {Object} Fleet sentiment statistics
   */
  async getFleetSentimentStats() {
    try {
      // Get all driver profiles with sentiment data
      const driverProfiles = await this.driverRepo.findAll();
      
      const driversWithSentiment = driverProfiles.filter(profile => 
        profile.latestSentimentScore !== undefined
      );
      
      if (driversWithSentiment.length === 0) {
        return {
          totalDrivers: 0,
          averageScore: 0,
          distribution: {},
          lastUpdated: new Date().toISOString()
        };
      }
      
      // Calculate statistics
      const scores = driversWithSentiment.map(d => d.latestSentimentScore);
      const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      
      // Sentiment distribution
      const distribution = {
        'Very Positive': 0,
        'Positive': 0,
        'Neutral': 0,
        'Negative': 0,
        'Very Negative': 0
      };
      
      driversWithSentiment.forEach(driver => {
        const label = driver.sentimentLabel || this.getScoreLabel(driver.latestSentimentScore);
        if (distribution[label] !== undefined) {
          distribution[label]++;
        }
      });
      
      return {
        totalDrivers: driversWithSentiment.length,
        averageScore: Math.round(averageScore * 100) / 100,
        distribution,
        lastUpdated: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Error calculating fleet sentiment stats:', error);
      throw new Error(`Failed to calculate fleet sentiment statistics: ${error.message}`);
    }
  }

  /**
   * Convert sentiment score to label
   * @param {number} score - Sentiment score (0-100)
   * @returns {string} Sentiment label
   */
  getScoreLabel(score) {
    if (score >= 81) return 'Very Positive';
    if (score >= 61) return 'Positive';
    if (score >= 41) return 'Neutral';
    if (score >= 21) return 'Negative';
    return 'Very Negative';
  }
}

export default SentimentAnalysisService;