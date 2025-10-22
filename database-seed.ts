// ============================================================================
// HOLLY Database Seed Script
// ============================================================================
// Creates initial seed data for development and testing

import { getDatabaseClient } from './database-helpers';

async function seedDatabase() {
  console.log('🌱 Seeding HOLLY database...\n');

  const db = getDatabaseClient();

  try {
    // ==========================================================================
    // Create test user: Steve "Hollywood" Dorego
    // ==========================================================================
    
    console.log('👤 Creating user: Steve Hollywood Dorego');
    
    const user = await db.createUser({
      email: 'hollywood@whc.ca',
      username: 'hollywood',
      full_name: 'Steve Hollywood Dorego',
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
    });

    if (!user) {
      // User might already exist, try to fetch
      const existingUser = await db.getUserByEmail('hollywood@whc.ca');
      if (existingUser) {
        console.log('✅ User already exists:', existingUser.id);
        return existingUser;
      }
      throw new Error('Failed to create or fetch user');
    }

    console.log('✅ User created:', user.id);

    // ==========================================================================
    // Create sample conversations
    // ==========================================================================
    
    console.log('\n💬 Creating sample conversations');

    const conversation1 = await db.createConversation({
      user_id: user.id,
      title: 'Building HOLLY System',
      context: {
        project: 'HOLLY',
        phase: 'Phase 1B',
        task: 'Database Schema',
      },
    });

    if (conversation1) {
      console.log('✅ Conversation 1 created:', conversation1.id);

      // Add messages
      await db.addMessage(
        conversation1.id,
        {
          role: 'user',
          content: 'Let\'s build the database schema for HOLLY',
          timestamp: new Date().toISOString(),
        },
        {
          primary: 'excited',
          intensity: 0.85,
          confidence: 0.92,
        }
      );

      await db.addMessage(conversation1.id, {
        role: 'assistant',
        content: 'Alright Hollywood! Let\'s create a comprehensive PostgreSQL schema...',
        timestamp: new Date().toISOString(),
      });

      console.log('  ✅ Added 2 messages');
    }

    const conversation2 = await db.createConversation({
      user_id: user.id,
      title: 'React Component Development',
      context: {
        project: 'Personal Website',
        framework: 'React',
      },
    });

    if (conversation2) {
      console.log('✅ Conversation 2 created:', conversation2.id);
    }

    // ==========================================================================
    // Create sample code generation records
    // ==========================================================================
    
    console.log('\n💻 Creating sample code generations');

    const code1 = await db.saveCodeGeneration({
      user_id: user.id,
      conversation_id: conversation2?.id,
      prompt: 'Create a reusable Button component in React with TypeScript',
      language: 'typescript',
      template: 'react-component',
      code: `import React from 'react';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  onClick,
  disabled = false,
  children,
}) => {
  const baseClasses = 'rounded-lg font-semibold transition-all';
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  };
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={\`\${baseClasses} \${variantClasses[variant]} \${sizeClasses[size]}\`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};`,
      filename: 'Button.tsx',
      tests: `import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('respects disabled prop', () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick} disabled>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(onClick).not.toHaveBeenCalled();
  });
});`,
      documentation: `# Button Component

A reusable button component with multiple variants and sizes.

## Usage

\`\`\`tsx
import { Button } from './Button';

<Button variant="primary" size="md" onClick={() => alert('Clicked!')}>
  Click me
</Button>
\`\`\`

## Props

- \`variant\`: 'primary' | 'secondary' | 'danger' (default: 'primary')
- \`size\`: 'sm' | 'md' | 'lg' (default: 'md')
- \`onClick\`: Click handler function
- \`disabled\`: Whether button is disabled
- \`children\`: Button content`,
      dependencies: ['react', '@types/react', 'tailwindcss'],
      estimated_complexity: 'low',
      security_score: 100,
      security_passed: true,
      security_issues: [],
      ethics_score: 100,
      ethics_approved: true,
      ethics_violations: [],
      optimization_level: 'standard',
      include_tests: true,
      include_docs: true,
      ai_provider: 'claude',
      model: 'claude-3-5-sonnet-20241022',
      tokens_used: 1250,
      generation_time_ms: 3200,
    });

    if (code1) {
      console.log('✅ Code generation 1 created:', code1.id);
    }

    const code2 = await db.saveCodeGeneration({
      user_id: user.id,
      conversation_id: conversation1?.id,
      prompt: 'Create a PostgreSQL database schema for HOLLY',
      language: 'sql',
      code: '-- PostgreSQL schema for HOLLY\nCREATE TABLE users (\n  id UUID PRIMARY KEY,\n  ...\n);',
      filename: 'database-schema.sql',
      estimated_complexity: 'high',
      security_score: 95,
      security_passed: true,
      ethics_score: 100,
      ethics_approved: true,
      ai_provider: 'groq',
      model: 'llama-3.1-70b-versatile',
      tokens_used: 4500,
      generation_time_ms: 1800,
    });

    if (code2) {
      console.log('✅ Code generation 2 created:', code2.id);
    }

    // ==========================================================================
    // Create sample deployments
    // ==========================================================================
    
    console.log('\n🚀 Creating sample deployments');

    const deployment1 = await db.createDeployment({
      user_id: user.id,
      code_history_id: code1?.id,
      deployment_type: 'github',
      repository_name: 'holly-components',
      branch_name: 'main',
      files: [
        {
          path: 'src/components/Button.tsx',
          content: code1?.code || '',
          size: code1?.code.length || 0,
        },
      ],
    });

    if (deployment1) {
      console.log('✅ Deployment 1 created:', deployment1.id);

      // Update to success
      await db.updateDeploymentStatus(deployment1.id, 'success', {
        commit_sha: 'abc123def456',
        deployment_url: 'https://github.com/hollywood/holly-components',
      });

      await db.updateHealthCheck(deployment1.id, true, 200, 125);

      console.log('  ✅ Deployment marked as successful');
    }

    // ==========================================================================
    // Create sample audit logs
    // ==========================================================================
    
    console.log('\n📋 Creating sample audit logs');

    await db.createAuditLog({
      user_id: user.id,
      event_type: 'code_generation',
      action: 'generate_react_component',
      request_prompt: 'Create a reusable Button component',
      approved: true,
      security_score: 100,
      ethics_score: 100,
    });

    await db.createAuditLog({
      user_id: user.id,
      event_type: 'deployment',
      action: 'deploy_to_github',
      request_data: {
        repository: 'holly-components',
        branch: 'main',
      },
      approved: true,
    });

    await db.createAuditLog({
      user_id: user.id,
      event_type: 'code_generation',
      action: 'generate_sql_schema',
      request_prompt: 'Create database schema for HOLLY',
      approved: true,
      security_score: 95,
      ethics_score: 100,
    });

    console.log('✅ Created 3 audit log entries');

    // ==========================================================================
    // Display summary
    // ==========================================================================
    
    console.log('\n============================================');
    console.log('✅ Database seeding complete!\n');
    console.log('📊 Created:');
    console.log('  - 1 user (Hollywood)');
    console.log('  - 2 conversations');
    console.log('  - 2 code generation records');
    console.log('  - 1 deployment');
    console.log('  - 3 audit logs\n');
    console.log('🎉 Sample data ready for testing!');
    console.log('============================================\n');

    // Display user stats
    const stats = await db.getUserStats(user.id);
    if (stats) {
      console.log('📈 User Stats:');
      console.log(`  - Conversations: ${stats.total_conversations}`);
      console.log(`  - Code Generations: ${stats.total_code_generations}`);
      console.log(`  - Deployments: ${stats.total_deployments}`);
      console.log(`  - Avg Security Score: ${Math.round(stats.avg_security_score)}`);
      console.log(`  - Avg Ethics Score: ${Math.round(stats.avg_ethics_score)}\n`);
    }

    return user;

  } catch (error: any) {
    console.error('\n❌ Seeding failed:', error.message);
    throw error;
  }
}

// ============================================================================
// RUN IF CALLED DIRECTLY
// ============================================================================

if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('✅ Seed completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed failed:', error);
      process.exit(1);
    });
}

export { seedDatabase };
