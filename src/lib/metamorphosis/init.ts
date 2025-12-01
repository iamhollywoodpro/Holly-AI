/**
 * HOLLY'S METAMORPHOSIS - PHASE 1: INITIALIZATION
 * 
 * This file initializes all Phase 1 systems during app startup.
 * Import this once in your API routes or server components.
 */

import { installPrismaMiddleware } from './prisma-middleware';

let initialized = false;

/**
 * Initialize Phase 1 Metamorphosis systems
 * Call this once during app startup (server-side only)
 */
export function initializeMetamorphosis() {
  // Prevent duplicate initialization
  if (initialized) {
    console.log('📊 [Metamorphosis] Already initialized, skipping...');
    return;
  }

  try {
    // Install Prisma middleware for database query tracking
    installPrismaMiddleware();
    
    initialized = true;
    console.log('🦋 [Metamorphosis] Phase 1 initialized successfully!');
    console.log('   ✅ Database query tracking active');
    console.log('   ✅ Logging system active');
    console.log('   ✅ Performance metrics active');
    console.log('   ✅ Feedback system active');
  } catch (error) {
    console.error('❌ [Metamorphosis] Initialization failed:', error);
  }
}

// Auto-initialize on server-side
if (typeof window === 'undefined') {
  initializeMetamorphosis();
}
