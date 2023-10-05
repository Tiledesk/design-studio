import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AppConfigService } from './services/app-config';
import { LoggerModule, NGXLogger, NgxLoggerLevel } from 'ngx-logger';
import { CustomLogger } from 'src/chat21-core/providers/logger/customLogger';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { environment } from 'src/environments/environment';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { Chat21Service } from 'src/chat21-core/providers/mqtt/chat-service';
import { ChatbotDesignStudioModule } from './chatbot-design-studio/chatbot-design-studio.module';
import { BotsBaseComponent } from './components/bots/bots-base/bots-base.component';
import { FaqService } from './services/faq.service';
import { FaqKbService } from './services/faq-kb.service';
import { UploadService } from 'src/chat21-core/providers/abstract/upload.service';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';
import { UPLOAD_ENGINE_NATIVE } from 'src/chat21-core/utils/constants';
import { NativeUploadService } from 'src/chat21-core/providers/native/native-upload-service';
import { FirebaseUploadService } from 'src/chat21-core/providers/firebase/firebase-upload.service';
import { ProjectService } from './services/projects.service';
import { UsersService } from './services/users.service';
import { KnowledgeBaseService } from './services/knowledge-base.service';
import { OpenaiService } from './services/openai.service';
import { WhatsappService } from './services/whatsapp.service';
import { UiModule } from './ui/shared/ui.module';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { BrandService } from './services/brand.service';
import { MultichannelService } from './services/multichannel.service';
import { MatDialogModule } from '@angular/material/dialog';
import { NgSelectModule } from '@ng-select/ng-select';
import { SatPopoverModule } from '@ncstate/sat-popover';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { LocalSessionStorage } from 'src/chat21-core/providers/localSessionStorage';
import { DepartmentService } from './services/department.service';
import { WebSocketJs } from './services/websocket/websocket-js';
import { DatePipe } from '@angular/common';

// FACTORIES
export function createTranslateLoader(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');

}

const appInitializerFn = (appConfig: AppConfigService, logger: NGXLogger) => {
  return () => {
    let customLogger = new CustomLogger(logger);
    LoggerInstance.setInstance(customLogger);
    if (environment.remoteConfig) {
      return appConfig.loadAppConfig();
    }
  };
};

export function uploadFactory(http: HttpClient, appConfig: AppConfigService, appStorage: AppStorageService) {

  const config = appConfig.getConfig()
  if (config.uploadEngine === UPLOAD_ENGINE_NATIVE) {
    const nativeUploadService = new NativeUploadService(http, appStorage)
    nativeUploadService.setBaseUrl(config.baseImageUrl)
    return nativeUploadService
  } else {
    return new FirebaseUploadService();
  }
}

@NgModule({
  declarations: [
    AppComponent,
    BotsBaseComponent
  ],
  imports: [
    // TooltipModule.forRoot(CutomTooltipOptions as TooltipOptions),
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    HttpClientModule,
    ChatbotDesignStudioModule,
    UiModule,
    SatPopoverModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: (createTranslateLoader),
        deps: [HttpClient]
      }
    }),
    LoggerModule.forRoot({
      level: NgxLoggerLevel.DEBUG,
      // serverLogLevel: NgxLoggerLevel.ERROR,
      timestampFormat: 'HH:mm:ss.SSS',
      enableSourceMaps: false,
      disableFileDetails: true,
      colorScheme: ['purple', 'yellow', 'gray', 'gray', 'red', 'red', 'red'],
      // serverLoggingUrl: 'https://tiledesk-server-pre.herokuapp.com/logs'
    }),
  ],
  bootstrap: [AppComponent],
  providers: [
    AppConfigService,
    {
      provide: APP_INITIALIZER,
      useFactory: appInitializerFn,
      multi: true,
      deps: [AppConfigService, NGXLogger]
    },
    {
      provide: UploadService,
      useFactory: uploadFactory,
      deps: [HttpClient, AppConfigService, AppStorageService]
    },
    {
      provide: AppStorageService,
      useClass: LocalSessionStorage
    },
    Chat21Service,
    FaqService,
    FaqKbService,
    ProjectService,
    DepartmentService,
    UsersService,
    KnowledgeBaseService,
    OpenaiService,
    WhatsappService,
    BrandService,
    MultichannelService,
    WebSocketJs,
    DatePipe
  ]
})
export class AppModule { }
