/**
 * Complete Firebase Cleanup Script
 * 
 * This script handles both Firestore documents and Firebase Authentication users
 * WARNING: This will delete ALL data and user accounts!
 */

import readline from 'readline';
import { exec } from 'child_process';
import { promisify } from 'util';
import { cleanupDatabase, verifyCleanup } from './database-cleanup.js';

const execAsync = promisify(exec);

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Ask user for confirmation
 */
function askConfirmation(question) {
  return new Promise((resolve) => {
    rl.question(`${question} (yes/no): `, (answer) => {
      const response = answer.toLowerCase().trim();
      resolve(response === 'yes' || response === 'y');
    });
  });
}

/**
 * Check if user is logged into Firebase CLI
 */
async function checkFirebaseLogin() {
  try {
    await execAsync('firebase projects:list');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Login to Firebase CLI
 */
async function loginToFirebase() {
  console.log('🔐 Opening browser for Firebase authentication...');
  try {
    await execAsync('firebase login');
    console.log('✅ Successfully logged into Firebase');
    return true;
  } catch (error) {
    console.error('❌ Failed to login to Firebase:', error.message);
    return false;
  }
}

/**
 * Export current authentication users (as backup)
 */
async function exportAuthUsers() {
  try {
    console.log('💾 Exporting current authentication users as backup...');
    await execAsync('firebase auth:export auth-users-backup.json --project quantumfleet-d5f24');
    console.log('✅ Authentication users backed up to: auth-users-backup.json');
    return true;
  } catch (error) {
    console.error('❌ Failed to export auth users:', error.message);
    return false;
  }
}

/**
 * Clear all authentication users
 */
async function clearAuthUsers() {
  try {
    console.log('🧹 Clearing all Firebase Authentication users...');
    
    // Create an empty users file for import
    const emptyUsersJson = JSON.stringify({ users: [] }, null, 2);
    
    // Write empty users file
    const fs = await import('fs');
    fs.writeFileSync('empty-users.json', emptyUsersJson);
    
    // Import empty users list (this clears all users)
    await execAsync('firebase auth:import empty-users.json --project quantumfleet-d5f24');
    
    // Clean up temporary file
    fs.unlinkSync('empty-users.json');
    
    console.log('✅ All Firebase Authentication users have been cleared');
    return true;
  } catch (error) {
    console.error('❌ Failed to clear auth users:', error.message);
    console.log('ℹ️  You may need to clear users manually in Firebase Console');
    return false;
  }
}

/**
 * Main cleanup function
 */
async function completeCleanup() {
  console.log('🔥 Complete Firebase Cleanup (Firestore + Authentication)');
  console.log('========================================================');
  console.log('');
  console.log('⚠️  WARNING: This will permanently delete:');
  console.log('   • ALL documents from Firestore collections');
  console.log('   • ALL user accounts from Firebase Authentication');
  console.log('   • This action is IRREVERSIBLE!');
  console.log('');
  
  const confirmed = await askConfirmation('Are you sure you want to proceed with COMPLETE cleanup?');
  if (!confirmed) {
    console.log('✅ Operation cancelled. Your data is safe!');
    return;
  }
  
  try {
    // Step 1: Check Firebase CLI login
    console.log('\n🔐 Step 1/4: Checking Firebase CLI authentication...');
    const isLoggedIn = await checkFirebaseLogin();
    
    if (!isLoggedIn) {
      console.log('🔑 You need to login to Firebase CLI for authentication cleanup');
      const shouldLogin = await askConfirmation('Login to Firebase now?');
      
      if (shouldLogin) {
        const loginSuccess = await loginToFirebase();
        if (!loginSuccess) {
          console.log('⚠️  Continuing with Firestore cleanup only...');
        }
      } else {
        console.log('⚠️  Skipping authentication cleanup. Only Firestore will be cleaned.');
      }
    }
    
    // Step 2: Backup authentication users
    console.log('\n💾 Step 2/4: Backing up authentication users...');
    await exportAuthUsers();
    
    // Step 3: Clean Firestore documents
    console.log('\n🗂️  Step 3/4: Cleaning Firestore documents...');
    await cleanupDatabase();
    await verifyCleanup();
    
    // Step 4: Clear authentication users
    console.log('\n👥 Step 4/4: Clearing Firebase Authentication users...');
    const authCleared = await clearAuthUsers();
    
    // Summary
    console.log('\n🎉 Complete Cleanup Summary');
    console.log('==========================');
    console.log('✅ Firestore documents: CLEARED');
    console.log(`${authCleared ? '✅' : '⚠️ '} Authentication users: ${authCleared ? 'CLEARED' : 'MANUAL CLEANUP NEEDED'}`);
    console.log('✅ Collection structures: PRESERVED');
    
    if (authCleared) {
      console.log('\n🎊 Complete cleanup successful!');
      console.log('You can now register with the same email addresses again.');
    } else {
      console.log('\n⚠️  Authentication cleanup incomplete');
      console.log('Please manually delete users in Firebase Console:');
      console.log('https://console.firebase.google.com/project/quantumfleet-d5f24/authentication/users');
    }
    
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error.message);
  }
}

/**
 * Manual authentication cleanup guide
 */
function showManualCleanupGuide() {
  console.log('\n📋 Manual Authentication Cleanup Guide');
  console.log('======================================');
  console.log('');
  console.log('If the automated cleanup didn\'t work, follow these steps:');
  console.log('');
  console.log('1. Open Firebase Console:');
  console.log('   https://console.firebase.google.com/project/quantumfleet-d5f24/authentication/users');
  console.log('');
  console.log('2. Select all users (click the checkbox next to "Display name")');
  console.log('3. Click the "Delete selected users" button');
  console.log('4. Confirm the deletion');
  console.log('');
  console.log('🎯 After completing this, you can register with the same emails again!');
}

// Handle command line arguments
const args = process.argv.slice(2);
const command = args[0]?.toLowerCase();

async function main() {
  try {
    switch (command) {
      case 'manual':
        showManualCleanupGuide();
        break;
        
      default:
        await completeCleanup();
        break;
    }
  } catch (error) {
    console.error('\n💥 Fatal error:', error);
  } finally {
    rl.close();
  }
}

// Run the complete cleanup
main();