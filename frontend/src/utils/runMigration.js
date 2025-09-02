#!/usr/bin/env node

/**
 * Database Migration Runner
 * 
 * This script runs the database migration to consolidate duplicate user profiles
 * and ensure all profiles use UID as document ID.
 * 
 * Usage:
 *   node runMigration.js audit    # Check for duplicates without making changes
 *   node runMigration.js migrate  # Run the full migration
 */

import { auditProfiles, runAllMigrations } from './migrationScript.js';

const command = process.argv[2];

async function main() {
  try {
    switch (command) {
      case 'audit':
        console.log('Running audit mode...');
        const duplicates = await auditProfiles();
        if (duplicates === 0) {
          console.log('✅ No duplicates found! Database is clean.');
        } else {
          console.log(`\n💡 Run 'node runMigration.js migrate' to consolidate ${duplicates} duplicate documents.`);
        }
        break;
        
      case 'migrate':
        console.log('Running migration...');
        const confirmMigration = process.env.CONFIRM_MIGRATION === 'true';
        
        if (!confirmMigration) {
          console.log('⚠️  This will modify your database!');
          console.log('🔍 Run audit first: node runMigration.js audit');
          console.log('✅ To proceed with migration, set environment variable: CONFIRM_MIGRATION=true');
          process.exit(1);
        }
        
        await runAllMigrations();
        break;
        
      default:
        console.log('Usage:');
        console.log('  node runMigration.js audit    # Check for duplicates');
        console.log('  node runMigration.js migrate  # Run migration (requires CONFIRM_MIGRATION=true)');
        console.log('');
        console.log('Examples:');
        console.log('  node runMigration.js audit');
        console.log('  CONFIRM_MIGRATION=true node runMigration.js migrate');
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();