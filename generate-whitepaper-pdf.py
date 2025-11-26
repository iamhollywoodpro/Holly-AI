#!/usr/bin/env python3
"""
Generate HOLLY Complete Whitepaper PDF
Combines both markdown documents into a single professional PDF
"""

import markdown
from weasyprint import HTML, CSS
from datetime import datetime
import os

# Read the markdown files
with open('HOLLY-COMPLETE-CAPABILITIES.md', 'r') as f:
    capabilities_md = f.read()

with open('QUICK-ANSWER-TO-YOUR-CONFUSION.md', 'r') as f:
    confusion_md = f.read()

# Create combined markdown
combined_md = f"""# HOLLY AI - Complete Technical Whitepaper

**Hyper-Optimized Logic & Learning Yield**

**Version**: 1.0.0  
**Date**: {datetime.now().strftime('%B %d, %Y')}  
**Creator**: Steve "Hollywood" Dorego  
**Status**: Production Ready

---

## TABLE OF CONTENTS

1. [Quick Overview: Understanding HOLLY's Current State](#quick-overview)
2. [Complete Capabilities & Technical Specifications](#complete-capabilities)

---

<div style="page-break-after: always;"></div>

# Part 1: Quick Overview

{confusion_md}

---

<div style="page-break-after: always;"></div>

# Part 2: Complete Capabilities

{capabilities_md}
"""

# Convert markdown to HTML
html_content = markdown.markdown(
    combined_md,
    extensions=['extra', 'codehilite', 'tables', 'toc']
)

# Create full HTML document with styling
full_html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>HOLLY AI - Complete Technical Whitepaper</title>
    <style>
        @page {{
            size: letter;
            margin: 1in;
            @bottom-center {{
                content: "Page " counter(page) " of " counter(pages);
                font-size: 9pt;
                color: #666;
            }}
        }}
        
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 100%;
        }}
        
        h1 {{
            color: #a855f7;
            border-bottom: 3px solid #a855f7;
            padding-bottom: 10px;
            font-size: 28pt;
            page-break-before: always;
        }}
        
        h1:first-of-type {{
            page-break-before: avoid;
        }}
        
        h2 {{
            color: #8b5cf6;
            border-bottom: 2px solid #e9d5ff;
            padding-bottom: 8px;
            margin-top: 30px;
            font-size: 20pt;
        }}
        
        h3 {{
            color: #7c3aed;
            margin-top: 20px;
            font-size: 16pt;
        }}
        
        h4 {{
            color: #6d28d9;
            margin-top: 15px;
            font-size: 14pt;
        }}
        
        code {{
            background-color: #f3f4f6;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 9pt;
        }}
        
        pre {{
            background-color: #1f2937;
            color: #e5e7eb;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
            font-size: 9pt;
        }}
        
        pre code {{
            background-color: transparent;
            padding: 0;
            color: #e5e7eb;
        }}
        
        table {{
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
            font-size: 10pt;
        }}
        
        th {{
            background-color: #a855f7;
            color: white;
            padding: 10px;
            text-align: left;
            font-weight: bold;
        }}
        
        td {{
            border: 1px solid #ddd;
            padding: 8px;
        }}
        
        tr:nth-child(even) {{
            background-color: #f9fafb;
        }}
        
        blockquote {{
            border-left: 4px solid #a855f7;
            padding-left: 20px;
            margin: 20px 0;
            color: #6b7280;
            font-style: italic;
        }}
        
        ul, ol {{
            margin: 10px 0;
            padding-left: 30px;
        }}
        
        li {{
            margin: 5px 0;
        }}
        
        a {{
            color: #8b5cf6;
            text-decoration: none;
        }}
        
        a:hover {{
            text-decoration: underline;
        }}
        
        .emoji {{
            font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';
        }}
        
        hr {{
            border: none;
            border-top: 2px solid #e5e7eb;
            margin: 30px 0;
        }}
        
        strong {{
            color: #1f2937;
            font-weight: 600;
        }}
    </style>
</head>
<body>
{html_content}
</body>
</html>
"""

# Generate PDF
print("Generating HOLLY Complete Whitepaper PDF...")
HTML(string=full_html).write_pdf('HOLLY-Complete-Whitepaper.pdf')
print("✅ PDF generated successfully: HOLLY-Complete-Whitepaper.pdf")
print(f"   Size: {os.path.getsize('HOLLY-Complete-Whitepaper.pdf') / 1024:.1f} KB")
