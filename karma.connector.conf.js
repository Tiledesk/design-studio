// Karma config for the connector feature TDD loop (headless, single-run friendly).
// Drops the kjhtml reporter + uses clearContext:true to avoid the spurious
// "Some of your tests did a full page reload!" error that poisons the exit code
// under ChromeHeadless. Wired via the angular.json `test` configuration "connector".
module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma')
    ],
    client: {
      clearContext: true,
      jasmine: {}
    },
    reporters: ['progress'],
    port: 9877,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: false,
    browsers: ['ChromeHeadlessNoSandbox'],
    customLaunchers: {
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--disable-gpu']
      }
    },
    singleRun: true,
    restartOnFileChange: false
  });
};
