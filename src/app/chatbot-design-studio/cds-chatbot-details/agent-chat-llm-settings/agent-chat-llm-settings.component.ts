import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { DashboardService } from 'src/app/services/dashboard.service';
import {
  AgentChatSettingsService, ProjectModelSettings, RuntimeModel
} from '../../agent-chat/agent-chat-settings.service';
import { buildModelOptions, ModelOption, OptionTexts } from './agent-chat-llm-settings.options';

/** The model the vibe coder runs on, for this whole project.
 *
 *  It lives in the chatbot settings panel because that is where the studio
 *  keeps settings, but what it configures is the *project* -- every agent in
 *  it, not the chatbot that happens to be open. The template says so in as
 *  many words: the surrounding panel implies otherwise, and a user who reads
 *  the layout instead of the copy would be misled. */
@Component({
  selector: 'cds-agent-chat-llm-settings',
  templateUrl: './agent-chat-llm-settings.component.html',
  styleUrls: ['./agent-chat-llm-settings.component.scss']
})
export class AgentChatLlmSettingsComponent implements OnInit {

  /** Fired once when this deployment declares no `model_catalog` at all, so
   *  the parent can drop the tab rather than leave it opening onto nothing.
   *  Not an error: §4 says such a deployment must behave exactly as it did
   *  before this feature existed, and most of them are in that state. */
  @Output() unavailable = new EventEmitter<void>();

  models: RuntimeModel[] = [];
  /** '' is the sentinel for "the deployment's own model": it is what the
   *  first, synthetic option in the dropdown carries. Saving with '' sends
   *  `model: null` rather than the default's id by name, so a deployment
   *  that later changes its default carries this project with it.
   *
   *  This used to be split across this field plus a separate
   *  `useDeploymentDefault` checkbox -- two pieces of state that could
   *  disagree (checkbox ticked, a different model still showing in the
   *  dropdown; save honouring one while the screen showed the other). A
   *  single control that is either the sentinel or a real id cannot
   *  disagree with itself. */
  selectedModelId = '';
  temperature: number | null = null;
  maxTokens: number | null = null;
  readOnly = false;
  /** The deployment declares no catalog (`409 not_configured`). Nothing is
   *  wrong, so nothing is said: the template renders no form and no message. */
  notConfigured = false;
  loading = true;
  saving = false;
  /** An i18n key, not a sentence -- the template translates it. When it
   *  instead holds the runtime's own message (a save-time 400, say) that
   *  text has no matching key, and ngx-translate's fallback for a missing
   *  key is to render the value verbatim, which is exactly the raw server
   *  message we want in that case. */
  error: string | null = null;
  saved = false;

  /** Rebuilt after load and after save (see `refreshOptions`). */
  options: ModelOption[] = [];

  /** Resolved once in `ngOnInit`: the options are built outside the template,
   *  where the translate pipe is not available. */
  private texts: OptionTexts = {
    defaultMarker: 'LlmSettingsDefault', curated: 'LlmSettingsGroupCurated',
    openRouter: 'LlmSettingsGroupOpenRouter', priceUnknown: 'LlmSettingsPriceUnknown',
    unavailable: 'LlmSettingsUnavailable'
  };

  constructor(
    public settings: AgentChatSettingsService,
    private dashboardService: DashboardService,
    private translate: TranslateService
  ) {}

  get defaultModel(): RuntimeModel | undefined {
    return this.models.find(m => m.default);
  }

  /** Case-insensitive substring over label, id and provider
   *  (`searchText` is lower-cased by `buildModelOptions`). */
  searchOption = (term: string, item: ModelOption): boolean =>
    item.searchText.includes(term.toLowerCase());

  /** The saved model is no longer offered by the runtime: it is shown, but
   *  cannot be saved back until the user picks something else. */
  get selectedUnavailable(): boolean {
    return !!this.options.find(o => o.id === this.selectedModelId && o.disabled);
  }

  private refreshOptions(): void {
    this.options = buildModelOptions(this.models, this.selectedModelId, this.texts);
  }

  async ngOnInit(): Promise<void> {
    try {
      this.models = await this.settings.listModels();
      const t = await firstValueFrom(this.translate.get([
        'LlmSettingsDefault', 'LlmSettingsGroupCurated', 'LlmSettingsGroupOpenRouter',
        'LlmSettingsPriceUnknown', 'LlmSettingsUnavailable']));
      this.texts = {
        defaultMarker: t['LlmSettingsDefault'], curated: t['LlmSettingsGroupCurated'],
        openRouter: t['LlmSettingsGroupOpenRouter'], priceUnknown: t['LlmSettingsPriceUnknown'],
        unavailable: t['LlmSettingsUnavailable']
      };
      const current: ProjectModelSettings =
        await this.settings.read(this.dashboardService.projectID);
      this.apply(current);
    } catch (e: any) {
      if (e?.status === 409 && e?.error?.error?.code === 'not_configured') {
        // A deployment with no `model_catalog`. `GET /v1/models` still answers
        // 200 with the single default entry, so only this 409 says so -- and
        // reporting it as "the runtime configuration could not be loaded" told
        // every correctly configured deployment that something was broken,
        // over a form whose Save could only 409 again.
        this.notConfigured = true;
        this.unavailable.emit();
      } else if (e?.status === 403) {
        // The runtime 403s the GET as well as the PUT, so the current value
        // genuinely cannot be shown -- the template hides the form entirely
        // rather than leaving fields on screen that look like real state.
        this.readOnly = true;
        this.error = 'LlmSettingsForbidden';
      } else {
        this.error = 'LlmSettingsLoadError';
      }
    } finally {
      this.loading = false;
    }
  }

  private apply(current: ProjectModelSettings): void {
    const storedId = current?.model?.id ?? '';
    // An override naming the deployment's *own* model id is a state this
    // panel cannot represent. The dropdown offers that model only as the ''
    // sentinel, and the sentinel means "follow the deployment default" --
    // which carries no params of its own. Left verbatim, `storedId` would
    // match no `<option>` at all: Angular sets `selectedIndex = -1` and the
    // panel shows a blank select while the number fields sit populated.
    //
    // So it is read as the sentinel, and the params are dropped with it
    // rather than shown in boxes that are about to be disabled and then
    // discarded. The consequence, stated plainly: opening this panel on such
    // a project shows the deployment default, and saving from here writes
    // `model: null` and normalises the unrepresentable override away. The
    // runtime keeps a branch for the state (`effective.py`,
    // `override.id == config.model.id`) -- it just cannot be reached, or
    // preserved, from here.
    const isDefault = storedId !== '' && storedId === this.defaultModel?.id;
    this.selectedModelId = isDefault ? '' : storedId;
    this.temperature = isDefault ? null : (current?.model?.params?.temperature ?? null);
    this.maxTokens = isDefault ? null : (current?.model?.params?.max_tokens ?? null);
    this.refreshOptions();
  }

  onModelChange(id: string): void {
    this.selectedModelId = id;
    if (id === '') {
      // The deployment default carries no params of its own -- the fields
      // are about to become disabled (see the template), and leaving a
      // stale number sitting in a disabled box would read as "still in
      // effect" when it is about to be discarded on save.
      this.temperature = null;
      this.maxTokens = null;
    }
    this.saved = false;
  }

  onTemperatureChange(value: number | null): void {
    this.temperature = value;
    this.saved = false;
  }

  onMaxTokensChange(value: number | null): void {
    this.maxTokens = value;
    this.saved = false;
  }

  async save(): Promise<void> {
    this.saving = true;
    this.error = null;
    this.saved = false;
    try {
      const params: { temperature?: number; max_tokens?: number } = {};
      if (this.temperature !== null && this.temperature !== undefined) {
        params.temperature = Number(this.temperature);
      }
      if (this.maxTokens !== null && this.maxTokens !== undefined) {
        params.max_tokens = Number(this.maxTokens);
      }
      const model = this.selectedModelId === ''
        ? null
        : { id: this.selectedModelId, params };
      const stored = await this.settings.save(this.dashboardService.projectID, model);
      this.apply(stored);
      this.saved = true;
    } catch (e: any) {
      this.error = e?.status === 403
        ? 'LlmSettingsForbidden'
        : (e?.error?.error?.message ?? 'LlmSettingsSaveError');
    } finally {
      this.saving = false;
    }
  }
}
