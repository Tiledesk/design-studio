// Dedicated Karma entry for the connector feature TDD loop.
// Loads ONLY connector specs, isolating them from pre-existing broken specs
// elsewhere in the repo. Wired via the angular.json `test` configuration "connector".
import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';

declare const require: {
  context(path: string, deep?: boolean, filter?: RegExp): {
    keys(): string[];
    <T>(id: string): T;
  };
};

getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
);

// Only connector specs.
const context = require.context('./app/chatbot-design-studio/connector', true, /\.spec\.ts$/);
context.keys().forEach(context);
