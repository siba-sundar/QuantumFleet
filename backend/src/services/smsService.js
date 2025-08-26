import twilio from 'twilio';
import { TrackingSession, SmsDeliveryLog } from '../models/gpsModels.js';

class SmsService {
  constructor() {
    this.client = null;
    this.twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    this.initialized = false;
    
    this.initializeTwilio();
  }

  initializeTwilio() {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      
      if (!accountSid || !authToken) {
        console.warn('Twilio credentials not found. SMS functionality will be disabled.');
        return;
      }

      this.client = twilio(accountSid, authToken);
      this.initialized = true;
      console.log('Twilio SMS service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Twilio:', error.message);
    }
  }

  /**
   * Generate a tracking link for a driver
   * @param {string} vehicleId - The vehicle ID
   * @param {string} driverPhone - Driver's phone number
   * @param {string} routeId - Route ID (optional)
   * @param {number} sessionDurationHours - Session duration in hours (default: 8)
   * @returns {Promise<Object>} Tracking session data
   */
  async generateTrackingLink(vehicleId, driverPhone, routeId = null, sessionDurationHours = 8) {
    try {
      // Create expiration time
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + sessionDurationHours);

      // Create tracking session
      const trackingSession = new TrackingSession({
        vehicleId,
        driverPhone,
        routeId,
        expiresAt: expiresAt.toISOString(),
        trackingLink: '', // Will be set below
        updateIntervalSeconds: parseInt(process.env.LOCATION_UPDATE_INTERVAL) / 1000 || 30
      });

      // Generate tracking link
      trackingSession.trackingLink = `${this.baseUrl}/track/${trackingSession.sessionId}`;
      
      // Save the session
      trackingSession.save();

      return {
        success: true,
        trackingSessionId: trackingSession.sessionId,
        trackingLink: trackingSession.trackingLink,
        expiresAt: trackingSession.expiresAt,
        vehicleId: trackingSession.vehicleId
      };
    } catch (error) {
      console.error('Error generating tracking link:', error);
      throw new Error('Failed to generate tracking link');
    }
  }

  /**
   * Send SMS with tracking link to driver
   * @param {string} phone - Driver's phone number
   * @param {string} vehicleId - Vehicle ID
   * @param {string} driverName - Driver's name (optional)
   * @param {string} customMessage - Custom message (optional)
   * @returns {Promise<Object>} SMS delivery result
   */
  async sendTrackingLink(phone, vehicleId, driverName = 'Driver', customMessage = null) {
    try {
      // Generate tracking link
      const linkData = await this.generateTrackingLink(vehicleId, phone);
      
      if (!linkData.success) {
        throw new Error('Failed to generate tracking link');
      }

      // Prepare SMS message
      const defaultMessage = `Hi ${driverName}! Please click this link to start sharing your location for vehicle ${vehicleId}: ${linkData.trackingLink}

This link will expire in 8 hours. If you have any issues, please contact dispatch.

IndiFleet Tracking System`;

      const messageContent = customMessage || defaultMessage;

      // Create SMS delivery log entry
      const smsLog = new SmsDeliveryLog({
        sessionId: linkData.trackingSessionId,
        phoneNumber: phone,
        messageContent: messageContent,
        deliveryStatus: 'pending'
      });

      if (!this.initialized) {
        // Simulate SMS sending in development
        console.log('\n=== SMS SIMULATION ===');
        console.log(`To: ${phone}`);
        console.log(`Message: ${messageContent}`);
        console.log('=== END SMS SIMULATION ===\n');
        
        smsLog.deliveryStatus = 'sent';
        smsLog.twilioMessageId = 'sim_' + Date.now();
        smsLog.save();

        return {
          success: true,
          messageId: smsLog.twilioMessageId,
          trackingLink: linkData.trackingLink,
          deliveryStatus: 'sent',
          sessionId: linkData.trackingSessionId,
          simulated: true
        };
      }

      // Send actual SMS via Twilio
      const message = await this.client.messages.create({
        body: messageContent,
        from: this.twilioPhoneNumber,
        to: phone
      });

      // Update SMS log with Twilio response
      smsLog.twilioMessageId = message.sid;
      smsLog.deliveryStatus = message.status;
      smsLog.save();

      return {
        success: true,
        messageId: message.sid,
        trackingLink: linkData.trackingLink,
        deliveryStatus: message.status,
        sessionId: linkData.trackingSessionId
      };

    } catch (error) {
      console.error('Error sending SMS:', error);
      
      // Log the failed attempt
      if (phone && vehicleId) {
        const smsLog = new SmsDeliveryLog({
          sessionId: 'failed_' + Date.now(),
          phoneNumber: phone,
          messageContent: customMessage || 'Failed to send',
          deliveryStatus: 'failed',
          errorMessage: error.message
        });
        smsLog.save();
      }

      throw new Error(`Failed to send SMS: ${error.message}`);
    }
  }

  /**
   * Check SMS delivery status
   * @param {string} messageId - Twilio message ID
   * @returns {Promise<Object>} Delivery status
   */
  async checkDeliveryStatus(messageId) {
    try {
      if (!this.initialized) {
        // Return simulated status
        return {
          status: 'delivered',
          deliveredAt: new Date().toISOString(),
          simulated: true
        };
      }

      const message = await this.client.messages(messageId).fetch();
      
      return {
        status: message.status,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        deliveredAt: message.dateUpdated
      };
    } catch (error) {
      console.error('Error checking delivery status:', error);
      return {
        status: 'unknown',
        error: error.message
      };
    }
  }

  /**
   * Get SMS delivery history for a session
   * @param {string} sessionId - Tracking session ID
   * @returns {Array} SMS delivery logs
   */
  getDeliveryHistory(sessionId) {
    return SmsDeliveryLog.findBySessionId(sessionId);
  }

  /**
   * Resend tracking link if original SMS failed
   * @param {string} sessionId - Tracking session ID
   * @param {string} driverName - Driver's name (optional)
   * @returns {Promise<Object>} Resend result
   */
  async resendTrackingLink(sessionId, driverName = 'Driver') {
    try {
      const session = TrackingSession.findBySessionId(sessionId);
      if (!session) {
        throw new Error('Tracking session not found');
      }

      if (session.status !== 'active') {
        throw new Error('Tracking session is not active');
      }

      // Check if session has expired
      if (new Date() > new Date(session.expiresAt)) {
        throw new Error('Tracking session has expired');
      }

      const message = `Hi ${driverName}! This is a reminder to start sharing your location for vehicle ${session.vehicleId}: ${session.trackingLink}

Your tracking session expires at ${new Date(session.expiresAt).toLocaleString()}.

IndiFleet Tracking System`;

      // Send the SMS
      return await this.sendTrackingSMS(session.driverPhone, message, sessionId);

    } catch (error) {
      console.error('Error resending tracking link:', error);
      throw error;
    }
  }

  /**
   * Send a tracking SMS with existing session
   * @param {string} phone - Phone number
   * @param {string} message - Message content
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} SMS result
   */
  async sendTrackingSMS(phone, message, sessionId) {
    try {
      const smsLog = new SmsDeliveryLog({
        sessionId,
        phoneNumber: phone,
        messageContent: message,
        deliveryStatus: 'pending'
      });

      if (!this.initialized) {
        console.log('\n=== SMS RESEND SIMULATION ===');
        console.log(`To: ${phone}`);
        console.log(`Message: ${message}`);
        console.log('=== END SMS SIMULATION ===\n');
        
        smsLog.deliveryStatus = 'sent';
        smsLog.twilioMessageId = 'sim_resend_' + Date.now();
        smsLog.save();

        return {
          success: true,
          messageId: smsLog.twilioMessageId,
          deliveryStatus: 'sent',
          simulated: true
        };
      }

      const twilioMessage = await this.client.messages.create({
        body: message,
        from: this.twilioPhoneNumber,
        to: phone
      });

      smsLog.twilioMessageId = twilioMessage.sid;
      smsLog.deliveryStatus = twilioMessage.status;
      smsLog.save();

      return {
        success: true,
        messageId: twilioMessage.sid,
        deliveryStatus: twilioMessage.status
      };

    } catch (error) {
      console.error('Error sending tracking SMS:', error);
      throw error;
    }
  }

  /**
   * Validate phone number format
   * @param {string} phone - Phone number to validate
   * @returns {boolean} Whether phone number is valid
   */
  validatePhoneNumber(phone) {
    // Basic phone number validation (E.164 format)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Format phone number to E.164 format
   * @param {string} phone - Phone number to format
   * @param {string} countryCode - Default country code (default: +91 for India)
   * @returns {string} Formatted phone number
   */
  formatPhoneNumber(phone, countryCode = '+91') {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // If it doesn't start with country code, add it
    if (!cleaned.startsWith(countryCode.substring(1))) {
      // Remove leading 0 if present (common in Indian numbers)
      if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
      }
      cleaned = countryCode.substring(1) + cleaned;
    }
    
    return '+' + cleaned;
  }
}

// Create singleton instance
const smsService = new SmsService();

export default smsService;