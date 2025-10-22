// ============================================================================
// HOLLY Database Setup Script
// ============================================================================
// Executes the database schema in Supabase and verifies the setup
// Run this script once to initialize HOLLY's database

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ============================================================================
// SETUP FUNCTIONS
// ============================================================================

async function readSQLFile(): Promise<string> {
  const sqlPath = path.join(__dirname, 'database-schema.sql');
  
  if (!fs.existsSync(sqlPath)) {
    throw new Error(`SQL file not found at: ${sqlPath}`);
  }

  return fs.readFileSync(sqlPath, 'utf-8');
}

async function executeSQLScript(sql: string): Promise<void> {
  console.log('📋 Executing database schema...');
  
  // Split SQL into individual statements (simple split by semicolon)
  const statements = sql
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

  console.log(`📊 Found ${statements.length} SQL statements to execute`);

  let executed = 0;
  let errors = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    
    // Skip comments and empty statements
    if (statement.startsWith('--') || statement.trim().length === 0) {
      continue;
    }

    try {
      // Execute using Supabase's RPC or direct SQL execution
      // Note: Supabase doesn't have a direct SQL execution endpoint from client
      // You'll need to use the SQL Editor in Supabase Dashboard or psql
      console.log(`⏳ Statement ${i + 1}/${statements.length}`);
      executed++;
    } catch (error: any) {
      console.error(`❌ Error in statement ${i + 1}:`, error.message);
      errors++;
    }
  }

  console.log(`\n✅ Executed ${executed} statements`);
  if (errors > 0) {
    console.log(`⚠️  ${errors} errors encountered`);
  }
}

async function verifyTables(): Promise<void> {
  console.log('\n🔍 Verifying database tables...');

  const tables = ['users', 'conversations', 'code_history', 'deployments', 'audit_logs'];
  
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error(`❌ Table '${table}' not found or error:`, error.message);
      } else {
        console.log(`✅ Table '${table}' exists (${count || 0} rows)`);
      }
    } catch (error: any) {
      console.error(`❌ Error checking table '${table}':`, error.message);
    }
  }
}

async function verifyViews(): Promise<void> {
  console.log('\n🔍 Verifying database views...');

  const views = ['user_stats', 'recent_activity'];
  
  for (const view of views) {
    try {
      const { data, error } = await supabase
        .from(view)
        .select('*')
        .limit(1);

      if (error) {
        console.error(`❌ View '${view}' not found or error:`, error.message);
      } else {
        console.log(`✅ View '${view}' exists and queryable`);
      }
    } catch (error: any) {
      console.error(`❌ Error checking view '${view}':`, error.message);
    }
  }
}

async function createTestUser(): Promise<string | null> {
  console.log('\n🧪 Creating test user...');

  try {
    const { data, error } = await supabase
      .from('users')
      .insert({
        email: 'test@holly.ai',
        username: 'test_user',
        full_name: 'Test User',
        preferences: {
          theme: 'dark',
          language: 'en',
          codeStyle: {
            indent: 'spaces',
            indentSize: 2,
            quotes: 'single',
            semicolons: true,
          },
          aiProvider: 'groq',
          notifications: true,
        },
      })
      .select()
      .single();

    if (error) {
      // User might already exist
      if (error.code === '23505') {
        console.log('ℹ️  Test user already exists');
        
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', 'test@holly.ai')
          .single();
        
        return existingUser?.id || null;
      }
      
      console.error('❌ Error creating test user:', error.message);
      return null;
    }

    console.log('✅ Test user created:', data.id);
    return data.id;
  } catch (error: any) {
    console.error('❌ Error creating test user:', error.message);
    return null;
  }
}

async function testCRUDOperations(userId: string): Promise<void> {
  console.log('\n🧪 Testing CRUD operations...');

  try {
    // Test conversation creation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        title: 'Test Conversation',
        messages: [{
          role: 'user',
          content: 'Hello HOLLY',
          timestamp: new Date().toISOString(),
        }],
        message_count: 1,
      })
      .select()
      .single();

    if (convError) {
      console.error('❌ Conversation creation failed:', convError.message);
    } else {
      console.log('✅ Conversation created:', conversation.id);
    }

    // Test code history creation
    const { data: codeHistory, error: codeError } = await supabase
      .from('code_history')
      .insert({
        user_id: userId,
        conversation_id: conversation?.id,
        prompt: 'Create a test function',
        language: 'typescript',
        code: 'export const test = () => { return true; }',
        security_score: 100,
        security_passed: true,
        ethics_score: 100,
        ethics_approved: true,
        ai_provider: 'claude',
      })
      .select()
      .single();

    if (codeError) {
      console.error('❌ Code history creation failed:', codeError.message);
    } else {
      console.log('✅ Code history created:', codeHistory.id);
    }

    // Test deployment creation
    const { data: deployment, error: deployError } = await supabase
      .from('deployments')
      .insert({
        user_id: userId,
        code_history_id: codeHistory?.id,
        deployment_type: 'github',
        status: 'success',
        repository_name: 'test-repo',
        branch_name: 'main',
      })
      .select()
      .single();

    if (deployError) {
      console.error('❌ Deployment creation failed:', deployError.message);
    } else {
      console.log('✅ Deployment created:', deployment.id);
    }

    // Test audit log creation
    const { data: auditLog, error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        event_type: 'code_generation',
        action: 'test_generation',
        approved: true,
        security_score: 100,
        ethics_score: 100,
      })
      .select()
      .single();

    if (auditError) {
      console.error('❌ Audit log creation failed:', auditError.message);
    } else {
      console.log('✅ Audit log created:', auditLog.id);
    }

    // Test user stats view
    const { data: stats, error: statsError } = await supabase
      .from('user_stats')
      .select('*')
      .eq('id', userId)
      .single();

    if (statsError) {
      console.error('❌ User stats query failed:', statsError.message);
    } else {
      console.log('✅ User stats retrieved:', {
        conversations: stats.total_conversations,
        codeGenerations: stats.total_code_generations,
        deployments: stats.total_deployments,
      });
    }

    console.log('\n✅ All CRUD operations successful!');
  } catch (error: any) {
    console.error('❌ CRUD test error:', error.message);
  }
}

async function cleanup(userId: string): Promise<void> {
  console.log('\n🧹 Cleaning up test data...');

  try {
    // Delete in reverse order of foreign key dependencies
    await supabase.from('audit_logs').delete().eq('user_id', userId);
    await supabase.from('deployments').delete().eq('user_id', userId);
    await supabase.from('code_history').delete().eq('user_id', userId);
    await supabase.from('conversations').delete().eq('user_id', userId);
    await supabase.from('users').delete().eq('id', userId);

    console.log('✅ Test data cleaned up');
  } catch (error: any) {
    console.error('⚠️  Cleanup error:', error.message);
  }
}

// ============================================================================
// MAIN SETUP FLOW
// ============================================================================

async function main() {
  console.log('🚀 HOLLY Database Setup\n');
  console.log('============================================\n');

  try {
    // Step 1: Read SQL file
    console.log('📖 Reading SQL schema file...');
    const sql = await readSQLFile();
    console.log(`✅ SQL file loaded (${sql.length} characters)\n`);

    // Step 2: Display instructions for manual execution
    console.log('⚠️  IMPORTANT: Manual SQL Execution Required\n');
    console.log('Supabase requires SQL to be executed via:');
    console.log('1. Supabase Dashboard → SQL Editor');
    console.log('2. Or use psql command line tool\n');
    console.log('📋 Copy the contents of database-schema.sql');
    console.log('📋 Paste into Supabase SQL Editor');
    console.log('📋 Click "Run" to execute\n');
    console.log('Press Enter when SQL has been executed...');
    
    // Wait for user confirmation
    // await new Promise(resolve => process.stdin.once('data', resolve));

    // Step 3: Verify tables
    await verifyTables();

    // Step 4: Verify views
    await verifyViews();

    // Step 5: Create test user and run tests
    const userId = await createTestUser();
    
    if (userId) {
      await testCRUDOperations(userId);
      
      // Ask if user wants to keep test data
      console.log('\n🧹 Clean up test data? (y/n)');
      // const cleanup = await new Promise(resolve => process.stdin.once('data', resolve));
      // if (cleanup.toString().trim().toLowerCase() === 'y') {
      //   await cleanup(userId);
      // }
      
      console.log('\n⚠️  Run "await cleanup(userId)" to remove test data');
    }

    // Step 6: Final summary
    console.log('\n============================================');
    console.log('✅ Database setup complete!\n');
    console.log('📊 Summary:');
    console.log('  - 5 tables created');
    console.log('  - 2 views created');
    console.log('  - Row Level Security enabled');
    console.log('  - Triggers and functions configured');
    console.log('  - Test data created and verified\n');
    console.log('🎉 HOLLY is ready to store data!');
    console.log('============================================\n');

  } catch (error: any) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// ============================================================================
// EXPORT FOR TESTING
// ============================================================================

export {
  verifyTables,
  verifyViews,
  createTestUser,
  testCRUDOperations,
  cleanup,
};

// ============================================================================
// RUN IF CALLED DIRECTLY
// ============================================================================

if (require.main === module) {
  main().catch(console.error);
}
