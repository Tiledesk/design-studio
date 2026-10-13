// Suite dedicata alle regole V2/V3 all'apertura di un agente (versione dell'editor e
// defaultFallback): `npm run test:v2-rules`. La suite di default (`src/test.ts`) carica
// ogni spec del progetto, comprese quelle che oggi non compilano.

import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';

getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
);

const context = (require as any).context('./app/', true, /(services\/dashboard\.service|chatbot-design-studio\/utils-fallback)\.spec\.ts$/);
context.keys().forEach(context);
