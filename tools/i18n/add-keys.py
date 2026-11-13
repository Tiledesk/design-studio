#!/usr/bin/env python3
"""Inserisce chiavi in un gruppo di un file i18n come testo, senza riformattare il file.
Uso: add-keys.py <file.json> <Gruppo> <after_key> '<json object of new keys>'
Le nuove righe prendono l'indentazione della riga di after_key. Le chiavi già presenti vengono aggiornate."""
import json, re, sys
path, group, after, payload = sys.argv[1:5]
keys = json.loads(payload)
lines = open(path, encoding='utf-8').read().split('\n')
# trova il gruppo
gi = next(i for i, l in enumerate(lines) if re.match(r'\s*"' + re.escape(group) + r'"\s*:\s*\{', l))
# fine del gruppo: prima riga che chiude alla stessa indentazione
gindent = len(lines[gi]) - len(lines[gi].lstrip())
ge = next(i for i in range(gi + 1, len(lines)) if lines[i].strip().startswith('}') and (len(lines[i]) - len(lines[i].lstrip())) == gindent)
def esc(v): return json.dumps(v, ensure_ascii=False)
# aggiorna esistenti
for k, v in list(keys.items()):
    for i in range(gi + 1, ge):
        m = re.match(r'(\s*)"' + re.escape(k) + r'"\s*:\s*(.*?)(,?)\s*$', lines[i])
        if m:
            lines[i] = f'{m.group(1)}"{k}": {esc(v)}{m.group(3)}'
            del keys[k]; break
if keys:
    ai = next(i for i in range(gi + 1, ge) if re.match(r'\s*"' + re.escape(after) + r'"\s*:', lines[i]))
    indent = lines[ai][:len(lines[ai]) - len(lines[ai].lstrip())]
    if not lines[ai].rstrip().endswith(','): lines[ai] = lines[ai].rstrip() + ','
    new = [f'{indent}"{k}": {esc(v)},' for k, v in keys.items()]
    new[-1] = new[-1].rstrip(',')
    # se dopo after_key ci sono altre righe, la nuova ultima riga deve avere la virgola
    nxt = lines[ai + 1].strip()
    if not nxt.startswith('}'): new[-1] += ','
    lines[ai + 1:ai + 1] = new
open(path, 'w', encoding='utf-8').write('\n'.join(lines))
json.load(open(path, encoding='utf-8'))  # verifica che resti JSON valido
print('ok', path, len(sys.argv[4]))
