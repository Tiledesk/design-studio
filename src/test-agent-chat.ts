// A test entry point for the agent-chat feature only.
//
// The repo's own `src/test.ts` has no `require.context`, so the karma builder
// loads no specs through it and `npm test` runs nothing. Rather than repair
// nineteen unrelated broken spec files to fix that, this feature loads its own
// specs here and leaves the existing suite exactly as it was found.
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

const context = (require as any).context(
  './app/chatbot-design-studio/', true, /(agent-chat|flow-ops)[\w.-]*\.spec\.ts$/);
context.keys().forEach(context);
