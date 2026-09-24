// A test entry point for the read-only preview only.
//
// The repo's own `src/test.ts` has no `require.context`, and several unrelated spec
// files do not even compile, so the whole suite builds to nothing. This entry loads
// only the specs of this feature and leaves the existing suite exactly as it was
// found -- the same way `src/test-agent-chat.ts` and `src/test-publish.ts` do.
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
  './app/', true, /(read-only\.service|utils\.center)\.unit\.spec\.ts$/);
context.keys().forEach(context);
