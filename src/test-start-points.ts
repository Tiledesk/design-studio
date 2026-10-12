// A test entry point for the start points (Web / Webhook / Scheduled start boxes) only.
//
// The repo's own `src/test.ts` has no `require.context`, so the karma builder loads no
// specs through it and `npm test` runs nothing. Rather than repair unrelated spec files
// to fix that, this feature loads its own specs here and leaves the existing suite
// exactly as it was found.
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
  './app/chatbot-design-studio/', true,
  /(utils-start-points[\w.-]*|utils-schedule[\w.-]*|utils-scheduled-panel[\w.-]*|start-box-controls|start-points-wiring|start-point-manager\.service)\.spec\.ts$/);
context.keys().forEach(context);
