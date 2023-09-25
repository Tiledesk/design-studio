import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AppConfigProvider } from './services/app-config';
import { NGXLogger } from 'ngx-logger';
import { CustomLogger } from 'src/chat21-core/providers/logger/customLogger';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { Chat21Service } from 'src/chat21-core/providers/mqtt/chat-service';
import { ChatbotDesignStudioModule } from './chatbot-design-studio/chatbot-design-studio.module';
import { BotsBaseComponent } from './components/bots/bots-base/bots-base.component';
import { FaqService } from './services/faq.service';
import { FaqKbService } from './services/faq-kb.service';

// FACTORIES
export function createTranslateLoader(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');

}

const appInitializerFn = (appConfig: AppConfigProvider, logger: NGXLogger) => {
  return () => {
    let customLogger = new CustomLogger(logger);
    LoggerInstance.setInstance(customLogger);
    if (environment.remoteConfig) {
      return appConfig.loadAppConfig();
    }
  };
};

@NgModule({
  declarations: [
    AppComponent,
    BotsBaseComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ChatbotDesignStudioModule
  ],
  bootstrap: [AppComponent],
  providers: [
    AppConfigProvider,
    {
      provide: APP_INITIALIZER,
      useFactory: appInitializerFn,
      multi: true,
      deps: [AppConfigProvider, NGXLogger]
    },
    Chat21Service,
    FaqService,
    FaqKbService
  ]
})
export class AppModule { }
