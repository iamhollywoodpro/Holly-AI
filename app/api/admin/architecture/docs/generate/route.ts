import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { type = 'readme', projectName = 'Project', userId } = await req.json();
    
    const readme = `# ${projectName}

## Description
${projectName} - A modern web application

## Installation
\`\`\`bash
npm install
\`\`\`

## Usage
\`\`\`bash
npm run dev
\`\`\`

## Features
- Feature 1
- Feature 2
- Feature 3

## Contributing
Pull requests are welcome.

## License
MIT
`;

    const result = {
      success: true,
      type,
      projectName,
      documentation: {
        title: `${projectName} Documentation`,
        sections: ['Installation', 'Usage', 'API', 'Examples', 'Contributing'],
        content: readme,
        wordCount: readme.split(' ').length
      },
      files: {
        readme: 'README.md',
        contributing: 'CONTRIBUTING.md',
        changelog: 'CHANGELOG.md'
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
