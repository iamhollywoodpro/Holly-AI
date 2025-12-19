#!/usr/bin/env python3
import os
import re
from pathlib import Path

fixed_count = 0
already_has = 0

for route_file in Path('app/api').rglob('route.ts'):
    content = route_file.read_text()
    
    # Check if already has runtime export
    if 'export const runtime' in content:
        already_has += 1
        continue
    
    # Find the last import statement
    lines = content.split('\n')
    last_import_idx = -1
    
    for i, line in enumerate(lines):
        if line.strip().startswith('import '):
            last_import_idx = i
    
    if last_import_idx >= 0:
        # Insert runtime export after last import
        lines.insert(last_import_idx + 1, "")
        lines.insert(last_import_idx + 2, "export const runtime = 'nodejs';")
        lines.insert(last_import_idx + 3, "")
        
        route_file.write_text('\n'.join(lines))
        print(f"✅ Fixed: {route_file}")
        fixed_count += 1
    else:
        # No imports, add at the top
        lines.insert(0, "export const runtime = 'nodejs';")
        lines.insert(1, "")
        route_file.write_text('\n'.join(lines))
        print(f"✅ Fixed (no imports): {route_file}")
        fixed_count += 1

print(f"\n📊 Summary:")
print(f"  ✅ Fixed: {fixed_count}")
print(f"  ✔️  Already had runtime: {already_has}")
print(f"  🎯 Total: {fixed_count + already_has}")
