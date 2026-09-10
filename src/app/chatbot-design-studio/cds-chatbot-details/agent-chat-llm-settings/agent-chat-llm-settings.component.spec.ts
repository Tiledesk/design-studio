import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DashboardService } from 'src/app/services/dashboard.service';
import { AgentChatSettingsService } from '../../agent-chat/agent-chat-settings.service';
import { AgentChatLlmSettingsComponent } from './agent-chat-llm-settings.component';

class FakeSettings {
  models = [
    { id: 'anthropic:claude-opus-5', label: 'Opus 5', provider: 'anthropic',
      vision: true, pricing: null, default: true },
    { id: 'openai:gpt-5.5', label: 'GPT-5.5', provider: 'openai',
      vision: true, pricing: null, default: false },
  ];
  current: any = { project_id: 'p1', model: null, updated_at: null, updated_by: null };
  saved: any[] = [];
  readError: any = null;
  isAvailable() { return true; }
  async listModels() { return this.models; }
  async read() { if (this.readError) { throw this.readError; } return this.current; }
  async save(projectId: string, model: any) {
    this.saved.push({ projectId, model });
    return { ...this.current, model };
  }
}

describe('AgentChatLlmSettingsComponent', () => {
  let fixture: ComponentFixture<AgentChatLlmSettingsComponent>;
  let settings: FakeSettings;

  async function setup(current?: any) {
    settings = new FakeSettings();
    if (current) { settings.current = current; }
    await TestBed.configureTestingModule({
      declarations: [AgentChatLlmSettingsComponent],
      imports: [FormsModule, TranslateModule.forRoot()],
      providers: [
        { provide: AgentChatSettingsService, useValue: settings },
        { provide: DashboardService, useValue: { projectID: 'p1' } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AgentChatLlmSettingsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  // Redesigned around a single control (fix round 1): the dropdown's own
  // sentinel value ('') *is* "follow the deployment default" -- there is no
  // second `useDeploymentDefault` flag left to agree or disagree with it.
  // apply() therefore sets `selectedModelId` straight to the sentinel when
  // nothing is configured, rather than resolving it to the current default's
  // id, so this assertion changed from the id to '' to match.
  it('shows the deployment default as the selection when nothing is configured',
     async () => {
    await setup();
    expect(fixture.componentInstance.selectedModelId).toBe('');
    expect(fixture.componentInstance.models.length).toBe(2);
  });

  it('shows the project’s own model when one is configured', async () => {
    await setup({ project_id: 'p1', updated_at: 't', updated_by: 'u',
                  model: { id: 'openai:gpt-5.5', params: { temperature: 0.7 } } });
    const c = fixture.componentInstance;
    expect(c.selectedModelId).toBe('openai:gpt-5.5');
    expect(c.temperature).toBe(0.7);
  });

  it('saves the selection with the params it holds', async () => {
    await setup();
    const c = fixture.componentInstance;
    c.selectedModelId = 'openai:gpt-5.5';
    c.temperature = 0.2;
    c.maxTokens = 4000;
    await c.save();
    expect(settings.saved[0]).toEqual({
      projectId: 'p1',
      model: { id: 'openai:gpt-5.5', params: { temperature: 0.2, max_tokens: 4000 } },
    });
  });

  it('sends no params when the fields are left empty', async () => {
    await setup();
    const c = fixture.componentInstance;
    c.selectedModelId = 'openai:gpt-5.5';
    c.temperature = null;
    c.maxTokens = null;
    await c.save();
    expect(settings.saved[0].model).toEqual({ id: 'openai:gpt-5.5', params: {} });
  });

  // Was: tick a separate `useDeploymentDefault` checkbox. Now the sentinel
  // value on the single control *is* "deployment default" -- choosing it is
  // choosing the sentinel, nothing more.
  it('clears the override by choosing the deployment default', async () => {
    await setup();
    const c = fixture.componentInstance;
    c.selectedModelId = '';
    await c.save();
    expect(settings.saved[0].model).toBeNull();
  });

  // `error` now holds an i18n key rather than a hardcoded sentence (fix
  // round 1, MINOR 6), so this no longer checks for the substring 'admin' --
  // it checks the exact key the template translates. The form is also fully
  // suppressed on a 403 (IMPORTANT 4: the runtime 403s the GET too, so
  // showing empty fields under the message would misreport "nothing
  // configured"), which the DOM assertion below now checks directly
  // (IMPORTANT 5) rather than trusting only the component's `readOnly` flag.
  it('hides the form and explains when the caller is not an admin', async () => {
    settings = new FakeSettings();
    settings.readError = { status: 403 };
    await TestBed.resetTestingModule();
    await setup2(settings);
    expect(fixture.componentInstance.readOnly).toBe(true);
    expect(fixture.componentInstance.error).toBe('LlmSettingsForbidden');
    expect(fixture.nativeElement.querySelector('#llm-model')).toBeNull();
  });

  async function setup2(fake: FakeSettings) {
    await TestBed.configureTestingModule({
      declarations: [AgentChatLlmSettingsComponent],
      imports: [FormsModule, TranslateModule.forRoot()],
      providers: [
        { provide: AgentChatSettingsService, useValue: fake },
        { provide: DashboardService, useValue: { projectID: 'p1' } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AgentChatLlmSettingsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }
});
