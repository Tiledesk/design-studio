// Entry point dei test delle condizioni e dei filtri (utils-condition): operatori, formula `when`,
// rilettura nell'editor, "ignora maiuscole", salvataggio dei filtri delle risposte.
// `npm run test:condition`. Stesso schema delle altre suite (test-models.ts, test-version.ts).
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

const context = (require as any).context('./app/chatbot-design-studio/', true, /utils-condition\.spec\.ts$/);
context.keys().forEach(context);
