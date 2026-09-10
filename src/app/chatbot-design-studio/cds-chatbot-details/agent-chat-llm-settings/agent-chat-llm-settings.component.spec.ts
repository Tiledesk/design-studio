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

  // Fix round 2 (Important): the default was selectable while the number
  // fields stayed editable and enabled, so a temperature typed after
  // switching back to the default was silently discarded by save() --
  // same false "Saved." confirmation as the Critical, reached by a
  // shorter path. onModelChange now clears both params when the sentinel
  // is chosen, and the template disables the fields for it, so this pins
  // both the state clearing and what actually lands on screen.
  it('clears and disables the params when switching back to the default',
     async () => {
    await setup();
    const c = fixture.componentInstance;
    c.onModelChange('openai:gpt-5.5');
    c.temperature = 0.9;
    c.maxTokens = 1500;

    c.onModelChange('');
    fixture.detectChanges();

    expect(c.temperature).toBeNull();
    expect(c.maxTokens).toBeNull();
    const temperatureInput: HTMLInputElement =
      fixture.nativeElement.querySelector('#llm-temperature');
    expect(temperatureInput.disabled).toBe(true);

    await c.save();
    expect(settings.saved[0].model).toBeNull();
  });

  // Fix round 3 (IMPORTANT 2): `expect(models.length).toBe(2)` above passes
  // while the *rendered* dropdown lists the deployment default twice -- the
  // sentinel option and the `*ngFor` both render it, because `GET /v1/models`
  // always includes the default flagged `default: true`. Two identical lines,
  // and picking the second pins the model by name, which is the outcome §4.1
  // exists to prevent. So this asserts the DOM, where the defect lived.
  it('lists the deployment default exactly once, and marks it', async () => {
    await setup();
    const options: HTMLOptionElement[] =
      Array.from(fixture.nativeElement.querySelectorAll('#llm-model option'));

    expect(options.length).toBe(2);
    const forDefault = options.filter(o => (o.textContent || '').includes('Opus 5'));
    expect(forDefault.length).toBe(1);
    // TranslateModule.forRoot() with no translations renders the key itself.
    expect(forDefault[0].textContent).toContain('LlmSettingsDefault');
    // The marker used to be a `<span *ngIf>` INSIDE the `<option>`, which a
    // browser does not render -- so the option text must be a plain string
    // with no child markup at all.
    options.forEach(o => expect(o.children.length).toBe(0));
    // The sentinel is still what "the deployment's own model" carries.
    expect(forDefault[0].value).toBe('');
  });

  // Fix round 3 (IMPORTANT 3): `<form class="row">` put all seven children
  // into one grid row, so labels and controls did not pair up on screen --
  // "Temperature" at the far right with its input under "Model". Every
  // sibling section wraps each label+control pair in its own `.row`.
  it('pairs every label with its own control, one row each', async () => {
    await setup();
    const form: HTMLElement = fixture.nativeElement.querySelector('form');
    expect(form.classList.contains('row')).toBe(false);

    for (const selector of ['#llm-model', '#llm-temperature', '#llm-max-tokens']) {
      const control: HTMLElement = fixture.nativeElement.querySelector(selector);
      const row = control.closest('.row');
      expect(row).withContext(`${selector} has no row of its own`).not.toBeNull();
      const labels = row!.querySelectorAll('label');
      expect(labels.length).withContext(`${selector}'s row holds other labels`).toBe(1);
      expect(labels[0].getAttribute('for')).toBe(control.id);
    }
  });

  // Fix round 3 (MINOR 8): blank does not mean "no temperature" -- agent.yaml's
  // own params are in force and merge at resolve time. An empty box with no
  // hint reads as "nothing is set", which is wrong.
  it('says what a blank param field means', async () => {
    await setup();
    const temperature: HTMLInputElement =
      fixture.nativeElement.querySelector('#llm-temperature');
    const maxTokens: HTMLInputElement =
      fixture.nativeElement.querySelector('#llm-max-tokens');
    expect(temperature.getAttribute('placeholder')).toBe('LlmSettingsInherited');
    expect(maxTokens.getAttribute('placeholder')).toBe('LlmSettingsInherited');
  });

  // Fix round 3 (IMPORTANT 4): a deployment with no `model_catalog` is
  // behaving exactly as §4 says it must, and every deployment this image
  // serves other than the vibe coder's is in that state. `GET /v1/models`
  // answers 200 with the one entry and the settings route answers 409
  // `not_configured` -- which the catch-all branch reported as "The runtime
  // configuration could not be loaded." over a form whose Save could only
  // 409 again. Nothing is wrong, so nothing should be said.
  it('renders nothing at all when the deployment declares no catalog', async () => {
    const fake = new FakeSettings();
    fake.readError = {
      status: 409,
      error: { error: { code: 'not_configured', message: 'no model_catalog' } },
    };
    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      declarations: [AgentChatLlmSettingsComponent],
      imports: [FormsModule, TranslateModule.forRoot()],
      providers: [
        { provide: AgentChatSettingsService, useValue: fake },
        { provide: DashboardService, useValue: { projectID: 'p1' } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AgentChatLlmSettingsComponent);
    const unavailable: boolean[] = [];
    fixture.componentInstance.unavailable.subscribe(() => unavailable.push(true));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#llm-model')).toBeNull();
    expect(fixture.nativeElement.textContent.trim()).toBe('');
    // And the parent is told, so the tab goes away rather than sitting there
    // opening onto an empty panel.
    expect(unavailable.length).toBe(1);
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
