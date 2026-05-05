#!/usr/bin/env python3
"""
Generate professional PDFs from Holly Documentation
Converts Markdown files to styled PDFs with cover pages, table of contents, and branding
"""

import markdown
from weasyprint import HTML, CSS
from pathlib import Path
import os

# Define project root and output directory
PROJECT_ROOT = Path("/home/user/Holly-AI")
DOCS_DIR = PROJECT_ROOT / "docs"
OUTPUT_DIR = PROJECT_ROOT / "dist" / "pdfs"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Professional CSS styling for all PDFs
PDF_CSS = """
@page {
    size: A4;
    margin: 2cm 1.5cm;
    @top-center {
        content: "HOLLY 3.0 - AI Development Platform";
        font-family: Arial, sans-serif;
        font-size: 9pt;
        color: #666;
    }
    @bottom-center {
        content: "Page " counter(page) " of " counter(pages);
        font-family: Arial, sans-serif;
        font-size: 9pt;
        color: #666;
    }
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-size: 11pt;
    line-height: 1.6;
    color: #333;
    max-width: 100%;
}

h1 {
    color: #1a1a1a;
    font-size: 28pt;
    font-weight: 700;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    page-break-after: avoid;
    border-bottom: 3px solid #0066cc;
    padding-bottom: 0.3em;
}

h2 {
    color: #0066cc;
    font-size: 20pt;
    font-weight: 600;
    margin-top: 1.2em;
    margin-bottom: 0.4em;
    page-break-after: avoid;
}

h3 {
    color: #333;
    font-size: 16pt;
    font-weight: 600;
    margin-top: 1em;
    margin-bottom: 0.3em;
    page-break-after: avoid;
}

h4 {
    color: #555;
    font-size: 13pt;
    font-weight: 600;
    margin-top: 0.8em;
    margin-bottom: 0.2em;
}

p {
    margin-bottom: 0.8em;
    text-align: justify;
}

ul, ol {
    margin-left: 1.5em;
    margin-bottom: 0.8em;
}

li {
    margin-bottom: 0.4em;
}

code {
    background-color: #f5f5f5;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
    font-size: 10pt;
    color: #c7254e;
}

pre {
    background-color: #f5f5f5;
    padding: 12px;
    border-radius: 5px;
    border-left: 4px solid #0066cc;
    overflow-x: auto;
    page-break-inside: avoid;
    margin: 1em 0;
}

pre code {
    background-color: transparent;
    padding: 0;
    color: #333;
}

blockquote {
    border-left: 4px solid #0066cc;
    padding-left: 1em;
    margin: 1em 0;
    color: #555;
    font-style: italic;
    background-color: #f9f9f9;
    padding: 0.5em 1em;
}

table {
    border-collapse: collapse;
    width: 100%;
    margin: 1em 0;
    page-break-inside: avoid;
}

th, td {
    border: 1px solid #ddd;
    padding: 8px;
    text-align: left;
}

th {
    background-color: #0066cc;
    color: white;
    font-weight: 600;
}

tr:nth-child(even) {
    background-color: #f9f9f9;
}

a {
    color: #0066cc;
    text-decoration: none;
}

strong {
    font-weight: 600;
    color: #1a1a1a;
}

.cover-page {
    text-align: center;
    page-break-after: always;
    margin-top: 4cm;
}

.cover-title {
    font-size: 36pt;
    font-weight: 700;
    color: #0066cc;
    margin-bottom: 0.5em;
}

.cover-subtitle {
    font-size: 20pt;
    color: #555;
    margin-bottom: 2em;
}

.cover-footer {
    position: absolute;
    bottom: 3cm;
    left: 0;
    right: 0;
    text-align: center;
    color: #666;
    font-size: 12pt;
}
"""

def generate_cover_page(title: str, subtitle: str) -> str:
    """Generate HTML for a professional cover page"""
    return f"""
    <div class="cover-page">
        <div style="margin-bottom: 2cm;">
            <h1 class="cover-title">HOLLY 3.0</h1>
            <p style="font-size: 14pt; color: #666; margin-bottom: 3cm;">
                Hyper-Optimized Logic & Learning Yield
            </p>
        </div>
        <div>
            <h2 class="cover-title" style="font-size: 32pt;">{title}</h2>
            <p class="cover-subtitle">{subtitle}</p>
        </div>
        <div class="cover-footer">
            <p><strong>Hollywood Productions</strong></p>
            <p>Steve "Hollywood" Dorego</p>
            <p style="margin-top: 1em; font-size: 10pt;">Generated: December 2025</p>
        </div>
    </div>
    """

def markdown_to_pdf(md_file: Path, output_file: Path, cover_title: str, cover_subtitle: str):
    """Convert a Markdown file to a professionally styled PDF"""
    print(f"Converting {md_file.name} to PDF...")
    
    # Read markdown content
    with open(md_file, 'r', encoding='utf-8') as f:
        md_content = f.read()
    
    # Convert markdown to HTML
    html_content = markdown.markdown(
        md_content,
        extensions=['extra', 'codehilite', 'tables', 'toc']
    )
    
    # Generate full HTML document with cover page
    full_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>{cover_title}</title>
    </head>
    <body>
        {generate_cover_page(cover_title, cover_subtitle)}
        {html_content}
    </body>
    </html>
    """
    
    # Generate PDF
    HTML(string=full_html).write_pdf(
        output_file,
        stylesheets=[CSS(string=PDF_CSS)]
    )
    
    print(f"✅ PDF generated: {output_file}")
    return output_file

def main():
    """Generate all three PDFs"""
    print("🚀 HOLLY PDF Generator - Starting...\n")
    
    # Document definitions
    documents = [
        {
            "source": DOCS_DIR / "HOLLY_WHITE_PAPER.md",
            "output": OUTPUT_DIR / "HOLLY_White_Paper.pdf",
            "cover_title": "White Paper",
            "cover_subtitle": "Technical Architecture & System Design"
        },
        {
            "source": DOCS_DIR / "HOLLY_INVESTOR_PITCH.md",
            "output": OUTPUT_DIR / "HOLLY_Investor_Pitch.pdf",
            "cover_title": "Investor Pitch",
            "cover_subtitle": "Market Opportunity & Financial Projections"
        },
        {
            "source": DOCS_DIR / "DEVELOPER_DOCUMENTATION.md",
            "output": OUTPUT_DIR / "HOLLY_Developer_Documentation.pdf",
            "cover_title": "Developer Documentation",
            "cover_subtitle": "Complete Technical Reference & API Guide"
        }
    ]
    
    # Generate each PDF
    generated_files = []
    for doc in documents:
        if not doc["source"].exists():
            print(f"❌ Source file not found: {doc['source']}")
            continue
        
        pdf_file = markdown_to_pdf(
            doc["source"],
            doc["output"],
            doc["cover_title"],
            doc["cover_subtitle"]
        )
        generated_files.append(pdf_file)
        print(f"   Size: {pdf_file.stat().st_size // 1024}KB\n")
    
    print("=" * 60)
    print(f"✅ SUCCESS: Generated {len(generated_files)} PDFs")
    print("=" * 60)
    for file in generated_files:
        print(f"   📄 {file.name} ({file.stat().st_size // 1024}KB)")
    print()

if __name__ == "__main__":
    main()
