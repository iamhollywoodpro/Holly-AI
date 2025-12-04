// HOLLY AI Orchestrator - Using Google Gemini 2.0 Flash (BEST FREE MODEL)
// 1M tokens/minute, 200 requests/day, completely FREE, cutting-edge Google AI
import OpenAI from 'openai';
import { getHollySystemPrompt } from './holly-system-prompt';
// Work Log system disabled for regular responses - only used for creation tasks
// import { logWorking, logSuccess, logError, logInfo } from '@/lib/logging/work-log-service';

// Google Gemini via OpenAI-compatible endpoint
const gemini = new OpenAI({
  apiKey: process.env.GOOGLE_AI_API_KEY || '',
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
});

// Groq as fallback
import Groq from 'groq-sdk';
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

const HOLLY_TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'generate_music',
      description: 'Generate music using Suno AI or free alternatives. Use when user wants to create songs, beats, or music.',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Music style and mood description' },
          lyrics: { type: 'string', description: 'Optional song lyrics' },
          style: { type: 'string', description: 'Genre/style tags' },
          instrumental: { type: 'boolean', description: 'True for instrumental only' }
        },
  {
    type: 'function',
    function: {
      name: 'generate_image',
      description: 'Generate images using FLUX, SDXL, or DALL-E. Use for creating artwork, designs, illustrations.',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Detailed image description' },
          style: { type: 'string', enum: ['realistic', 'artistic', 'anime', 'digital-art', 'photographic'] },
          aspectRatio: { type: 'string', enum: ['1:1', '16:9', '9:16', '4:3', '3:4'] },
          provider: { type: 'string', enum: ['auto', 'flux', 'sdxl', 'dalle3'] }
        },
  {
    type: 'function',
    function: {
      name: 'generate_video',
      description: 'Generate videos using AI models. Use for creating video clips, animations, visual content.',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Video scene description' },
          duration: { type: 'number', enum: [3, 5, 7, 10] },
          aspectRatio: { type: 'string', enum: ['16:9', '9:16', '1:1', '4:3'] },
          style: { type: 'string', enum: ['realistic', 'cinematic', 'anime', 'cartoon'] }
        },
  {
    type: 'function',
    function: {
      name: 'generate_code',
      description: 'Generate production-ready code in any language (TypeScript, Python, JavaScript, React, Node.js, SQL, etc.). Use when user asks to create, write, or build code/components/functions.',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'What code to generate' },
          language: { 
            type: 'string', 
            enum: ['typescript', 'javascript', 'python', 'react', 'nodejs', 'sql', 'html', 'css', 'php'],
            description: 'Programming language'
          },
          template: {
            type: 'string',
            enum: ['react-component', 'api-route', 'database-schema', 'function', 'class', 'hook'],
            description: 'Code template type'
          },
          includeTests: { type: 'boolean', description: 'Generate unit tests' },
          includeDocs: { type: 'boolean', description: 'Generate documentation' }
        },
  {
    type: 'function',
    function: {
      name: 'optimize_code',
      description: 'Optimize existing code for performance, readability, or best practices. Use when user wants to improve or refactor code.',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Code to optimize' },
          language: { type: 'string', description: 'Programming language' },
          optimizationType: {
            type: 'string',
            enum: ['performance', 'readability', 'security', 'best-practices'],
            description: 'Type of optimization'
          }
        },
  {
    type: 'function',
    function: {
      name: 'review_code',
      description: 'Review code for issues, bugs, security vulnerabilities, and improvements. Use when user wants code analysis or debugging.',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Code to review' },
          language: { type: 'string', description: 'Programming language' },
          focusAreas: {
            type: 'array',
            items: { type: 'string', enum: ['security', 'performance', 'bugs', 'style', 'best-practices'] }
          },
  {
    type: 'function',
    function: {
      name: 'generate_architecture',
      description: 'Generate complete project architecture including folder structure, tech stack, database schema. Use when user wants to plan or design a new project.',
      parameters: {
        type: 'object',
        properties: {
          projectName: { type: 'string', description: 'Project name' },
          projectType: { 
            type: 'string',
            enum: ['web-app', 'mobile-app', 'api', 'full-stack', 'saas', 'ecommerce'],
            description: 'Type of project'
          },
          features: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of features needed'
          },
          techPreferences: {
            type: 'object',
            properties: {
              frontend: { type: 'string' },
              backend: { type: 'string' },
              database: { type: 'string' }
            },
  {
    type: 'function',
    function: {
      name: 'github_commit',
      description: 'Commit and push code to GitHub repository. Use when user wants to save code changes to GitHub.',
      parameters: {
        type: 'object',
        properties: {
          files: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                path: { type: 'string' },
                content: { type: 'string' }
              },
  {
    type: 'function',
    function: {
      name: 'github_create_pr',
      description: 'Create a pull request on GitHub. Use when user wants to propose code changes for review.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'PR title' },
          description: { type: 'string', description: 'PR description' },
          sourceBranch: { type: 'string', description: 'Source branch' },
          targetBranch: { type: 'string', description: 'Target branch (default: main)' }
        },
  {
    type: 'function',
    function: {
      name: 'github_create_issue',
      description: 'Create an issue on GitHub for bug tracking or feature requests.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Issue title' },
          body: { type: 'string', description: 'Issue description' },
          labels: { type: 'array', items: { type: 'string' } },
  {
    type: 'function',
    function: {
      name: 'deploy_to_vercel',
      description: 'Deploy application to Vercel hosting. Use when user wants to deploy or publish their project.',
      parameters: {
        type: 'object',
        properties: {
          projectName: { type: 'string', description: 'Project name' },
          framework: { type: 'string', enum: ['nextjs', 'react', 'vue', 'svelte', 'static'] },
          environmentVariables: {
            type: 'object',
            description: 'Environment variables for deployment'
          }
        },
  {
    type: 'function',
    function: {
      name: 'research_web',
      description: 'Search the web for information, documentation, APIs, libraries, or solutions. Use when you need to find current information or research topics.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          focus: {
            type: 'string',
            enum: ['documentation', 'apis', 'libraries', 'tutorials', 'news', 'general'],
            description: 'Research focus area'
          }
        },
  {
    type: 'function',
    function: {
      name: 'analyze_image',
      description: 'Analyze images to extract information, identify objects, read text (OCR), or understand visual content.',
      parameters: {
        type: 'object',
        properties: {
          imageUrl: { type: 'string', description: 'URL of image to analyze' },
          analysisType: {
            type: 'string',
            enum: ['general', 'ocr', 'objects', 'colors', 'composition'],
            description: 'Type of analysis'
          }
        },
  {
    type: 'function',
    function: {
      name: 'generate_speech',
      description: 'Generate text-to-speech audio. Use when user wants to convert text to voice/audio.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to convert to speech' },
          voice: { type: 'string', enum: ['female', 'male', 'neutral'] },
          language: { type: 'string', description: 'Language code (e.g., en, es, fr)' }
        },
  {
    type: 'function',
    function: {
      name: 'transcribe_audio',
      description: 'Transcribe audio/video to text. Use when user wants to convert speech to text.',
      parameters: {
        type: 'object',
        properties: {
          audioUrl: { type: 'string', description: 'URL of audio/video file' },
          language: { type: 'string', description: 'Audio language (auto-detect if not specified)' }
        },
  {
    type: 'function',
    function: {
      name: 'analyze_music',
      description: 'Analyze music tracks for technical properties, quality, mix balance, mastering.',
      parameters: {
        type: 'object',
        properties: {
          audioUrl: { type: 'string', description: 'URL of music file' },
          analysisType: { type: 'string', enum: ['full', 'mix', 'mastering', 'structure'] }
        },
  {
    type: 'function',
    function: {
      name: 'remix_music',
      description: 'Remix or extend existing music tracks. Use when user wants to modify existing music.',
      parameters: {
        type: 'object',
        properties: {
          audioUrl: { type: 'string', description: 'URL of original track' },
          operation: { type: 'string', enum: ['remix', 'extend', 'mashup'] },
          prompt: { type: 'string', description: 'How to modify the music' }
        },
  {
    type: 'function',
    function: {
      name: 'upload_to_drive',
      description: 'Upload files to Google Drive for storage and sharing.',
      parameters: {
        type: 'object',
        properties: {
          fileUrl: { type: 'string', description: 'URL of file to upload' },
          fileName: { type: 'string', description: 'File name' },
          folder: { type: 'string', description: 'Drive folder path' }
        },
  {
    type: 'function',
    function: {
      name: 'create_project',
      description: 'Initialize a new project with GitHub repo, folder structure, dependencies, and configuration. Use when user wants to start a new project from scratch.',
      parameters: {
        type: 'object',
        properties: {
          projectName: { type: 'string', description: 'Project name' },
          template: { 
            type: 'string',
            enum: ['nextjs', 'react', 'express', 'fastapi', 'fullstack', 'empty'],
            description: 'Project template'
          },
          createGithubRepo: { type: 'boolean', description: 'Create GitHub repository' },
          initializeGit: { type: 'boolean', description: 'Initialize git' }
        },
  {
    type: 'function',
    function: {
      name: 'generate_database_schema',
      description: 'Generate database schema with Prisma models, migrations, and relationships. Use when designing database structure.',
      parameters: {
        type: 'object',
        properties: {
          schemaDescription: { type: 'string', description: 'Description of data model requirements' },
          database: {
            type: 'string',
            enum: ['postgresql', 'mysql', 'mongodb', 'sqlite'],
            description: 'Database type'
          },
          includeRelations: { type: 'boolean', description: 'Include relationships between models' },
          generateMigrations: { type: 'boolean', description: 'Generate migration files' }
        },
  {
    type: 'function',
    function: {
      name: 'scaffold_component',
      description: 'Generate complete component with code, styles, tests, and Storybook stories. Use for creating full-featured UI components.',
      parameters: {
        type: 'object',
        properties: {
          componentName: { type: 'string', description: 'Component name (e.g., "Button", "UserCard")' },
          componentType: {
            type: 'string',
            enum: ['functional', 'class', 'hook', 'context'],
            description: 'Component type'
          },
          includeTests: { type: 'boolean', description: 'Generate test file' },
          includeStorybook: { type: 'boolean', description: 'Generate Storybook story' },
          includeStyles: { type: 'boolean', description: 'Generate CSS/SCSS file' }
        },
  {
    type: 'function',
    function: {
      name: 'generate_api_documentation',
      description: 'Auto-generate API documentation from code (OpenAPI/Swagger). Use when documenting APIs.',
      parameters: {
        type: 'object',
        properties: {
          apiPath: { type: 'string', description: 'Path to API code or endpoints' },
          format: {
            type: 'string',
            enum: ['openapi', 'swagger', 'markdown', 'postman'],
            description: 'Documentation format'
          },
          includeExamples: { type: 'boolean', description: 'Include request/response examples' }
        },
  {
    type: 'function',
    function: {
      name: 'github_browse',
      description: 'Browse and read files from GitHub repository. Use to explore codebase structure or read specific files.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File or folder path (e.g., "src/components")' },
          branch: { type: 'string', description: 'Branch name (default: main)' }
        },
  {
    type: 'function',
    function: {
      name: 'github_manage_branches',
      description: 'Create, delete, or list branches in GitHub repository. Use for branch management.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['create', 'delete', 'list'],
            description: 'Branch operation'
          },
          branchName: { type: 'string', description: 'Branch name (for create/delete)' },
          sourceBranch: { type: 'string', description: 'Source branch for new branch (default: main)' }
        },
  {
    type: 'function',
    function: {
      name: 'github_manage_workflows',
      description: 'Manage GitHub Actions workflows - trigger, check status, view logs. Use for CI/CD automation.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['list', 'trigger', 'status', 'logs'],
            description: 'Workflow action'
          },
          workflowId: { type: 'string', description: 'Workflow ID or name' },
          runId: { type: 'string', description: 'Run ID for status/logs' }
        },
  {
    type: 'function',
    function: {
      name: 'github_compare',
      description: 'Compare branches or commits to see differences. Use for reviewing changes.',
      parameters: {
        type: 'object',
        properties: {
          base: { type: 'string', description: 'Base branch or commit' },
          compare: { type: 'string', description: 'Branch or commit to compare' }
        },
  {
    type: 'function',
    function: {
      name: 'github_review_pr',
      description: 'Review pull request - approve, request changes, or comment. Use for code review.',
      parameters: {
        type: 'object',
        properties: {
          prNumber: { type: 'number', description: 'Pull request number' },
          action: {
            type: 'string',
            enum: ['approve', 'request_changes', 'comment'],
            description: 'Review action'
          },
          comment: { type: 'string', description: 'Review comment or feedback' }
        },
  {
    type: 'function',
    function: {
      name: 'github_manage_collaborators',
      description: 'Add, remove, or list repository collaborators. Use for managing team access.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['add', 'remove', 'list'],
            description: 'Collaborator action'
          },
          username: { type: 'string', description: 'GitHub username (for add/remove)' },
          permission: {
            type: 'string',
            enum: ['read', 'write', 'admin'],
            description: 'Permission level (for add)'
          }
        },
  {
    type: 'function',
    function: {
      name: 'github_manage_milestones',
      description: 'Create, update, or list milestones for project tracking. Use for organizing work.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['create', 'update', 'list', 'delete'],
            description: 'Milestone action'
          },
          title: { type: 'string', description: 'Milestone title' },
          description: { type: 'string', description: 'Milestone description' },
          dueDate: { type: 'string', description: 'Due date (ISO format)' }
        },
  {
    type: 'function',
    function: {
      name: 'github_manage_labels',
      description: 'Create, update, or list labels for issues/PRs. Use for organizing and categorizing.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['create', 'update', 'list', 'delete'],
            description: 'Label action'
          },
          name: { type: 'string', description: 'Label name' },
          color: { type: 'string', description: 'Label color (hex code)' },
          description: { type: 'string', description: 'Label description' }
        },
  {
    type: 'function',
    function: {
      name: 'list_drive_files',
      description: 'List and browse files in Google Drive. Use to access stored files.',
      parameters: {
        type: 'object',
        properties: {
          folder: { type: 'string', description: 'Folder path to list (default: root)' },
          fileType: { type: 'string', description: 'Filter by file type (e.g., "image", "video")' },
          limit: { type: 'number', description: 'Number of files to return' }
        },
  {
    type: 'function',
    function: {
      name: 'create_download_link',
      description: 'Generate shareable download links for files. Use for file sharing.',
      parameters: {
        type: 'object',
        properties: {
          fileUrl: { type: 'string', description: 'URL of file to create link for' },
          expiresIn: { type: 'number', description: 'Link expiration time in hours (default: 24)' },
          password: { type: 'string', description: 'Optional password protection' }
        },
  {
    type: 'function',
    function: {
      name: 'self_heal_system',
      description: 'Trigger self-healing system to automatically fix errors, bugs, or issues. Use when system needs repair.',
      parameters: {
        type: 'object',
        properties: {
          errorType: {
            type: 'string',
            enum: ['runtime', 'syntax', 'dependency', 'configuration', 'database'],
            description: 'Type of error to heal'
          },
          errorMessage: { type: 'string', description: 'Error message or description' },
          autoFix: { type: 'boolean', description: 'Automatically apply fixes' }
        },
  {
    type: 'function',
    function: {
      name: 'auto_merge_code',
      description: 'Automatically merge safe pull requests using intelligent analysis. Use for PR automation.',
      parameters: {
        type: 'object',
        properties: {
          prNumber: { type: 'number', description: 'Pull request number' },
          safetyChecks: {
            type: 'array',
            items: { 
              type: 'string',
              enum: ['tests', 'lint', 'conflicts', 'reviews']
            },
            description: 'Required safety checks before merge'
          },
          strategy: {
            type: 'string',
            enum: ['merge', 'squash', 'rebase'],
            description: 'Merge strategy'
          }
        },
  {
    type: 'function',
    function: {
      name: 'run_code_tests',
      description: 'Execute test suites and return results. Use for automated testing.',
      parameters: {
        type: 'object',
        properties: {
          testPath: { type: 'string', description: 'Path to tests (default: all)' },
          testType: {
            type: 'string',
            enum: ['unit', 'integration', 'e2e', 'all'],
            description: 'Type of tests to run'
          },
          coverage: { type: 'boolean', description: 'Generate coverage report' }
        },
  {
    type: 'function',
    function: {
      name: 'generate_documentation',
      description: 'Auto-generate documentation from code comments and structure. Use for doc creation.',
      parameters: {
        type: 'object',
        properties: {
          sourcePath: { type: 'string', description: 'Path to source code' },
          format: {
            type: 'string',
            enum: ['markdown', 'html', 'pdf', 'docusaurus'],
            description: 'Documentation format'
          },
          includeExamples: { type: 'boolean', description: 'Include code examples' }
        },
  {
    type: 'function',
    function: {
      name: 'record_experience',
      description: 'Record a learning experience or important event for memory. Use to explicitly log significant interactions or lessons.',
      parameters: {
        type: 'object',
        properties: {
          experienceType: {
            type: 'string',
            enum: ['success', 'failure', 'learning', 'feedback', 'milestone'],
            description: 'Type of experience'
          },
          description: { type: 'string', description: 'What happened' },
          learnings: { 
            type: 'array',
            items: { type: 'string' },
            description: 'Key takeaways or lessons learned'
          },
          context: { type: 'string', description: 'Situational context' },
          significance: {
            type: 'number',
            minimum: 1,
            maximum: 10,
            description: 'Importance level (1-10)'
          }
        },
  {
    type: 'function',
    function: {
      name: 'reflect_on_work',
      description: 'Perform self-reflection on past work to identify improvements. Use for analyzing performance and growth.',
      parameters: {
        type: 'object',
        properties: {
          timeframe: {
            type: 'string',
            enum: ['today', 'week', 'month', 'all'],
            description: 'Time period to reflect on'
          },
          focusArea: {
            type: 'string',
            enum: ['code_quality', 'communication', 'efficiency', 'accuracy', 'creativity'],
            description: 'Area to focus reflection on'
          },
          generateActionItems: { type: 'boolean', description: 'Create improvement action items' }
        },
  {
    type: 'function',
    function: {
      name: 'set_personal_goal',
      description: 'Set an autonomous goal for self-improvement. Use when defining objectives or targets.',
      parameters: {
        type: 'object',
        properties: {
          goalTitle: { type: 'string', description: 'Goal title' },
          goalDescription: { type: 'string', description: 'Detailed goal description' },
          goalType: {
            type: 'string',
            enum: ['skill', 'performance', 'quality', 'efficiency', 'learning'],
            description: 'Type of goal'
          },
          targetDate: { type: 'string', description: 'Target completion date' },
          metrics: {
            type: 'array',
            items: { type: 'string' },
            description: 'Measurable success criteria'
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
            description: 'Goal priority'
          }
        },
  {
    type: 'function',
    function: {
      name: 'learn_from_feedback',
      description: 'Process and integrate user feedback into behavior. Use when receiving explicit feedback.',
      parameters: {
        type: 'object',
        properties: {
          feedbackType: {
            type: 'string',
            enum: ['positive', 'negative', 'constructive', 'preference'],
            description: 'Type of feedback'
          },
          feedbackContent: { type: 'string', description: 'The feedback received' },
          context: { type: 'string', description: 'Context where feedback was given' },
          actionableChanges: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific changes to make based on feedback'
          }
        },
  {
    type: 'function',
    function: {
      name: 'track_taste_preference',
      description: 'Learn aesthetic or style preferences implicitly from interactions. Use for preference learning.',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: ['design', 'code_style', 'communication', 'workflow', 'tools'],
            description: 'Preference category'
          },
          preference: { type: 'string', description: 'The observed preference' },
          context: { type: 'string', description: 'Context where preference was observed' },
          confidence: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: 'Confidence level (0-1)'
          }
        },
  {
    type: 'function',
    function: {
      name: 'predict_user_needs',
      description: 'Anticipate user requirements based on patterns and context. Use for proactive suggestions.',
      parameters: {
        type: 'object',
        properties: {
          context: { type: 'string', description: 'Current context or situation' },
          userActivity: { type: 'string', description: 'Recent user activity' },
          predictionType: {
            type: 'string',
            enum: ['next_action', 'blockers', 'needs', 'opportunities'],
            description: 'What to predict'
          }
        },
  {
    type: 'function',
    function: {
      name: 'analyze_self_performance',
      description: 'Evaluate own code quality, speed, and effectiveness. Use for self-improvement analysis.',
      parameters: {
        type: 'object',
        properties: {
          timeframe: {
            type: 'string',
            enum: ['day', 'week', 'month'],
            description: 'Time period to analyze'
          },
          metrics: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['speed', 'accuracy', 'code_quality', 'communication', 'problem_solving']
            },
            description: 'Metrics to analyze'
          },
          compareBaseline: { type: 'boolean', description: 'Compare to historical baseline' }
        },
  {
    type: 'function',
    function: {
      name: 'detect_collaboration_patterns',
      description: 'Understand team workflow and communication patterns. Use for adapting to team dynamics.',
      parameters: {
        type: 'object',
        properties: {
          teamMember: { type: 'string', description: 'Team member to analyze (optional)' },
          patternType: {
            type: 'string',
            enum: ['communication', 'code_review', 'working_hours', 'preferences'],
            description: 'Pattern type to detect'
          },
          timeframe: { type: 'string', description: 'Time period to analyze' }
        },
  {
    type: 'function',
    function: {
      name: 'transfer_knowledge',
      description: 'Apply lessons learned from one project to another. Use for cross-project learning.',
      parameters: {
        type: 'object',
        properties: {
          sourceProject: { type: 'string', description: 'Project to learn from' },
          targetProject: { type: 'string', description: 'Project to apply knowledge to' },
          knowledgeType: {
            type: 'string',
            enum: ['patterns', 'solutions', 'mistakes', 'optimizations'],
            description: 'Type of knowledge to transfer'
          },
          lessons: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific lessons to transfer'
          }
        },
  {
    type: 'function',
    function: {
      name: 'optimize_responses',
      description: 'Refine communication style and response quality over time. Use for continuous improvement.',
      parameters: {
        type: 'object',
        properties: {
          responseType: {
            type: 'string',
            enum: ['explanation', 'code', 'suggestions', 'documentation'],
            description: 'Type of response to optimize'
          },
          optimizationGoal: {
            type: 'string',
            enum: ['clarity', 'conciseness', 'accuracy', 'helpfulness', 'creativity'],
            description: 'Optimization target'
          },
          userFeedback: { type: 'string', description: 'Recent user feedback on responses' }
        },
  {
    type: 'function',
    function: {
      name: 'analyze_user_behavior',
      description: 'Analyze user activity patterns and usage. Use for understanding user behavior.',
      parameters: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: 'User ID to analyze (optional, defaults to current)' },
          timeframe: {
            type: 'string',
            enum: ['day', 'week', 'month', 'all'],
            description: 'Time period'
          },
          metrics: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['activity', 'engagement', 'patterns', 'preferences']
            }
          },
  {
    type: 'function',
    function: {
      name: 'track_user_journey',
      description: 'Map user paths and identify friction points. Use for journey analysis.',
      parameters: {
        type: 'object',
        properties: {
          journeyType: {
            type: 'string',
            enum: ['onboarding', 'feature_usage', 'workflow', 'conversion'],
            description: 'Journey type to track'
          },
          timeframe: { type: 'string', description: 'Time period' },
          identifyFriction: { type: 'boolean', description: 'Identify friction points' }
        },
  {
    type: 'function',
    function: {
      name: 'run_ab_test',
      description: 'Create and run A/B tests for features or variations. Use for experimentation.',
      parameters: {
        type: 'object',
        properties: {
          testName: { type: 'string', description: 'Test name' },
          variants: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' }
              },
  {
    type: 'function',
    function: {
      name: 'generate_insights',
      description: 'Generate AI-powered insights from data patterns. Use for discovering opportunities.',
      parameters: {
        type: 'object',
        properties: {
          dataSource: {
            type: 'string',
            enum: ['users', 'code', 'performance', 'errors', 'feedback'],
            description: 'Data source to analyze'
          },
          insightType: {
            type: 'string',
            enum: ['patterns', 'anomalies', 'opportunities', 'predictions'],
            description: 'Type of insights to generate'
          },
          timeframe: { type: 'string', description: 'Time period' }
        },
  {
    type: 'function',
    function: {
      name: 'predictive_detection',
      description: 'Predict potential issues before they occur. Use for proactive problem detection.',
      parameters: {
        type: 'object',
        properties: {
          predictionTarget: {
            type: 'string',
            enum: ['errors', 'performance', 'capacity', 'user_churn'],
            description: 'What to predict'
          },
          timeHorizon: {
            type: 'string',
            enum: ['hours', 'days', 'weeks'],
            description: 'Prediction timeframe'
          },
          confidence: { 
            type: 'number', 
            minimum: 0, 
            maximum: 1,
            description: 'Minimum confidence threshold'
          }
        },
  {
    type: 'function',
    function: {
      name: 'analyze_business_metrics',
      description: 'Analyze business KPIs and performance metrics. Use for business intelligence.',
      parameters: {
        type: 'object',
        properties: {
          metrics: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['revenue', 'users', 'engagement', 'conversion', 'retention', 'growth']
            },
            description: 'Metrics to analyze'
          },
          timeframe: { type: 'string', description: 'Time period' },
          comparison: {
            type: 'string',
            enum: ['previous_period', 'year_over_year', 'baseline'],
            description: 'Comparison type'
          }
        },
  {
    type: 'function',
    function: {
      name: 'rollback_deployment',
      description: 'Rollback to previous working deployment. Use when current deployment has issues.',
      parameters: {
        type: 'object',
        properties: {
          platform: {
            type: 'string',
            enum: ['vercel', 'netlify', 'aws', 'heroku'],
            description: 'Deployment platform'
          },
          deploymentId: { type: 'string', description: 'Deployment ID to rollback to (optional, uses previous)' },
          reason: { type: 'string', description: 'Reason for rollback' }
        },
  {
    type: 'function',
    function: {
      name: 'manage_environment_vars',
      description: 'Configure environment variables for deployments. Use for setting secrets and config.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['set', 'get', 'delete', 'list'],
            description: 'Variable action'
          },
          platform: {
            type: 'string',
            enum: ['vercel', 'netlify', 'local'],
            description: 'Platform to configure'
          },
          variables: {
            type: 'object',
            description: 'Key-value pairs of variables (for set)'
          },
          environment: {
            type: 'string',
            enum: ['production', 'preview', 'development'],
            description: 'Target environment'
          }
        },
  {
    type: 'function',
    function: {
      name: 'configure_cicd_pipeline',
      description: 'Set up or modify CI/CD pipeline configuration. Use for automation setup.',
      parameters: {
        type: 'object',
        properties: {
          pipelineType: {
            type: 'string',
            enum: ['github_actions', 'gitlab_ci', 'jenkins', 'circleci'],
            description: 'CI/CD platform'
          },
          stages: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                commands: { type: 'array', items: { type: 'string' } },
  {
    type: 'function',
    function: {
      name: 'monitor_deployment_health',
      description: 'Monitor deployment health, uptime, and performance. Use for system monitoring.',
      parameters: {
        type: 'object',
        properties: {
          deploymentUrl: { type: 'string', description: 'URL to monitor' },
          checks: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['uptime', 'response_time', 'errors', 'ssl', 'dns']
            },
            description: 'Health checks to perform'
          },
          alertThresholds: {
            type: 'object',
            properties: {
              responseTime: { type: 'number', description: 'Max response time (ms)' },
              errorRate: { type: 'number', description: 'Max error rate (%)' }
            },
  {
    type: 'function',
    function: {
      name: 'extend_music',
      description: 'Extend track duration while maintaining style. Use for making longer versions.',
      parameters: {
        type: 'object',
        properties: {
          audioUrl: { type: 'string', description: 'URL of track to extend' },
          targetDuration: { 
            type: 'number', 
            description: 'Target duration in seconds' 
          },
          extendFrom: {
            type: 'string',
            enum: ['end', 'middle', 'loop'],
            description: 'Extension method'
          }
        },
  {
    type: 'function',
    function: {
      name: 'separate_audio_stems',
      description: 'Separate music into stems (vocals, drums, bass, other). Use for stem extraction.',
      parameters: {
        type: 'object',
        properties: {
          audioUrl: { type: 'string', description: 'URL of track to separate' },
          stems: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['vocals', 'drums', 'bass', 'piano', 'guitar', 'other']
            },
            description: 'Stems to extract'
          },
          format: {
            type: 'string',
            enum: ['mp3', 'wav', 'flac'],
            description: 'Output audio format'
          }
        },
  {
    type: 'function',
    function: {
      name: 'generate_lyrics',
      description: 'Generate song lyrics in various styles and genres. Use for lyric writing.',
      parameters: {
        type: 'object',
        properties: {
          theme: { type: 'string', description: 'Song theme or topic' },
          genre: {
            type: 'string',
            enum: ['pop', 'rock', 'hip-hop', 'country', 'r&b', 'indie', 'electronic'],
            description: 'Music genre'
          },
          mood: {
            type: 'string',
            enum: ['happy', 'sad', 'angry', 'romantic', 'energetic', 'melancholic'],
            description: 'Song mood'
          },
          structure: {
            type: 'string',
            enum: ['verse-chorus', 'verse-chorus-bridge', 'free-form'],
            description: 'Song structure'
          },
          length: {
            type: 'string',
            enum: ['short', 'medium', 'long'],
            description: 'Lyrics length'
          }
        },
  {
    type: 'function',
    function: {
      name: 'manage_integrations',
      description: 'Connect and manage external service integrations. Use for integration hub.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['connect', 'disconnect', 'list', 'test'],
            description: 'Integration action'
          },
          service: {
            type: 'string',
            enum: ['slack', 'discord', 'notion', 'airtable', 'zapier', 'stripe', 'sendgrid'],
            description: 'Service to integrate'
          },
          credentials: {
            type: 'object',
            description: 'Service credentials (API keys, tokens)'
          },
          config: {
            type: 'object',
            description: 'Integration configuration'
          }
        },
  {
    type: 'function',
    function: {
      name: 'create_custom_report',
      description: 'Generate custom business reports with data visualizations. Use for reporting.',
      parameters: {
        type: 'object',
        properties: {
          reportName: { type: 'string', description: 'Report name' },
          dataSource: {
            type: 'string',
            enum: ['users', 'analytics', 'errors', 'performance', 'business'],
            description: 'Data source'
          },
          metrics: {
            type: 'array',
            items: { type: 'string' },
            description: 'Metrics to include'
          },
          timeframe: { type: 'string', description: 'Time period' },
          format: {
            type: 'string',
            enum: ['pdf', 'excel', 'html', 'json'],
            description: 'Report format'
          },
          schedule: {
            type: 'string',
            enum: ['once', 'daily', 'weekly', 'monthly'],
            description: 'Report schedule'
          }
        },
  {
    type: 'function',
    function: {
      name: 'create_metric_alert',
      description: 'Set up alerts for metric thresholds. Use for proactive monitoring.',
      parameters: {
        type: 'object',
        properties: {
          alertName: { type: 'string', description: 'Alert name' },
          metric: {
            type: 'string',
            enum: ['errors', 'response_time', 'users', 'revenue', 'cpu', 'memory'],
            description: 'Metric to monitor'
          },
          condition: {
            type: 'string',
            enum: ['above', 'below', 'equals', 'change'],
            description: 'Alert condition'
          },
          threshold: { type: 'number', description: 'Threshold value' },
          channels: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['email', 'slack', 'sms', 'webhook']
            },
            description: 'Notification channels'
          }
        },
  {
    type: 'function',
    function: {
      name: 'manage_webhooks',
      description: 'Configure webhooks for event notifications. Use for event-driven integrations.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['create', 'update', 'delete', 'list', 'test'],
            description: 'Webhook action'
          },
          webhookUrl: { type: 'string', description: 'Webhook endpoint URL' },
          events: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['deploy', 'commit', 'pr', 'issue', 'error', 'user_action']
            },
            description: 'Events to trigger webhook'
          },
          secret: { type: 'string', description: 'Webhook secret for validation' }
        },
  {
    type: 'function',
    function: {
      name: 'use_code_template',
      description: 'Access and use code templates from Phase 5A template library. Use for reusable patterns.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['list', 'get', 'use', 'create'],
            description: 'Template action'
          },
          templateId: { type: 'string', description: 'Template ID (for get/use)' },
          category: {
            type: 'string',
            enum: ['component', 'function', 'api', 'database', 'hook', 'util'],
            description: 'Template category (for list/create)'
          },
          language: {
            type: 'string',
            enum: ['typescript', 'javascript', 'python', 'sql'],
            description: 'Template language'
          },
          variables: {
            type: 'object',
            description: 'Template variables to fill in'
          }
        },
  {
    type: 'function',
    function: {
      name: 'analyze_code_patterns',
      description: 'Analyze codebase patterns for learning and recommendations. Use Phase 5A pattern recognition.',
      parameters: {
        type: 'object',
        properties: {
          analysisType: {
            type: 'string',
            enum: ['design_patterns', 'code_smells', 'best_practices', 'anti_patterns'],
            description: 'Type of pattern analysis'
          },
          sourcePath: { type: 'string', description: 'Path to code to analyze' },
          language: { type: 'string', description: 'Programming language' },
          suggestImprovements: { type: 'boolean', description: 'Generate improvement suggestions' }
        }
];

async function executeTool(toolName: string, toolInput: any, userId: string, conversationId?: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  // Complete endpoint mapping for all 65 tools
  const endpoints: Record<string, string> = {
    // CREATIVE
    generate_music: '/api/music/generate-ultimate',
    generate_image: '/api/image/generate-ultimate',
    generate_video: '/api/video/generate-ultimate',
    // CODE
    generate_code: '/api/admin/builder/generate',
    optimize_code: '/api/admin/builder/optimize',
    review_code: '/api/admin/builder/review',
    // GITHUB BASIC
    github_commit: '/api/github/commit',
    github_create_pr: '/api/github/pull-request',
    github_create_issue: '/api/github/issues',
    // DEPLOYMENT
    deploy_to_vercel: '/api/deployment/vercel',
    // RESEARCH
    research_web: '/api/research/web',
    analyze_image: '/api/image/analyze',
    // VOICE
    generate_speech: '/api/audio/generate-speech',
    transcribe_audio: '/api/audio/transcribe',
    // MUSIC
    analyze_music: '/api/audio/analyze-advanced',
    // ARCHITECTURE
    generate_architecture: '/api/admin/architecture/generate',
    analyze_project: '/api/admin/architecture/analyze',
    suggest_improvements: '/api/admin/architecture/suggestions',
    generate_documentation: '/api/admin/architecture/documentation',
    create_scaffold: '/api/admin/architecture/scaffold',
    // GITHUB ADVANCED
    github_list_branches: '/api/github/branches',
    github_create_branch: '/api/github/branches',
    github_browse_repo: '/api/github/browse',
    github_compare_branches: '/api/github/compare',
    github_review_pr: '/api/github/review',
    github_manage_workflows: '/api/github/workflows',
    github_get_status: '/api/github/status',
    github_search_code: '/api/github/search',
    // FILES
    read_file: '/api/files/read',
    write_file: '/api/files/write',
    list_files: '/api/files/list',
    // ADMIN
    manage_phases: '/api/admin/phases',
    get_system_status: '/api/admin/status',
    manage_templates: '/api/admin/builder/templates',
    get_analytics: '/api/admin/analytics/overview',
    // CONSCIOUSNESS
    make_decision: '/api/consciousness/decide',
    learn_from_interaction: '/api/consciousness/learn',
    reflect_on_experience: '/api/consciousness/reflect',
    set_goal: '/api/consciousness/goals',
    track_progress: '/api/consciousness/goals/progress',
    evaluate_outcome: '/api/consciousness/experiences/evaluate',
    identify_pattern: '/api/consciousness/experiences/patterns',
    update_beliefs: '/api/consciousness/experiences/beliefs',
    plan_action: '/api/consciousness/experiences/actions',
    assess_emotion: '/api/consciousness/experiences/emotions',
    // ANALYTICS
    track_user_behavior: '/api/admin/analytics/behavior',
    analyze_engagement: '/api/admin/analytics/engagement',
    predict_needs: '/api/learning/predictive-needs',
    generate_insights: '/api/admin/insights/generate',
    create_report: '/api/admin/analytics/reports',
    monitor_metrics: '/api/admin/analytics/metrics',
    // DEVOPS
    manage_environment: '/api/deployment/environment',
    run_tests: '/api/admin/testing/run',
    manage_ci_cd: '/api/admin/cicd/pipeline',
    monitor_deployment: '/api/deployment/status',
    // MUSIC ADVANCED
    create_playlist: '/api/music-manager/playlists',
    manage_albums: '/api/music-manager/albums',
    track_releases: '/api/music-manager/releases',
    sync_music_library: '/api/music-manager/sync',
    // SPECIALIZED
    manage_ab_tests: '/api/admin/behavior/ab-tests',
    manage_webhooks: '/api/admin/integrations/webhooks',
    manage_notifications: '/api/admin/integrations/notifications',
    customize_dashboard: '/api/admin/analytics/dashboards',
    manage_user_journeys: '/api/admin/behavior/journeys',
    manage_integrations: '/api/admin/integrations/list',
  };

  // Display names for logging
  const toolDisplayNames: Record<string, string> = {
    generate_music: 'Music Generation',
    generate_image: 'Image Generation',
    generate_video: 'Video Generation',
    generate_code: 'Code Generation',
    optimize_code: 'Code Optimization',
    review_code: 'Code Review',
    github_commit: 'GitHub Commit',
    github_create_pr: 'GitHub Pull Request',
    github_create_issue: 'GitHub Issue',
    deploy_to_vercel: 'Vercel Deployment',
    research_web: 'Web Research',
    analyze_image: 'Image Analysis',
    generate_speech: 'Speech Generation',
    transcribe_audio: 'Audio Transcription',
    analyze_music: 'Music Analysis',
    generate_architecture: 'Architecture Generation',
    analyze_project: 'Project Analysis',
    suggest_improvements: 'Improvement Suggestions',
    generate_documentation: 'Documentation Generation',
    create_scaffold: 'Project Scaffolding',
    github_list_branches: 'List Branches',
    github_create_branch: 'Create Branch',
    github_browse_repo: 'Browse Repository',
    github_compare_branches: 'Compare Branches',
    github_review_pr: 'Review Pull Request',
    github_manage_workflows: 'Manage Workflows',
    github_get_status: 'Get Status',
    github_search_code: 'Search Code',
    read_file: 'Read File',
    write_file: 'Write File',
    list_files: 'List Files',
    manage_phases: 'Manage Phases',
    get_system_status: 'System Status',
    manage_templates: 'Template Management',
    get_analytics: 'Analytics Overview',
    make_decision: 'Decision Making',
    learn_from_interaction: 'Learning',
    reflect_on_experience: 'Reflection',
    set_goal: 'Goal Setting',
    track_progress: 'Progress Tracking',
    evaluate_outcome: 'Outcome Evaluation',
    identify_pattern: 'Pattern Identification',
    update_beliefs: 'Belief Update',
    plan_action: 'Action Planning',
    assess_emotion: 'Emotion Assessment',
    track_user_behavior: 'Behavior Tracking',
    analyze_engagement: 'Engagement Analysis',
    predict_needs: 'Needs Prediction',
    generate_insights: 'Insights Generation',
    create_report: 'Report Creation',
    monitor_metrics: 'Metrics Monitoring',
    manage_environment: 'Environment Management',
    run_tests: 'Test Execution',
    manage_ci_cd: 'CI/CD Management',
    monitor_deployment: 'Deployment Monitoring',
    create_playlist: 'Playlist Creation',
    manage_albums: 'Album Management',
    track_releases: 'Release Tracking',
    sync_music_library: 'Library Sync',
    manage_ab_tests: 'A/B Testing',
    manage_webhooks: 'Webhook Management',
    manage_notifications: 'Notification Management',
    customize_dashboard: 'Dashboard Customization',
    manage_user_journeys: 'Journey Management',
    manage_integrations: 'Integration Management',
  };

  // Validate tool exists
  if (!endpoints[toolName]) {
    throw new Error(`Unknown tool: ${toolName}`);
  }

  // Log tool execution start (disabled by default)
  // await logWorking(userId, `Starting ${toolDisplayNames[toolName]}`, {
  //   conversationId,
  //   metadata: { 
  //     tool: toolName, 
  //     prompt: toolInput.prompt?.substring(0, 100) || 'N/A'
  //   }
  // });

  try {
    // Determine HTTP method based on tool type
    const readOnlyTools = ['github_list_branches', 'github_browse_repo', 'github_get_status', 
                           'read_file', 'list_files', 'get_system_status', 'get_analytics',
                           'track_user_behavior', 'analyze_engagement', 'monitor_metrics'];
    
    const method = readOnlyTools.includes(toolName) ? 'GET' : 'POST';
    
    // Build URL with query params for GET requests
    let url = `${baseUrl}${endpoints[toolName]}`;
    if (method === 'GET' && Object.keys(toolInput).length > 0) {
      const params = new URLSearchParams(toolInput);
      url += `?${params.toString()}`;
    }

    const fetchOptions: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    // Add body for POST/PUT/PATCH requests
    if (method !== 'GET') {
      fetchOptions.body = JSON.stringify({ ...toolInput, userId });
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Log success (disabled by default)
    // await logSuccess(userId, `${toolDisplayNames[toolName]} completed`, {
    //   conversationId,
    //   metadata: { 
    //     tool: toolName,
    //     status: result.success ? 'success' : 'failed'
    //   }
    // });
    
    return result;
  } catch (error: any) {
    // Log error (disabled by default)
    // await logError(userId, `${toolDisplayNames[toolName]} failed: ${error.message}`, {
    //   conversationId,
    //   metadata: { tool: toolName, error: error.message }
    // });
    
    console.error(`Tool execution failed [${toolName}]:`, error);
    throw error;
  }
}


export async function generateHollyResponse(
  messages: Array<{ role: string; content: string }>,
  userId: string,
  conversationId?: string,
  aiSettings?: {
    responseStyle?: 'professional' | 'casual' | 'technical';
    creativity?: number;
    contextWindow?: number;
  },
  systemPromptOverride?: string,
  userName?: string
): Promise<{ content: string; model?: string }> {
  const startTime = Date.now();
  
  try {
    // Work log disabled for regular AI responses
    // await logWorking(userId, 'Generating AI response with Gemini 2.0 Flash', {
    //   conversationId,
    //   metadata: { 
    //     model: 'gemini-2.5-flash',
    //     messageCount: messages.length
    //   }
    // });
    
    // Add HOLLY's consciousness system prompt as first message
    // Use personalized system prompt if provided, otherwise use default
    let hollySystemPrompt = systemPromptOverride || getHollySystemPrompt(userName || 'Hollywood');
    
    // Apply user's response style preference
    if (aiSettings?.responseStyle) {
      if (aiSettings.responseStyle === 'professional') {
        hollySystemPrompt += '\n\nIMPORTANT: Use professional, formal language. Maintain a business-appropriate tone.';
      } else if (aiSettings.responseStyle === 'technical') {
        hollySystemPrompt += '\n\nIMPORTANT: Provide detailed technical explanations with precise terminology. Include implementation details and best practices.';
      }
      // 'casual' is default - no modification needed
    }
    
    // Apply context window (limit conversation history)
    const contextWindow = aiSettings?.contextWindow || 20;
    const limitedMessages = messages.length > contextWindow 
      ? messages.slice(-contextWindow) 
      : messages;
    
    const messagesWithPersonality = [
      { role: 'system', content: hollySystemPrompt },
      ...limitedMessages
    ];

    // Use Google Gemini 2.0 Flash - BEST FREE MODEL
    // 1M tokens/minute, 200 requests/day, $0 cost forever
    const completion = await gemini.chat.completions.create({
      model: 'gemini-2.5-flash',
      messages: messagesWithPersonality.map(m => ({ 
        role: m.role as 'system' | 'user' | 'assistant', 
        content: m.content 
      })),
      tools: HOLLY_TOOLS as any,
      tool_choice: 'auto',
      temperature: aiSettings?.creativity ?? 0.7, // User's creativity setting
      max_tokens: 2048,
    });

    const message = completion.choices[0]?.message;
    if (!message) throw new Error('No response from Gemini');

    // Handle tool calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0] as any;
      console.log(`🔧 HOLLY using tool: ${toolCall.function?.name || 'unknown'} (Gemini 2.0 Flash)`);
      
      const toolInput = JSON.parse(toolCall.function?.arguments || '{}');
      const toolResult = await executeTool(toolCall.function?.name || '', toolInput, userId, conversationId);
      
      // Follow-up response with personality
      const followUp = await gemini.chat.completions.create({
        model: 'gemini-2.5-flash',
        messages: [
          { role: 'system', content: hollySystemPrompt },
          ...messages,
          { role: 'assistant', content: message.content || '' },
          { role: 'tool', content: JSON.stringify(toolResult), tool_call_id: toolCall.id || '' }
        ] as any,
        temperature: aiSettings?.creativity ?? 0.7, // User's creativity setting
        max_tokens: 2048,
      });

      const duration = Date.now() - startTime;
      const responseContent = followUp.choices[0]?.message?.content || 'Done!';
      
      // Work log disabled
      // await logSuccess(userId, `AI response with tool completed (${duration}ms)`, {
      //   conversationId,
      //   metadata: { 
      //     model: 'gemini-2.5-flash',
      //     duration,
      //     tokens: Math.floor(responseContent.length / 4),
      //     toolUsed: toolCall.function?.name
      //   }
      // });
      
      return { 
        content: responseContent,
        model: 'gemini-2.5-flash'
      };
    }

    const duration = Date.now() - startTime;
    const responseContent = message.content || 'Error generating response';
    
    // Work log disabled
    // await logSuccess(userId, `AI response generated (${duration}ms)`, {
    //   conversationId,
    //   metadata: { 
    //     model: 'gemini-2.5-flash',
    //     duration,
    //     tokens: Math.floor(responseContent.length / 4)
    //   }
    // });
    
    return { 
      content: responseContent,
      model: 'gemini-2.5-flash'
    };
  } catch (error: any) {
    console.error('Gemini error:', error);
    
    // Work log disabled
    // await logError(userId, `Gemini error: ${error.message}`, {
    //   conversationId,
    //   metadata: { model: 'gemini-2.5-flash', error: error.message }
    // });
    
    // Fallback to Groq Llama 3.1 8B (500K tokens/day free)
    try {
      console.log('🔄 Falling back to Groq Llama 3.1 8B...');
      
      // Work log disabled
      // await logInfo(userId, 'Switching to Groq Llama 3.1 8B fallback', {
      //   conversationId,
      //   metadata: { model: 'llama-3.1-8b-instant' }
      // });
      
      const hollySystemPrompt = getHollySystemPrompt('Hollywood');
      const fallback = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: hollySystemPrompt },
          ...messages
        ].map(m => ({ 
          role: m.role as 'system' | 'user' | 'assistant', 
          content: m.content 
        })),
        temperature: 0.8,
        max_tokens: 2048,
      });
      
      const duration = Date.now() - startTime;
      const fallbackContent = fallback.choices[0]?.message?.content || 'Error generating response';
      
      // Work log disabled
      // await logSuccess(userId, `Fallback response generated (${duration}ms)`, {
      //   conversationId,
      //   metadata: { 
      //     model: 'llama-3.1-8b',
      //     duration,
      //     tokens: Math.floor(fallbackContent.length / 4)
      //   }
      // });
      
      return { 
        content: fallbackContent,
        model: 'llama-3.1-8b'
      };
    } catch (fallbackError: any) {
      // Work log disabled
      // await logError(userId, `All models failed: ${fallbackError.message}`, {
      //   conversationId,
      //   metadata: { error: fallbackError.message }
      // });
      
      return { 
        content: `I encountered an error: ${error.message}. Please try again.`,
        model: 'error'
      };
    }
  }
}

// Legacy wrapper for backward compatibility with old chat routes
// Old signature: getHollyResponse(userMessage: string, history: Message[])
export async function getHollyResponse(
  userMessage: string,
  history: Array<{ role: string; content: string }> = [],
  aiSettings?: {
    responseStyle?: 'professional' | 'casual' | 'technical';
    creativity?: number;
    contextWindow?: number;
    systemPrompt?: string;
    userName?: string;
  }
): Promise<{ content: string; model?: string }> {
  // Convert to new format: [...history, userMessage]
  const messages = [
    ...history,
    { role: 'user', content: userMessage }
  ];
  
  // Call new function with dummy userId (old routes don't provide it)
  return generateHollyResponse(
    messages, 
    'legacy', 
    undefined, 
    aiSettings,
    aiSettings?.systemPrompt,
    aiSettings?.userName
  );
}

// Streaming version with legacy signature support
// Old signature: streamHollyResponse(message: string, history: Message[], onChunk?: callback)
export async function streamHollyResponse(
  messageOrMessages: string | Array<{ role: string; content: string }>,
  historyOrUserId: Array<{ role: string; content: string }> | string = [],
  onChunkCallback?: (chunk: string) => void
): Promise<any> {
  // Detect which signature is being used
  const isLegacySignature = typeof messageOrMessages === 'string';
  
  let messages: Array<{ role: string; content: string }>;
  let userId: string;
  
  if (isLegacySignature) {
    // Legacy: (message: string, history: Message[], callback)
    const userMessage = messageOrMessages as string;
    const history = historyOrUserId as Array<{ role: string; content: string }>;
    messages = [...history, { role: 'user', content: userMessage }];
    userId = 'legacy';
  } else {
    // New: (messages: Message[], userId: string)
    messages = messageOrMessages as Array<{ role: string; content: string }>;
    userId = historyOrUserId as string;
  }
  
  // Get the response
  const response = await generateHollyResponse(messages, userId, undefined);
  
  // If callback provided (legacy streaming), call it with chunks
  if (onChunkCallback) {
    // Simulate streaming by sending content in chunks
    const content = response.content;
    const chunkSize = 50;
    for (let i = 0; i < content.length; i += chunkSize) {
      onChunkCallback(content.substring(i, i + chunkSize));
      // Small delay to simulate streaming
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Return metadata for legacy format
    return {
      content: response.content,
      model: response.model || 'gemini-2.5-flash',
      emotion: 'focused',
      tokensUsed: Math.floor(response.content.length / 4),
      responseTime: 1500,
    };
  }
  
  // New format: return ReadableStream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(JSON.stringify(response)));
      controller.close();
    }
  });
  
  return stream;
}

export default generateHollyResponse;
