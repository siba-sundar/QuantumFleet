import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  signInWithCredential,
  signOut,
  onAuthStateChanged,
  updateProfile,
  RecaptchaVerifier,
  sendEmailVerification,
  sendPasswordResetEmail
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../config/firebase.js";

/**
 * AuthService class handles all authentication operations including email and phone authentication
 */
export class AuthService {
  static recaptchaVerifier = null;

  /**
   * Initialize reCAPTCHA verifier for phone authentication
   * @param {string} containerId - ID of the container element for reCAPTCHA
   * @returns {RecaptchaVerifier} The reCAPTCHA verifier instance
   */
  static initializeRecaptcha(containerId = 'recaptcha-container') {
    try {
      // Clear existing verifier if it exists
      if (this.recaptchaVerifier) {
        this.recaptchaVerifier.clear();
        this.recaptchaVerifier = null;
      }

      this.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
        'size': 'invisible',
        'callback': (response) => {
          console.log('reCAPTCHA solved');
        },
        'expired-callback': () => {
          console.log('reCAPTCHA expired');
          this.recaptchaVerifier = null;
        }
      });
      
      return this.recaptchaVerifier;
    } catch (error) {
      console.error('Error initializing reCAPTCHA:', error);
      throw error;
    }
  }

  /**
   * Format phone number to E.164 format
   * @param {string} phoneNumber - Phone number to format
   * @returns {string} Formatted phone number
   */
  static formatPhoneNumber(phoneNumber) {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Add +91 if not present for Indian numbers
    if (cleaned.length === 10) {
      return `+91${cleaned}`;
    } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return `+${cleaned}`;
    } else if (cleaned.startsWith('+91')) {
      return phoneNumber;
    } else {
      return `+91${cleaned}`;
    }
  }

  /**
   * Send OTP to phone number for driver authentication
   * @param {string} phoneNumber - Phone number to send OTP to
   * @returns {Promise<Object>} Result object with success status and confirmation result
   */
  static async sendOTPToDriver(phoneNumber) {
    try {
      // Format phone number to E.164 format
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      
      // Initialize reCAPTCHA
      const appVerifier = this.initializeRecaptcha();
      
      // Send OTP
      const confirmationResult = await signInWithPhoneNumber(auth, formattedNumber, appVerifier);
      
      return {
        success: true,
        confirmationResult,
        message: 'OTP sent successfully',
        phoneNumber: formattedNumber
      };
    } catch (error) {
      console.error('Error sending OTP:', error);
      
      // Reset reCAPTCHA on error
      if (this.recaptchaVerifier) {
        this.recaptchaVerifier.clear();
        this.recaptchaVerifier = null;
      }
      
      return {
        success: false,
        error: error.code,
        message: this.getOTPErrorMessage(error.code)
      };
    }
  }

  /**
   * Verify OTP and sign in driver
   * @param {Object} confirmationResult - Confirmation result from sendOTPToDriver
   * @param {string} otpCode - OTP code entered by user
   * @param {Object} profileData - Optional profile data for new users
   * @returns {Promise<Object>} Result object with user data
   */
  static async verifyOTPAndSignIn(confirmationResult, otpCode, profileData = {}) {
    try {
      const credential = await confirmationResult.confirm(otpCode);
      const user = credential.user;
      
      // Check if user already exists
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      let isNewUser = false;
      
      if (!userDoc.exists()) {
        // Create new user document for driver
        await setDoc(userDocRef, {
          uid: user.uid,
          phoneNumber: user.phoneNumber,
          userType: 'driver',
          authMethod: 'phone',
          isActive: true,
          isPhoneVerified: true,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp()
        });
        
        // Create driver profile if profile data is provided
        if (Object.keys(profileData).length > 0) {
          const driverProfileRef = doc(db, 'driverProfiles', user.uid);
          await setDoc(driverProfileRef, {
            uid: user.uid,
            phoneNumber: user.phoneNumber,
            ...profileData,
            registrationStatus: 'pending',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
        
        isNewUser = true;
      } else {
        // Update last login for existing user
        await setDoc(userDocRef, {
          lastLogin: serverTimestamp(),
          isPhoneVerified: true
        }, { merge: true });
      }
      
      return {
        success: true,
        user: {
          uid: user.uid,
          phoneNumber: user.phoneNumber,
          userType: 'driver'
        },
        isNewUser,
        message: isNewUser ? 'Account created successfully' : 'Signed in successfully'
      };
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return {
        success: false,
        error: error.code,
        message: this.getOTPErrorMessage(error.code)
      };
    }
  }

  /**
   * Register user with email and password (for business and postal users)
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {string} userType - Type of user (business, postal)
   * @param {Object} profileData - Additional profile data
   * @returns {Promise<Object>} Result object with user data
   */
  static async registerWithEmail(email, password, userType, profileData = {}) {
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const user = credential.user;
      
      // Update user profile with display name if provided
      if (profileData.firstName) {
        await updateProfile(user, {
          displayName: `${profileData.firstName} ${profileData.lastName || ''}`
        });
      }
      
      // Create user document
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        userType: userType,
        authMethod: 'email',
        isActive: true,
        isEmailVerified: user.emailVerified,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      });
      
      // Create specific profile document based on user type
      let profileCollectionName = '';
      if (userType === 'business') {
        profileCollectionName = 'businessProfiles';
      } else if (userType === 'postal') {
        profileCollectionName = 'postalProfiles';
      } else if (userType === 'driver') {
        profileCollectionName = 'driverProfiles';
      }
      
      if (profileCollectionName) {
        const profileRef = doc(db, profileCollectionName, user.uid);
        await setDoc(profileRef, {
          uid: user.uid,
          email: user.email,
          ...profileData,
          registrationStatus: userType === 'driver' ? 'pending' : 'approved',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      
      // Send email verification
      await sendEmailVerification(user);
      
      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          userType: userType,
          emailVerified: user.emailVerified
        },
        message: 'Account created successfully. Please check your email for verification.'
      };
    } catch (error) {
      console.error('Error registering with email:', error);
      return {
        success: false,
        error: error.code,
        message: this.getEmailErrorMessage(error.code)
      };
    }
  }

  /**
   * Sign in user with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} Result object with user data
   */
  static async signInWithEmail(email, password) {
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const user = credential.user;
      
      // Get user type from Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        throw new Error('User profile not found');
      }
      
      const userData = userDoc.data();
      
      // Update last login
      await setDoc(userDocRef, {
        lastLogin: serverTimestamp()
      }, { merge: true });
      
      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          userType: userData.userType,
          emailVerified: user.emailVerified
        },
        message: 'Signed in successfully'
      };
    } catch (error) {
      console.error('Error signing in with email:', error);
      return {
        success: false,
        error: error.code,
        message: this.getEmailErrorMessage(error.code)
      };
    }
  }

  /**
   * Sign out current user
   * @returns {Promise<Object>} Result object
   */
  static async signOutUser() {
    try {
      await signOut(auth);
      
      // Clear reCAPTCHA verifier
      if (this.recaptchaVerifier) {
        this.recaptchaVerifier.clear();
        this.recaptchaVerifier = null;
      }
      
      return {
        success: true,
        message: 'Signed out successfully'
      };
    } catch (error) {
      console.error('Error signing out:', error);
      return {
        success: false,
        error: error.code,
        message: 'Error signing out'
      };
    }
  }

  /**
   * Get current authenticated user
   * @returns {Promise<Object|null>} Current user or null
   */
  static async getCurrentUser() {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        unsubscribe();
        if (user) {
          try {
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists()) {
              const userData = userDoc.data();
              resolve({
                uid: user.uid,
                email: user.email,
                phoneNumber: user.phoneNumber,
                userType: userData.userType,
                emailVerified: user.emailVerified,
                isPhoneVerified: userData.isPhoneVerified || false
              });
            } else {
              resolve(null);
            }
          } catch (error) {
            console.error('Error getting user data:', error);
            resolve(null);
          }
        } else {
          resolve(null);
        }
      });
    });
  }

  /**
   * Listen to authentication state changes
   * @param {Function} callback - Callback function to handle auth state changes
   * @returns {Function} Unsubscribe function
   */
  static onAuthStateChange(callback) {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            callback({
              uid: user.uid,
              email: user.email,
              phoneNumber: user.phoneNumber,
              userType: userData.userType,
              emailVerified: user.emailVerified,
              isPhoneVerified: userData.isPhoneVerified || false
            });
          } else {
            callback(null);
          }
        } catch (error) {
          console.error('Error in auth state change:', error);
          callback(null);
        }
      } else {
        callback(null);
      }
    });
  }

  /**
   * Send password reset email
   * @param {string} email - User email
   * @returns {Promise<Object>} Result object
   */
  static async sendPasswordReset(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      return {
        success: true,
        message: 'Password reset email sent successfully'
      };
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return {
        success: false,
        error: error.code,
        message: this.getEmailErrorMessage(error.code)
      };
    }
  }

  /**
   * Get user-friendly error message for OTP errors
   * @param {string} errorCode - Firebase error code
   * @returns {string} User-friendly error message
   */
  static getOTPErrorMessage(errorCode) {
    switch (errorCode) {
      case 'auth/invalid-phone-number':
        return 'Invalid phone number format';
      case 'auth/missing-phone-number':
        return 'Phone number is required';
      case 'auth/quota-exceeded':
        return 'SMS quota exceeded. Please try again later';
      case 'auth/user-disabled':
        return 'This account has been disabled';
      case 'auth/invalid-verification-code':
        return 'Invalid OTP code';
      case 'auth/code-expired':
        return 'OTP code has expired. Please request a new one';
      case 'auth/too-many-requests':
        return 'Too many requests. Please wait before trying again';
      case 'auth/network-request-failed':
        return 'Network error. Please check your internet connection';
      default:
        return 'An error occurred during authentication';
    }
  }

  /**
   * Get user-friendly error message for email errors
   * @param {string} errorCode - Firebase error code
   * @returns {string} User-friendly error message
   */
  static getEmailErrorMessage(errorCode) {
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return 'An account with this email already exists';
      case 'auth/invalid-email':
        return 'Invalid email address';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters';
      case 'auth/user-not-found':
        return 'No account found with this email';
      case 'auth/wrong-password':
        return 'Incorrect password';
      case 'auth/user-disabled':
        return 'This account has been disabled';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later';
      case 'auth/network-request-failed':
        return 'Network error. Please check your internet connection';
      default:
        return 'An error occurred during authentication';
    }
  }
}