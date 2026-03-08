import os
import re

input_file = r"c:\storycore-engine\report.txt"
output_file = r"C:\Users\redga\.gemini\antigravity\brain\55eeefdf-7d4c-434b-b0a0-9bd62d67609a\code_analysis_report.md"

def process_file():
    todos = []
    mocks = []
    not_implemented = []
    any_types = []
    
    with open(input_file, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            line = line.strip()
            if not line: continue
            
            parts = line.split(":", 2)
            if len(parts) < 3: continue
            
            filepath, lineno, content = parts[0], parts[1], parts[2]
            
            lw = filepath.lower()
            if lw.endswith('.md') or 'test' in lw or '__tests__' in lw or 'spec' in lw or 'storybook' in lw or 'examples' in lw:
                continue
                
            content_lower = content.lower()
            # Ignore test mock files
            if '__mocks__' in lw or 'mock' in lw.split('/')[-1]:
                continue
                
            item_str = f"- `{filepath}:{lineno}`: {content.strip()}"
            
            if 'todo' in content_lower or 'fixme' in content_lower or 'manquant' in content_lower:
                todos.append(item_str)
            elif 'notimplemented' in content_lower:
                not_implemented.append(item_str)
            elif 'mock' in content_lower or 'simul' in content_lower:
                mocks.append(item_str)
            elif ': any' in content_lower or ':any' in content_lower:
                any_types.append(item_str)

    with open(output_file, 'w', encoding='utf-8') as out:
        out.write("# Rapport d'Analyse du Code (TODOs, Mocks, any, non implémenté)\n\n")
        out.write("Voici la liste des éléments manquants, simulés ou à typer correctement dans le code source.\n\n")
        
        out.write(f"## 🛑 Non Implémenté ({len(not_implemented)})\n")
        out.write("\n".join(not_implemented) + "\n\n")
        
        out.write(f"## 🛠️ TODOs et Code Manquant ({len(todos)})\n")
        out.write("\n".join(todos) + "\n\n")
        
        out.write(f"## 🎭 Mocks et Simulations ({len(mocks)})\n")
        # Keep highest priority mocks / simulations
        out.write("\n".join(mocks[:200]) + ("\n...(liste tronquée)" if len(mocks)>200 else "") + "\n\n")
        
        out.write(f"## ❓ Types 'any' ({len(any_types)})\n")
        out.write("\n".join(any_types[:200]) + ("\n...(liste tronquée)" if len(any_types)>200 else "") + "\n\n")
        
if __name__ == "__main__":
    process_file()
