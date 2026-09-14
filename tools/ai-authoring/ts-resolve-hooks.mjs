// Hook di risoluzione per i test in Node: gli import relativi senza estensione fra file TypeScript
// (`./blueprint-compiler`) vengono risolti sul file `.ts` corrispondente. Node esegue il TypeScript
// togliendo i tipi, ma non aggiunge le estensioni da solo.
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve as resolvePath, extname } from 'node:path';

export async function resolve(specifier, context, nextResolve) {
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && !extname(specifier) && context.parentURL?.startsWith('file:')) {
    const base = resolvePath(dirname(fileURLToPath(context.parentURL)), specifier);
    for (const candidate of [base + '.ts', base + '/index.ts']) {
      if (existsSync(candidate)) return nextResolve(pathToFileURL(candidate).href, context);
    }
  }
  return nextResolve(specifier, context);
}
