import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
register('./ts-resolve-hooks.mjs', pathToFileURL(import.meta.filename ?? new URL(import.meta.url).pathname));
