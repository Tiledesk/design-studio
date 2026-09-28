import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AiService } from './ai.service';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';

describe('AiService', () => {
  let service: AiService;
  let appStorageService: AppStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AiService,
        AppStorageService
      ]
    });
    service = TestBed.inject(AiService);
    appStorageService = TestBed.inject(AppStorageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with correct values', () => {
    const serverBaseUrl = 'http://test-server.com';
    const projectId = 'test-project-id';
    
    service.initialize(serverBaseUrl, projectId);
    
    expect(service.SERVER_BASE_URL).toBe(serverBaseUrl);
    expect(service.project_id).toBe(projectId);
  });

  it('should set URL_TILEDESK_OPENAI correctly after initialization', () => {
    const serverBaseUrl = 'http://test-server.com';
    const projectId = 'test-project-id';
    const expectedUrl = `${serverBaseUrl}${projectId}`;
    
    service.initialize(serverBaseUrl, projectId);
    
    expect(service['URL_TILEDESK_OPENAI']).toBe(expectedUrl);
  });
}); 