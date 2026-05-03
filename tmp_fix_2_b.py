import os
import re

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Replacing inline styles concatenated with other classNames
    # e.g. className="something" style={{ color: "#64748b" }} 
    
    content = re.sub(r'className="([^"]+)"\s*style=\{\{\s*color:\s*"#64748b"\s*\}\}', r'className="\1 text-neutral-500"', content)
    content = re.sub(r'className="([^"]+)"\s*style=\{\{\s*color:\s*"#94a3b8"\s*\}\}', r'className="\1 text-neutral-400"', content)
    content = re.sub(r'style=\{\{\s*color:\s*"#64748b"\s*\}\}', r'className="text-neutral-500"', content)
    content = re.sub(r'style=\{\{\s*color:\s*"#94a3b8"\s*\}\}', r'className="text-neutral-400"', content)
    
    # Text colors
    content = content.replace('text-white', 'text-neutral-100')
    content = content.replace('text-slate-300', 'text-neutral-300')
    
    with open(filepath, 'w') as f:
        f.write(content)

fix_file("App/src/pages/SummaryPage.tsx")
fix_file("App/src/pages/CiscoPage.tsx")
