/**
 * Interactive Database Cleanup Script with Safety Confirmations
 * 
 * This is a safer version that asks for explicit confirmation
 * before cleaning your Firebase database.
 */

import readline from 'readline';
import { cleanupDatabase, verifyCleanup } from './database-cleanup.js';

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Ask user for confirmation with colored output
 * @param {string} question - Question to ask
 * @returns {Promise<boolean>} User's response
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
 * Display warning and get user confirmation
 */
async function getConfirmation() {
  console.log('\n🚨 DANGER ZONE - DATABASE CLEANUP 🚨');
  console.log('=====================================');
  console.log('');
  console.log('⚠️  You are about to PERMANENTLY DELETE ALL DATA from your Firebase database!');
  console.log('⚠️  This includes:');
  console.log('   • All user accounts and profiles');
  console.log('   • All truck and route data');
  console.log('   • All tracking sessions');
  console.log('   • All reservations and bookings');
  console.log('   • All analytics and sentiment data');
  console.log('   • ALL other stored documents');
  console.log('');
  console.log('🔒 Collections will be preserved (structure remains)');
  console.log('💾 Make sure you have backups if you need to recover data');
  console.log('');
  
  const confirmed = await askConfirmation('❓ Are you absolutely sure you want to proceed?');
  
  if (!confirmed) {
    console.log('');
    console.log('✅ Operation cancelled. Your data is safe!');
    return false;
  }
  
  console.log('');
  console.log('⚠️  FINAL WARNING: This action cannot be undone!');
  const finalConfirm = await askConfirmation('❓ Type "yes" to confirm you want to DELETE ALL DATA');
  
  if (!finalConfirm) {
    console.log('');
    console.log('✅ Operation cancelled. Your data is safe!');
    return false;
  }
  
  return true;
}

/**
 * Main interactive function
 */
async function interactiveCleanup() {
  console.log('🔥 IndiFleet Interactive Database Cleanup');
  console.log('=========================================');
  
  try {
    // Get user confirmation
    const confirmed = await getConfirmation();
    
    if (!confirmed) {
      rl.close();
      return;
    }
    
    console.log('');
    console.log('🚀 Starting cleanup process...');
    console.log('');
    
    // Perform the cleanup
    await cleanupDatabase();
    await verifyCleanup();
    
    console.log('');
    console.log('🎉 Cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    rl.close();
  }
}

// Run the interactive cleanup
interactiveCleanup();