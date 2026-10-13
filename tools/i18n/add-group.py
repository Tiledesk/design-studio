#!/usr/bin/env python3
"""Aggiunge (o sostituisce) un gruppo di primo livello in un file i18n, come testo, dopo il gruppo indicato.
Uso: add-group.py <file.json> <after_group> <group.json>   (group.json contiene {"Gruppo": {...}})"""
import json, re, sys
path, after, gpath = sys.argv[1:4]
group = json.load(open(gpath, encoding='utf-8'))
(name, body), = group.items()
text = open(path, encoding='utf-8').read()
lines = text.split('\n')
def find_group(n):
    gi = next((i for i, l in enumerate(lines) if re.match(r'\s*"' + re.escape(n) + r'"\s*:\s*\{', l)), None)
    if gi is None: return None
    ind = len(lines[gi]) - len(lines[gi].lstrip())
    ge = next(i for i in range(gi + 1, len(lines)) if lines[i].strip().startswith('}') and (len(lines[i]) - len(lines[i].lstrip())) == ind)
    return gi, ge, ind
existing = find_group(name)
if existing:
    gi, ge, ind = existing
    trailing = ',' if lines[ge].rstrip().endswith(',') else ''
    del lines[gi:ge + 1]
    insert_at, indent = gi, ' ' * ind
else:
    gi, ge, ind = find_group(after)
    indent = ' ' * ind
    if not lines[ge].rstrip().endswith(','): lines[ge] = lines[ge].rstrip() + ','
    insert_at = ge + 1
    nxt = next(l for l in lines[insert_at:] if l.strip())
    trailing = '' if nxt.strip().startswith('}') else ','
rendered = json.dumps(body, ensure_ascii=False, indent=4)
block = [indent + '"' + name + '": ' + rendered.split('\n')[0]] + [indent + l for l in rendered.split('\n')[1:]]
block[-1] += trailing
lines[insert_at:insert_at] = block
open(path, 'w', encoding='utf-8').write('\n'.join(lines))
json.load(open(path, encoding='utf-8'))
print('ok', path, name)
