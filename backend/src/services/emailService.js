import nodemailer from 'nodemailer';
import { TrackingSession } from '../models/gpsModels.js';

/**
 * Email Service for sending tracking links via email
 * Alternative to SMS for drivers who don't have phone numbers
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
    this.baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    this.initialize();
  }

  /**
   * Initialize email transport
   */
  async initialize() {
    try {
      // For development, use a service like Gmail or Ethereal
      // In production, use a proper email service like SendGrid, AWS SES, etc.
      
      if (process.env.EMAIL_SERVICE && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        // Production email configuration
        this.transporter = nodemailer.createTransporter({
          service: process.env.EMAIL_SERVICE, // 'gmail', 'outlook', etc.
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });
        
        // Verify connection
        await this.transporter.verify();
        this.initialized = true;
        console.log('✅ Email service initialized successfully');
      } else {
        // Development mode - use Ethereal for testing
        console.log('⚠️  Email service running in simulation mode');
        console.log('💡 To enable real emails, set EMAIL_SERVICE, EMAIL_USER, and EMAIL_PASS environment variables');
        this.initialized = false;
      }
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error.message);
      this.initialized = false;
    }
  }

  /**
   * Validate email address
   * @param {string} email - Email address to validate
   * @returns {boolean} True if valid
   */
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Generate a tracking link for a driver
   * @param {string} vehicleId - The vehicle ID
   * @param {string} driverEmail - Driver's email address
   * @param {string} routeId - Route ID (optional)
   * @param {number} sessionDurationHours - Session duration in hours (default: 8)
   * @returns {Promise<Object>} Tracking session data
   */
  async generateTrackingLink(vehicleId, driverEmail, routeId = null, sessionDurationHours = 8) {
    try {
      // Create expiration time
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + sessionDurationHours);

      // Create tracking session (similar to SMS but with email contact)
      const trackingSession = new TrackingSession({
        vehicleId,
        driverEmail,
        routeId,
        expiresAt: expiresAt.toISOString(),
        trackingLink: '', // Will be set below
        updateIntervalSeconds: parseInt(process.env.LOCATION_UPDATE_INTERVAL) / 1000 || 30,
        contactMethod: 'email'
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
   * Send email with tracking link to driver
   * @param {string} email - Driver's email address
   * @param {string} vehicleId - Vehicle ID
   * @param {string} driverName - Driver's name (optional)
   * @param {string} customMessage - Custom message (optional)
   * @returns {Promise<Object>} Email delivery result
   */
  async sendTrackingLink(email, vehicleId, driverName = 'Driver', customMessage = null) {
    try {
      // Generate tracking link
      const linkData = await this.generateTrackingLink(vehicleId, email);
      
      if (!linkData.success) {
        throw new Error('Failed to generate tracking link');
      }

      // Prepare email content
      const subject = `GPS Tracking Link for Vehicle ${vehicleId} - IndiFleet`;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #007bff; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background: #f8f9fa; padding: 20px; border: 1px solid #dee2e6; }
            .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 15px 0; }
            .footer { background: #e9ecef; padding: 15px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 5px 5px; }
            .alert { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚛 GPS Tracking Request</h1>
            </div>
            <div class="content">
              <h2>Hello ${driverName}!</h2>
              <p>You've been requested to share your location for <strong>Vehicle ${vehicleId}</strong>.</p>
              
              ${customMessage ? `<div class="alert"><strong>Special Instructions:</strong><br>${customMessage}</div>` : ''}
              
              <p>Please click the button below to start sharing your location:</p>
              
              <p style="text-align: center;">
                <a href="${linkData.trackingLink}" class="button" style="color: white;">
                  🎯 Start Location Sharing
                </a>
              </p>
              
              <p><strong>Important Information:</strong></p>
              <ul>
                <li>This tracking link will expire on ${new Date(linkData.expiresAt).toLocaleString()}</li>
                <li>You'll need to enable location permissions in your browser</li>
                <li>The system will update your location every 30 seconds while active</li>
                <li>You can stop sharing at any time using the tracking interface</li>
              </ul>
              
              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: #e9ecef; padding: 10px; border-radius: 3px; font-family: monospace;">
                ${linkData.trackingLink}
              </p>
              
              <p>If you have any questions or issues, please contact your dispatch coordinator.</p>
            </div>
            <div class="footer">
              <p>IndiFleet GPS Tracking System</p>
              <p>This email was sent automatically. Please do not reply to this address.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const textContent = `
Hello ${driverName}!

You've been requested to share your location for Vehicle ${vehicleId}.

${customMessage ? `Special Instructions: ${customMessage}\n\n` : ''}

Please click this link to start sharing your location:
${linkData.trackingLink}

Important Information:
- This tracking link will expire on ${new Date(linkData.expiresAt).toLocaleString()}
- You'll need to enable location permissions in your browser
- The system will update your location every 30 seconds while active
- You can stop sharing at any time using the tracking interface

If you have any questions or issues, please contact your dispatch coordinator.

IndiFleet GPS Tracking System
This email was sent automatically. Please do not reply to this address.
      `;

      if (!this.initialized) {
        // Simulation mode
        console.log('\n=== EMAIL SIMULATION ===');
        console.log(`To: ${email}`);
        console.log(`Subject: ${subject}`);
        console.log('Content:');
        console.log(textContent);
        console.log('=== END EMAIL SIMULATION ===\n');
        
        return {
          success: true,
          messageId: 'sim_email_' + Date.now(),
          deliveryStatus: 'sent',
          simulated: true,
          trackingSessionId: linkData.trackingSessionId,
          trackingLink: linkData.trackingLink,
          expiresAt: linkData.expiresAt
        };
      }

      // Send actual email
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject: subject,
        text: textContent,
        html: htmlContent
      });

      return {
        success: true,
        messageId: info.messageId,
        deliveryStatus: 'sent',
        simulated: false,
        trackingSessionId: linkData.trackingSessionId,
        trackingLink: linkData.trackingLink,
        expiresAt: linkData.expiresAt
      };

    } catch (error) {
      console.error('Error sending tracking email:', error);
      throw new Error(`Failed to send tracking email: ${error.message}`);
    }
  }

  /**
   * Resend tracking link if original email failed
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

      if (!session.driverEmail) {
        throw new Error('No email address associated with this session');
      }

      // Resend the email
      const subject = `Reminder: GPS Tracking Link for Vehicle ${session.vehicleId} - IndiFleet`;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #ffc107; color: #212529; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background: #f8f9fa; padding: 20px; border: 1px solid #dee2e6; }
            .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 15px 0; }
            .footer { background: #e9ecef; padding: 15px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 5px 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔄 Reminder: GPS Tracking Request</h1>
            </div>
            <div class="content">
              <h2>Hello ${driverName}!</h2>
              <p>This is a reminder to start sharing your location for <strong>Vehicle ${session.vehicleId}</strong>.</p>
              
              <p>Please click the button below to start sharing your location:</p>
              
              <p style="text-align: center;">
                <a href="${session.trackingLink}" class="button" style="color: white;">
                  🎯 Start Location Sharing
                </a>
              </p>
              
              <p><strong>⏰ Time Sensitive:</strong> Your tracking session will expire on ${new Date(session.expiresAt).toLocaleString()}</p>
              
              <p>If the button doesn't work, you can copy and paste this link:</p>
              <p style="word-break: break-all; background: #e9ecef; padding: 10px; border-radius: 3px; font-family: monospace;">
                ${session.trackingLink}
              </p>
            </div>
            <div class="footer">
              <p>IndiFleet GPS Tracking System</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const textContent = `
Reminder: GPS Tracking Request

Hello ${driverName}!

This is a reminder to start sharing your location for Vehicle ${session.vehicleId}.

Please click this link to start sharing your location:
${session.trackingLink}

⏰ Time Sensitive: Your tracking session will expire on ${new Date(session.expiresAt).toLocaleString()}

IndiFleet GPS Tracking System
      `;

      if (!this.initialized) {
        // Simulation mode
        console.log('\n=== EMAIL RESEND SIMULATION ===');
        console.log(`To: ${session.driverEmail}`);
        console.log(`Subject: ${subject}`);
        console.log('Content:');
        console.log(textContent);
        console.log('=== END EMAIL SIMULATION ===\n');
        
        return {
          success: true,
          messageId: 'sim_resend_' + Date.now(),
          deliveryStatus: 'sent',
          simulated: true
        };
      }

      // Send actual email
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: session.driverEmail,
        subject: subject,
        text: textContent,
        html: htmlContent
      });

      return {
        success: true,
        messageId: info.messageId,
        deliveryStatus: 'sent',
        simulated: false
      };

    } catch (error) {
      console.error('Error resending tracking email:', error);
      throw error;
    }
  }
}

export default new EmailService();