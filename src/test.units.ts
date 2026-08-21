// Karma entry for isolated pure-unit specs (*.unit.spec.ts) under src/app.
// Loads ONLY *.unit.spec.ts files, isolating them from pre-existing broken specs
// elsewhere in the repo. Wired via the angular.json `test` configuration "units".
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

const context = require.context('./app', true, /\.unit\.spec\.ts$/);
context.keys().forEach(context);
