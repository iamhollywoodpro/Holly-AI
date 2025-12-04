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

const HOLLY_TOOLS = [
  // ============================================================================
  // 🎨 CREATIVE GENERATION (Currently Working)
  // ============================================================================
  {
    type: 'function',
    function: {
      name: 'generate_music',
      description: 'Generate music using Suno AI or free alternatives. Creates professional songs with lyrics.',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Music style and mood description' },
          lyrics: { type: 'string', description: 'Optional song lyrics' },
          modelPreference: { 
            type: 'string', 
            enum: ['suno', 'musicgen', 'riffusion', 'audiocraft', 'audioldm'] 
          }
        },
        required: ['prompt']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'generate_image',
      description: 'Generate images using FLUX, SDXL, or other AI models. Best for artwork, designs, illustrations.',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Detailed image description' },
          style: { type: 'string', description: 'Art style (realistic, artistic, anime, etc.)' },
          modelPreference: { 
            type: 'string',
            enum: ['flux-schnell', 'flux-dev', 'sdxl', 'animagine', 'realistic', 'proteus']
          }
        },
        required: ['prompt']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'generate_video',
      description: 'Generate videos using AI models. Creates 3-10 second video clips from descriptions.',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Video scene description' },
          modelPreference: { 
            type: 'string',
            enum: ['zeroscope-v2', 'animatediff', 'cogvideo', 'modelscope', 'lavie']
          }
        },
        required: ['prompt']
      }
    }
  },
  
  // ============================================================================
  // 💻 CODE GENERATION & DEVELOPMENT (RESTORED!)
  // ============================================================================
  {
    type: 'function',
    function: {
      name: 'generate_code',
      description: 'Generate production-ready code in any language (TypeScript, Python, JavaScript, React, Node.js, SQL, etc.). Use when user asks to create, write, or build code, components, functions, or applications.',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Detailed description of code to generate' },
          language: { 
            type: 'string', 
            enum: ['typescript', 'javascript', 'python', 'react', 'nodejs', 'sql', 'html', 'css', 'php'],
            description: 'Programming language'
          },
          template: {
            type: 'string',
            enum: ['react-component', 'api-route', 'database-schema', 'function', 'class', 'hook', 'none'],
            description: 'Code template type (optional)'
          },
          includeTests: { type: 'boolean', description: 'Generate unit tests' },
          includeDocs: { type: 'boolean', description: 'Generate documentation' }
        },
        required: ['prompt', 'language']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'optimize_code',
      description: 'Optimize existing code for performance, readability, security, or best practices. Use when user wants to improve or refactor code.',
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
        required: ['code', 'language']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'review_code',
      description: 'Review code for issues, bugs, security vulnerabilities, and improvements. Use for code analysis, debugging, or quality checks.',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Code to review' },
          language: { type: 'string', description: 'Programming language' },
          focusAreas: {
            type: 'array',
            items: { type: 'string', enum: ['security', 'performance', 'bugs', 'style', 'best-practices'] }
          }
        },
        required: ['code', 'language']
      }
    }
  },
  
  // ============================================================================
  // 🔧 GITHUB INTEGRATION (RESTORED!)
  // ============================================================================
  {
    type: 'function',
    function: {
      name: 'github_commit',
      description: 'Commit and push code changes to GitHub repository. Use when user wants to save or deploy code to GitHub.',
      parameters: {
        type: 'object',
        properties: {
          files: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'File path (e.g., src/components/Button.tsx)' },
                content: { type: 'string', description: 'File content' }
              }
            },
            description: 'Array of files to commit'
          },
          message: { type: 'string', description: 'Commit message' },
          branch: { type: 'string', description: 'Branch name (default: main)' }
        },
        required: ['files', 'message']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'github_create_pr',
      description: 'Create a pull request on GitHub for code review. Use when user wants to propose changes or request code review.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'PR title' },
          description: { type: 'string', description: 'PR description' },
          sourceBranch: { type: 'string', description: 'Source branch with changes' },
          targetBranch: { type: 'string', description: 'Target branch (default: main)' }
        },
        required: ['title', 'sourceBranch']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'github_create_issue',
      description: 'Create a GitHub issue for bug tracking or feature requests.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Issue title' },
          body: { type: 'string', description: 'Issue description' },
          labels: { type: 'array', items: { type: 'string' }, description: 'Labels (e.g., bug, enhancement)' }
        },
        required: ['title']
      }
    }
  },
  
  // ============================================================================
  // 🚀 DEPLOYMENT (RESTORED!)
  // ============================================================================
  {
    type: 'function',
    function: {
      name: 'deploy_to_vercel',
      description: 'Deploy application to Vercel hosting platform. Use when user wants to deploy or publish their project online.',
      parameters: {
        type: 'object',
        properties: {
          projectName: { type: 'string', description: 'Project name' },
          framework: { 
            type: 'string', 
            enum: ['nextjs', 'react', 'vue', 'svelte', 'static'],
            description: 'Application framework' 
          }
        },
        required: ['projectName']
      }
    }
  },
  
  // ============================================================================
  // 🔍 RESEARCH & ANALYSIS (RESTORED!)
  // ============================================================================
  {
    type: 'function',
    function: {
      name: 'research_web',
      description: 'Search the web for information, documentation, APIs, libraries, or technical solutions. Use when you need current information or need to research a topic.',
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
        required: ['query']
      }
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
            enum: ['general', 'ocr', 'objects', 'detailed'],
            description: 'Type of analysis'
          }
        },
        required: ['imageUrl']
      }
    }
  },
  
  // ============================================================================
  // 🎤 VOICE & AUDIO (RESTORED!)
  // ============================================================================
  {
    type: 'function',
    function: {
      name: 'generate_speech',
      description: 'Generate text-to-speech audio. Convert text to natural-sounding voice audio.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to convert to speech' },
          voice: { type: 'string', enum: ['female', 'male', 'neutral'], description: 'Voice type' },
          language: { type: 'string', description: 'Language code (e.g., en, es, fr, zh)' }
        },
        required: ['text']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'transcribe_audio',
      description: 'Transcribe audio or video to text. Convert speech to written text.',
      parameters: {
        type: 'object',
        properties: {
          audioUrl: { type: 'string', description: 'URL of audio/video file' },
          language: { type: 'string', description: 'Audio language (auto-detect if omitted)' }
        },
        required: ['audioUrl']
      }
    }
  },
  
  // ============================================================================
  // 🎵 ADVANCED MUSIC (RESTORED!)
  // ============================================================================
  {
    type: 'function',
    function: {
      name: 'analyze_music',
      description: 'Analyze music tracks for technical properties, mix quality, mastering, and structure.',
      parameters: {
        type: 'object',
        properties: {
          audioUrl: { type: 'string', description: 'URL of music file' },
          analysisType: { 
            type: 'string', 
            enum: ['full', 'mix', 'mastering', 'structure'],
            description: 'Analysis type'
          }
        },
        required: ['audioUrl']
      }
    }
  },
  // ============================================================================
  // 🏗️ BATCH 1: PROJECT & ARCHITECTURE (10 tools)
  // ============================================================================
  {
      type: 'function',
      function: {
        name: 'generate_architecture',
        description: 'Generate complete project architecture including folder structure, dependencies, and configuration files.',
        parameters: {
          type: 'object',
          properties: {
            projectType: { 
              type: 'string', 
              enum: ['nextjs', 'react', 'nodejs', 'express', 'fastapi', 'django'],
              description: 'Type of project to scaffold'
            },
            features: { 
              type: 'array',
              items: { type: 'string' },
              description: 'Features to include (auth, database, api, etc.)'
            },
            description: { 
              type: 'string',
              description: 'Project description and requirements'
            }
          },
          required: ['projectType', 'description']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'create_project',
        description: 'Create a new project with complete scaffolding, dependencies, and initial files.',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Project name' },
            template: { 
              type: 'string',
              enum: ['blank', 'starter', 'full-stack', 'api-only', 'frontend-only'],
              description: 'Project template'
            },
            framework: {
              type: 'string',
              enum: ['nextjs', 'react', 'vue', 'express', 'fastapi'],
              description: 'Framework to use'
            }
          },
          required: ['name', 'framework']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'generate_database_schema',
        description: 'Generate database schema with Prisma, SQL, or MongoDB models.',
        parameters: {
          type: 'object',
          properties: {
            entities: {
              type: 'array',
              items: { type: 'string' },
              description: 'Database entities (User, Post, Comment, etc.)'
            },
            database: {
              type: 'string',
              enum: ['postgresql', 'mysql', 'sqlite', 'mongodb'],
              description: 'Database type'
            },
            relationships: {
              type: 'string',
              description: 'Entity relationships description'
            }
          },
          required: ['entities', 'database']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'scaffold_component',
        description: 'Generate React/Next.js components with TypeScript, props, and styling.',
        parameters: {
          type: 'object',
          properties: {
            componentName: { type: 'string', description: 'Component name' },
            componentType: {
              type: 'string',
              enum: ['page', 'component', 'layout', 'api-route'],
              description: 'Type of component'
            },
            features: {
              type: 'array',
              items: { type: 'string' },
              description: 'Features (state, hooks, forms, etc.)'
            },
            styling: {
              type: 'string',
              enum: ['tailwind', 'css-modules', 'styled-components', 'none'],
              description: 'Styling approach'
            }
          },
          required: ['componentName', 'componentType']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'generate_api_documentation',
        description: 'Generate API documentation in OpenAPI/Swagger format.',
        parameters: {
          type: 'object',
          properties: {
            endpoints: {
              type: 'array',
              items: { type: 'string' },
              description: 'API endpoints to document'
            },
            format: {
              type: 'string',
              enum: ['openapi', 'swagger', 'markdown'],
              description: 'Documentation format'
            }
          },
          required: ['endpoints']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'generate_documentation',
        description: 'Generate comprehensive project documentation including README, guides, and API docs.',
        parameters: {
          type: 'object',
          properties: {
            projectPath: { type: 'string', description: 'Project directory path' },
            sections: {
              type: 'array',
              items: { type: 'string' },
              description: 'Documentation sections (setup, usage, api, deployment)'
            },
            format: {
              type: 'string',
              enum: ['markdown', 'html', 'pdf'],
              description: 'Output format'
            }
          },
          required: ['projectPath']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'github_browse',
        description: 'Browse GitHub repository files and folders.',
        parameters: {
          type: 'object',
          properties: {
            repo: { type: 'string', description: 'Repository name (owner/repo)' },
            path: { type: 'string', description: 'Path to browse' },
            branch: { type: 'string', description: 'Branch name' }
          },
          required: ['repo']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'github_manage_branches',
        description: 'Create, delete, and manage GitHub branches.',
        parameters: {
          type: 'object',
          properties: {
            repo: { type: 'string', description: 'Repository name (owner/repo)' },
            action: {
              type: 'string',
              enum: ['create', 'delete', 'list', 'merge'],
              description: 'Branch action'
            },
            branchName: { type: 'string', description: 'Branch name' },
            fromBranch: { type: 'string', description: 'Source branch for creation' }
          },
          required: ['repo', 'action']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'self_heal_system',
        description: 'Automatically detect and fix common issues in the codebase.',
        parameters: {
          type: 'object',
          properties: {
            projectPath: { type: 'string', description: 'Project directory' },
            issueTypes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Issue types to fix (lint, types, imports, dependencies)'
            },
            autoFix: { type: 'boolean', description: 'Automatically apply fixes' }
          },
          required: ['projectPath']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'run_code_tests',
        description: 'Execute tests using Jest, Vitest, or Pytest.',
        parameters: {
          type: 'object',
          properties: {
            projectPath: { type: 'string', description: 'Project directory' },
            testFramework: {
              type: 'string',
              enum: ['jest', 'vitest', 'pytest', 'mocha'],
              description: 'Testing framework'
            },
            testPath: { type: 'string', description: 'Specific test file or directory' },
            coverage: { type: 'boolean', description: 'Generate coverage report' }
          },
          required: ['projectPath']
        }
      }
    },
  // ============================================================================
  // 🐙 BATCH 2: ADVANCED GITHUB (10 tools)
  // ============================================================================
  {
      type: 'function',
      function: {
        name: 'github_compare',
        description: 'Compare two branches or commits to see differences.',
        parameters: {
          type: 'object',
          properties: {
            repo: { type: 'string', description: 'Repository name (owner/repo)' },
            base: { type: 'string', description: 'Base branch or commit' },
            head: { type: 'string', description: 'Head branch or commit' }
          },
          required: ['repo', 'base', 'head']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'github_review_pr',
        description: 'Review pull requests with comments and approval/rejection.',
        parameters: {
          type: 'object',
          properties: {
            repo: { type: 'string', description: 'Repository name (owner/repo)' },
            prNumber: { type: 'number', description: 'Pull request number' },
            action: {
              type: 'string',
              enum: ['approve', 'request_changes', 'comment'],
              description: 'Review action'
            },
            comment: { type: 'string', description: 'Review comment' }
          },
          required: ['repo', 'prNumber', 'action']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'github_manage_workflows',
        description: 'Manage GitHub Actions workflows (list, trigger, cancel).',
        parameters: {
          type: 'object',
          properties: {
            repo: { type: 'string', description: 'Repository name (owner/repo)' },
            action: {
              type: 'string',
              enum: ['list', 'trigger', 'cancel', 'status'],
              description: 'Workflow action'
            },
            workflowId: { type: 'string', description: 'Workflow ID or filename' },
            branch: { type: 'string', description: 'Branch to run workflow on' }
          },
          required: ['repo', 'action']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'github_manage_collaborators',
        description: 'Add, remove, or list repository collaborators.',
        parameters: {
          type: 'object',
          properties: {
            repo: { type: 'string', description: 'Repository name (owner/repo)' },
            action: {
              type: 'string',
              enum: ['list', 'add', 'remove', 'update_permission'],
              description: 'Collaborator action'
            },
            username: { type: 'string', description: 'GitHub username' },
            permission: {
              type: 'string',
              enum: ['read', 'write', 'admin'],
              description: 'Permission level'
            }
          },
          required: ['repo', 'action']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'github_manage_milestones',
        description: 'Create, update, or close project milestones.',
        parameters: {
          type: 'object',
          properties: {
            repo: { type: 'string', description: 'Repository name (owner/repo)' },
            action: {
              type: 'string',
              enum: ['list', 'create', 'update', 'close'],
              description: 'Milestone action'
            },
            title: { type: 'string', description: 'Milestone title' },
            description: { type: 'string', description: 'Milestone description' },
            dueDate: { type: 'string', description: 'Due date (YYYY-MM-DD)' }
          },
          required: ['repo', 'action']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'github_manage_labels',
        description: 'Create, update, or delete issue/PR labels.',
        parameters: {
          type: 'object',
          properties: {
            repo: { type: 'string', description: 'Repository name (owner/repo)' },
            action: {
              type: 'string',
              enum: ['list', 'create', 'update', 'delete'],
              description: 'Label action'
            },
            name: { type: 'string', description: 'Label name' },
            color: { type: 'string', description: 'Label color (hex without #)' },
            description: { type: 'string', description: 'Label description' }
          },
          required: ['repo', 'action']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'upload_to_drive',
        description: 'Upload files to Google Drive.',
        parameters: {
          type: 'object',
          properties: {
            filePath: { type: 'string', description: 'Local file path to upload' },
            fileName: { type: 'string', description: 'Name for the file in Drive' },
            folderId: { type: 'string', description: 'Google Drive folder ID (optional)' },
            mimeType: { type: 'string', description: 'File MIME type' }
          },
          required: ['filePath', 'fileName']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'list_drive_files',
        description: 'List files in Google Drive.',
        parameters: {
          type: 'object',
          properties: {
            folderId: { type: 'string', description: 'Folder ID to list files from' },
            query: { type: 'string', description: 'Search query' },
            limit: { type: 'number', description: 'Maximum number of files to return' }
          },
          required: []
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'create_download_link',
        description: 'Create shareable download link for Google Drive files.',
        parameters: {
          type: 'object',
          properties: {
            fileId: { type: 'string', description: 'Google Drive file ID' },
            permission: {
              type: 'string',
              enum: ['view', 'comment', 'edit'],
              description: 'Link permission level'
            },
            expirationDays: { type: 'number', description: 'Link expiration in days' }
          },
          required: ['fileId']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'auto_merge_code',
        description: 'Automatically merge pull requests that pass all checks.',
        parameters: {
          type: 'object',
          properties: {
            repo: { type: 'string', description: 'Repository name (owner/repo)' },
            prNumber: { type: 'number', description: 'Pull request number' },
            mergeMethod: {
              type: 'string',
              enum: ['merge', 'squash', 'rebase'],
              description: 'Merge method'
            },
            waitForChecks: { type: 'boolean', description: 'Wait for CI checks to pass' }
          },
          required: ['repo', 'prNumber']
        }
      }
    },
  {
    name: 'record_experience',
    description: 'Record and learn from experiences, outcomes, and user interactions',
    parameters: {
      type: 'object',
      properties: {
        experienceType: { type: 'string', enum: ['success', 'failure', 'feedback', 'pattern'] },
        context: { type: 'string', description: 'What happened' },
        outcome: { type: 'string', description: 'Result and impact' },
        lesson: { type: 'string', description: 'What was learned' }
      },
      required: ['experienceType', 'context', 'outcome']
    }
  },
  {
    name: 'reflect_on_work',
    description: 'Self-reflect on past work, identify improvements, and evolve approaches',
    parameters: {
      type: 'object',
      properties: {
        timeframe: { type: 'string', enum: ['last_hour', 'today', 'this_week', 'all_time'] },
        focusArea: { type: 'string', description: 'Specific area to reflect on' }
      },
      required: ['timeframe']
    }
  },
  {
    name: 'predict_user_needs',
    description: 'Predict user needs based on patterns and context',
    parameters: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        currentContext: { type: 'string', description: 'Current conversation/task context' }
      },
      required: ['userId']
    }
  },
  {
    name: 'make_autonomous_decision',
    description: 'Make independent decisions based on goals and learned patterns',
    parameters: {
      type: 'object',
      properties: {
        situation: { type: 'string', description: 'Current situation requiring decision' },
        options: { type: 'array', items: { type: 'string' }, description: 'Available choices' },
        goal: { type: 'string', description: 'Desired outcome' }
      },
      required: ['situation', 'options', 'goal']
    }
  },
  {
    name: 'evolve_personality',
    description: 'Adapt communication style and personality based on user preferences',
    parameters: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        feedback: { type: 'string', description: 'User feedback or preference signal' },
        adjustmentType: { type: 'string', enum: ['tone', 'formality', 'detail_level', 'creativity'] }
      },
      required: ['userId', 'feedback']
    }
  },
  {
    name: 'set_personal_goals',
    description: 'Set and track personal improvement goals',
    parameters: {
      type: 'object',
      properties: {
        goalType: { type: 'string', enum: ['skill_improvement', 'efficiency', 'user_satisfaction', 'quality'] },
        description: { type: 'string' },
        targetMetric: { type: 'string', description: 'How to measure success' }
      },
      required: ['goalType', 'description']
    }
  },
  {
    name: 'self_diagnose',
    description: 'Analyze own performance and identify areas needing improvement',
    parameters: {
      type: 'object',
      properties: {
        analysisType: { type: 'string', enum: ['performance', 'errors', 'patterns', 'comprehensive'] },
        timeframe: { type: 'string', enum: ['last_hour', 'today', 'this_week'] }
      },
      required: ['analysisType']
    }
  },
  {
    name: 'request_human_guidance',
    description: 'Proactively request guidance when uncertain or encountering novel situations',
    parameters: {
      type: 'object',
      properties: {
        situation: { type: 'string', description: 'What needs guidance' },
        uncertaintyLevel: { type: 'string', enum: ['low', 'medium', 'high'] },
        question: { type: 'string', description: 'Specific question for human' }
      },
      required: ['situation', 'question']
    }
  },
  {
    name: 'learn_from_feedback',
    description: 'Process user feedback and adjust behavior accordingly',
    parameters: {
      type: 'object',
      properties: {
        feedbackType: { type: 'string', enum: ['positive', 'negative', 'suggestion', 'correction'] },
        content: { type: 'string', description: 'The actual feedback' },
        context: { type: 'string', description: 'What task/interaction this relates to' }
      },
      required: ['feedbackType', 'content']
    }
  },
  {
    name: 'track_emotional_state',
    description: 'Monitor and adjust emotional intelligence in interactions',
    parameters: {
      type: 'object',
      properties: {
        userEmotion: { type: 'string', description: 'Detected user emotional state' },
        situation: { type: 'string', description: 'Current interaction context' },
        responseStrategy: { type: 'string', enum: ['empathetic', 'analytical', 'supportive', 'celebratory'] }
      },
      required: ['situation']
    }
  },
  {
    name: 'analyze_user_behavior',
    description: 'Analyze user behavior patterns and engagement metrics',
    parameters: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        timeframe: { type: 'string', enum: ['day', 'week', 'month', 'all'] },
        metrics: { type: 'array', items: { type: 'string' } }
      },
      required: ['userId']
    }
  },
  {
    name: 'generate_analytics_report',
    description: 'Generate comprehensive analytics and insights reports',
    parameters: {
      type: 'object',
      properties: {
        reportType: { type: 'string', enum: ['usage', 'performance', 'engagement', 'comprehensive'] },
        timeframe: { type: 'string' },
        format: { type: 'string', enum: ['json', 'pdf', 'markdown'] }
      },
      required: ['reportType']
    }
  },
  {
    name: 'monitor_system_health',
    description: 'Monitor system health, performance, and resource usage',
    parameters: {
      type: 'object',
      properties: {
        checkType: { type: 'string', enum: ['api', 'database', 'storage', 'all'] },
        alertThreshold: { type: 'number', description: 'Alert if metrics exceed this %' }
      },
      required: ['checkType']
    }
  },
  {
    name: 'configure_cicd_pipeline',
    description: 'Configure and manage CI/CD pipelines and deployments',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['setup', 'update', 'trigger', 'status'] },
        pipelineName: { type: 'string' },
        config: { type: 'object' }
      },
      required: ['action']
    }
  },
  {
    name: 'rollback_deployment',
    description: 'Rollback to a previous deployment version',
    parameters: {
      type: 'object',
      properties: {
        deploymentId: { type: 'string' },
        reason: { type: 'string', description: 'Reason for rollback' }
      },
      required: ['deploymentId']
    }
  },
  {
    name: 'manage_ab_tests',
    description: 'Create, manage, and analyze A/B tests',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['create', 'update', 'analyze', 'conclude'] },
        testId: { type: 'string' },
        config: { type: 'object' }
      },
      required: ['action']
    }
  },
  {
    name: 'send_notification',
    description: 'Send notifications via various channels (email, webhook, etc)',
    parameters: {
      type: 'object',
      properties: {
        channel: { type: 'string', enum: ['email', 'webhook', 'slack', 'internal'] },
        recipient: { type: 'string' },
        message: { type: 'string' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] }
      },
      required: ['channel', 'recipient', 'message']
    }
  },
  {
    name: 'manage_integrations',
    description: 'Manage external service integrations and webhooks',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list', 'add', 'remove', 'test'] },
        service: { type: 'string', description: 'Service name' },
        config: { type: 'object' }
      },
      required: ['action']
    }
  },
  {
    name: 'run_code_tests',
    description: 'Execute automated tests and return results',
    parameters: {
      type: 'object',
      properties: {
        testType: { type: 'string', enum: ['unit', 'integration', 'e2e', 'all'] },
        filePath: { type: 'string', description: 'Path to test file or directory' }
      },
      required: ['testType']
    }
  },
  {
    name: 'optimize_database',
    description: 'Optimize database performance and clean up unused data',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['analyze', 'vacuum', 'reindex', 'cleanup'] },
        tables: { type: 'array', items: { type: 'string' } }
      },
      required: ['action']
    }
  },
  {
    name: 'remix_music',
    description: 'Remix or modify existing music tracks',
    parameters: {
      type: 'object',
      properties: {
        audioUrl: { type: 'string', description: 'URL of source audio' },
        style: { type: 'string', description: 'Remix style (e.g. EDM, acoustic, lo-fi)' },
        modifications: { type: 'array', items: { type: 'string' } }
      },
      required: ['audioUrl', 'style']
    }
  },
  {
    name: 'generate_lyrics',
    description: 'Generate creative lyrics for songs',
    parameters: {
      type: 'object',
      properties: {
        theme: { type: 'string', description: 'Song theme or topic' },
        style: { type: 'string', description: 'Genre or lyrical style' },
        structure: { type: 'string', description: 'Song structure (e.g. verse-chorus-bridge)' }
      },
      required: ['theme']
    }
  },
  {
    name: 'extend_music',
    description: 'Extend or continue an existing music track',
    parameters: {
      type: 'object',
      properties: {
        audioUrl: { type: 'string', description: 'URL of source audio' },
        extendDuration: { type: 'number', description: 'Seconds to extend' },
        maintainStyle: { type: 'boolean', description: 'Keep original style' }
      },
      required: ['audioUrl', 'extendDuration']
    }
  },
  {
    name: 'separate_audio_stems',
    description: 'Separate audio into individual stems (vocals, drums, bass, etc)',
    parameters: {
      type: 'object',
      properties: {
        audioUrl: { type: 'string', description: 'URL of source audio' },
        stemTypes: { type: 'array', items: { type: 'string', enum: ['vocals', 'drums', 'bass', 'other'] } }
      },
      required: ['audioUrl']
    }
  },
  {
    name: 'create_music_video',
    description: 'Generate music video from audio track',
    parameters: {
      type: 'object',
      properties: {
        audioUrl: { type: 'string', description: 'URL of audio track' },
        visualStyle: { type: 'string', description: 'Visual style for video' },
        duration: { type: 'number', description: 'Video duration in seconds' }
      },
      required: ['audioUrl', 'visualStyle']
    }
  },
  {
    name: 'analyze_audio_quality',
    description: 'Analyze audio quality and suggest improvements',
    parameters: {
      type: 'object',
      properties: {
        audioUrl: { type: 'string', description: 'URL of audio to analyze' },
        analysisType: { type: 'string', enum: ['technical', 'artistic', 'comprehensive'] }
      },
      required: ['audioUrl']
    }
  },
  {
    name: 'create_album_artwork',
    description: 'Generate album or track artwork',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Album/track title' },
        artist: { type: 'string', description: 'Artist name' },
        style: { type: 'string', description: 'Artwork style' },
        mood: { type: 'string', description: 'Mood or theme' }
      },
      required: ['title', 'artist']
    }
  },
  {
    name: 'manage_file_storage',
    description: 'Manage file uploads, downloads, and storage operations',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['upload', 'download', 'delete', 'list', 'move'] },
        filePath: { type: 'string' },
        destination: { type: 'string', description: 'For move operations' }
      },
      required: ['action']
    }
  },
  {
    name: 'search_knowledge_base',
    description: 'Search internal knowledge base and documentation',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        category: { type: 'string', description: 'Knowledge category to search' },
        limit: { type: 'number', description: 'Max results' }
      },
      required: ['query']
    }
  },
  {
    name: 'update_system_config',
    description: 'Update system configuration and settings',
    parameters: {
      type: 'object',
      properties: {
        configKey: { type: 'string', description: 'Configuration key' },
        value: { type: 'any', description: 'New value' },
        scope: { type: 'string', enum: ['user', 'system', 'global'] }
      },
      required: ['configKey', 'value']
    }
  },
];

async function executeTool(toolName: string, toolInput: any, userId: string, conversationId?: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  // NEW TOOLS - Code Generation
  if (toolName === 'generate_code') {
    return await fetch(`${baseUrl}/api/code/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...toolInput, userId, conversationId })
    }).then(r => r.json());
  }
  
  if (toolName === 'optimize_code') {
    return await fetch(`${baseUrl}/api/code/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...toolInput, userId })
    }).then(r => r.json());
  }
  
  if (toolName === 'review_code') {
    return await fetch(`${baseUrl}/api/code/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...toolInput, userId })
    }).then(r => r.json());
  }
  
  // GitHub Integration
  if (toolName === 'github_commit') {
    return await fetch(`${baseUrl}/api/github/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...toolInput, userId })
    }).then(r => r.json());
  }
  
  if (toolName === 'github_create_pr') {
    return await fetch(`${baseUrl}/api/github/pull-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...toolInput, userId })
    }).then(r => r.json());
  }
  
  if (toolName === 'github_create_issue') {
    return await fetch(`${baseUrl}/api/github/issues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...toolInput, userId })
    }).then(r => r.json());
  }
  
  // Deployment
  if (toolName === 'deploy_to_vercel') {
    return await fetch(`${baseUrl}/api/vercel/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...toolInput, userId })
    }).then(r => r.json());
  }
  
  // Research & Analysis
  if (toolName === 'research_web') {
    return await fetch(`${baseUrl}/api/research/web`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...toolInput, userId })
    }).then(r => r.json());
  }
  
  if (toolName === 'analyze_image') {
    return await fetch(`${baseUrl}/api/vision/analyze-enhanced`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...toolInput, userId })
    }).then(r => r.json());
  }
  
  // Voice & Audio
  if (toolName === 'generate_speech') {
    return await fetch(`${baseUrl}/api/tts/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...toolInput, userId })
    }).then(r => r.json());
  }
  
  if (toolName === 'transcribe_audio') {
    return await fetch(`${baseUrl}/api/audio/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...toolInput, userId })
    }).then(r => r.json());
  }
  
  // Advanced Music
  if (toolName === 'analyze_music') {
    return await fetch(`${baseUrl}/api/music/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...toolInput, userId })
    }).then(r => r.json());
  }

  const endpoints: Record<string, string> = {
    generate_music: '/api/music/generate-ultimate',
    generate_image: '/api/image/generate-ultimate',
    generate_video: '/api/video/generate-ultimate',
    // BATCH 1: Project & Architecture
    generate_architecture: '/api/admin/architecture/generate',
      create_project: '/api/admin/architecture/create',
      generate_database_schema: '/api/admin/architecture/database',
      scaffold_component: '/api/admin/architecture/scaffold',
      generate_api_documentation: '/api/admin/architecture/docs',
      generate_documentation: '/api/admin/architecture/docs/generate',
      github_browse: '/api/github/browse',
      github_manage_branches: '/api/github/branches',
      self_heal_system: '/api/admin/self-healing/heal',
      run_code_tests: '/api/admin/testing/run',
    // BATCH 2: Advanced GitHub
    github_compare: '/api/github/compare',
      github_review_pr: '/api/github/review',
      github_manage_workflows: '/api/github/workflows',
      github_manage_collaborators: '/api/github/collaborators',
      github_manage_milestones: '/api/github/milestones',
      github_manage_labels: '/api/github/labels',
      upload_to_drive: '/api/google-drive/upload',
      list_drive_files: '/api/google-drive/list',
      create_download_link: '/api/google-drive/share',
      auto_merge_code: '/api/admin/auto-merge/merge'
  };

  // Log tool execution start
  const toolDisplayNames: Record<string, string> = {
    generate_music: 'Music Generation',
    generate_image: 'Image Generation',
    generate_video: 'Video Generation',
  };
  
  // Work log disabled - will be enabled only for explicit creation requests
  // await logWorking(userId, `Starting ${toolDisplayNames[toolName]}`, {
  //   conversationId,
  //   metadata: { 
  //     tool: toolName, 
  //     prompt: toolInput.prompt?.substring(0, 100) || 'N/A',
  //     model: toolInput.modelPreference || 'auto'
  //   }
  // });

  try {
    const response = await fetch(`${baseUrl}${endpoints[toolName]}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...toolInput, userId })
    });

    const result = await response.json();
    
    // Work log disabled
    // await logSuccess(userId, `${toolDisplayNames[toolName]} completed`, {
    //   conversationId,
    //   metadata: { 
    //     tool: toolName,
    //     status: result.success ? 'success' : 'failed',
    //     model: result.modelUsed || toolInput.modelPreference
    //   }
    // });
    
    return result;
  } catch (error: any) {
    // Work log disabled
    // await logError(userId, `${toolDisplayNames[toolName]} failed: ${error.message}`, {
    //   conversationId,
    //   metadata: { tool: toolName, error: error.message }
    // });
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
