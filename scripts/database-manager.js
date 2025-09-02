/**
 * IndiFleet Database Manager
 * 
 * Comprehensive database management tool with backup and cleanup options
 * 
 * Usage:
 *   node database-manager.js backup    # Create backup only
 *   node database-manager.js cleanup   # Cleanup only (with confirmation)
 *   node database-manager.js full      # Backup then cleanup
 *   node database-manager.js           # Interactive menu
 */

import readline from 'readline';
import { createBackup } from './database-backup.js';
import { cleanupDatabase, verifyCleanup } from './database-cleanup.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Display main menu
 */
function displayMenu() {
  console.log('\n🔥 IndiFleet Database Manager');
  console.log('============================');
  console.log('');
  console.log('📋 Available Options:');
  console.log('   1. 💾 Create Backup Only');
  console.log('   2. 🧹 Cleanup Database Only');
  console.log('   3. 🔄 Full Process (Backup + Cleanup)');
  console.log('   4. ❌ Cancel/Exit');
  console.log('');
}

/**
 * Get user choice
 */
function getUserChoice() {
  return new Promise((resolve) => {
    rl.question('Enter your choice (1-4): ', (answer) => {
      resolve(parseInt(answer.trim()));
    });
  });
}

/**
 * Ask for confirmation
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
 * Handle backup option
 */
async function handleBackup() {
  console.log('\n💾 Starting Database Backup...');
  console.log('===============================');
  
  try {
    const backupPath = await createBackup();
    console.log('\n✅ Backup completed successfully!');
    console.log(`📁 Backup saved to: ${backupPath}`);
    return backupPath;
  } catch (error) {
    console.error('\n❌ Backup failed:', error.message);
    throw error;
  }
}

/**
 * Handle cleanup with confirmation
 */
async function handleCleanup() {
  console.log('\n🧹 Database Cleanup Process');
  console.log('===========================');
  console.log('');
  console.log('⚠️  WARNING: This will permanently delete ALL documents from your database!');
  console.log('⚠️  Collections will be preserved, but all data will be lost.');
  console.log('');
  
  const confirmed = await askConfirmation('Are you sure you want to proceed with cleanup?');
  
  if (!confirmed) {
    console.log('\n✅ Cleanup cancelled. Your data is safe!');
    return false;
  }
  
  console.log('\n⚠️  FINAL CONFIRMATION REQUIRED');
  const finalConfirm = await askConfirmation('Type "yes" to PERMANENTLY DELETE ALL DATA');
  
  if (!finalConfirm) {
    console.log('\n✅ Cleanup cancelled. Your data is safe!');
    return false;
  }
  
  try {
    console.log('\n🚀 Starting cleanup process...');
    await cleanupDatabase();
    await verifyCleanup();
    console.log('\n✅ Database cleanup completed successfully!');
    return true;
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error.message);
    throw error;
  }
}

/**
 * Handle full process (backup + cleanup)
 */
async function handleFullProcess() {
  console.log('\n🔄 Full Database Reset Process');
  console.log('==============================');
  console.log('📋 This will:');
  console.log('   1. Create a complete backup of your database');
  console.log('   2. Clean all documents from all collections');
  console.log('   3. Preserve collection structures for new data');
  console.log('');
  
  const confirmed = await askConfirmation('Do you want to proceed with the full process?');
  
  if (!confirmed) {
    console.log('\n✅ Process cancelled. Your data is safe!');
    return;
  }
  
  try {
    // Step 1: Create backup
    console.log('\n📦 Step 1/2: Creating backup...');
    const backupPath = await handleBackup();
    
    console.log('\n⏳ Waiting 3 seconds before cleanup...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 2: Cleanup
    console.log('\n🧹 Step 2/2: Cleaning database...');
    const cleanupSuccess = await handleCleanup();
    
    if (cleanupSuccess) {
      console.log('\n🎉 Full process completed successfully!');
      console.log('====================================');
      console.log(`✅ Backup saved: ${backupPath}`);
      console.log('✅ Database cleaned and ready for fresh data');
      console.log('✅ All collection structures preserved');
    }
    
  } catch (error) {
    console.error('\n💥 Process failed:', error.message);
    console.log('\n🔧 Your backup may still be available if the backup step completed');
  }
}

/**
 * Interactive menu handler
 */
async function interactiveMenu() {
  let exitRequested = false;
  
  while (!exitRequested) {
    displayMenu();
    
    try {
      const choice = await getUserChoice();
      
      switch (choice) {
        case 1:
          await handleBackup();
          break;
          
        case 2:
          await handleCleanup();
          break;
          
        case 3:
          await handleFullProcess();
          break;
          
        case 4:
          console.log('\n👋 Goodbye! Your data remains unchanged.');
          exitRequested = true;
          break;
          
        default:
          console.log('\n❌ Invalid choice. Please enter 1, 2, 3, or 4.');
          break;
      }
      
      if (!exitRequested && choice >= 1 && choice <= 3) {
        console.log('\n⏸️  Press Enter to continue...');
        await new Promise(resolve => {
          rl.question('', () => resolve());
        });
      }
      
    } catch (error) {
      console.error('\n💥 An error occurred:', error.message);
      console.log('\n⏸️  Press Enter to continue...');
      await new Promise(resolve => {
        rl.question('', () => resolve());
      });
    }
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0]?.toLowerCase();
  
  try {
    switch (command) {
      case 'backup':
        await handleBackup();
        break;
        
      case 'cleanup':
        await handleCleanup();
        break;
        
      case 'full':
        await handleFullProcess();
        break;
        
      default:
        await interactiveMenu();
        break;
    }
  } catch (error) {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the database manager
main();