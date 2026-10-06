import { RuntimeModel, RuntimePricing } from '../../agent-chat/agent-chat-settings.service';

export interface ModelOption {
  id: string;
  label: string;
  group: string;
  searchText: string;
  disabled: boolean;
}

export interface OptionTexts {
  defaultMarker: string;
  curated: string;
  openRouter: string;
  priceUnknown: string;
  unavailable: string;
}

const num = (n: number): string => String(Number(n.toPrecision(3)));

export function formatPrice(pricing: RuntimePricing | null, priceUnknown: string): string {
  if (!pricing) { return priceUnknown; }
  return `$${num(pricing.input_per_mtok)} / $${num(pricing.output_per_mtok)}`;
}

export function formatContext(tokens: number | undefined): string | null {
  if (tokens === undefined || tokens === null) { return null; }
  if (tokens >= 1_000_000) { return `${Number((tokens / 1e6).toFixed(1))}M`; }
  return `${Math.round(tokens / 1000)}K`;
}

function describe(m: RuntimeModel, texts: OptionTexts): string {
  const ctx = formatContext(m.context_length);
  return [formatPrice(m.pricing, texts.priceUnknown), ctx].filter(s => !!s).join(' · ');
}

function option(id: string, label: string, group: string, m: RuntimeModel | null): ModelOption {
  const searchText = `${label} ${m ? m.id : id} ${m ? m.provider : ''}`.toLowerCase();
  return { id, label, group, searchText, disabled: false };
}

export function buildModelOptions(models: RuntimeModel[], storedId: string, texts: OptionTexts): ModelOption[] {
  const out: ModelOption[] = [];
  const def = models.find(m => m.default);
  if (def) {
    out.push(option('', `${def.label} — ${texts.defaultMarker} · ${describe(def, texts)}`, texts.curated, def));
  }
  if (storedId !== '' && storedId !== def?.id && !models.some(m => m.id === storedId)) {
    out.push({ id: storedId, label: `${storedId} (${texts.unavailable})`, group: texts.curated,
      searchText: storedId.toLowerCase(), disabled: true });
  }
  const rest = models.filter(m => !m.default);
  for (const m of rest.filter(x => x.group !== 'openrouter')) {
    out.push(option(m.id, `${m.label} · ${describe(m, texts)}`, texts.curated, m));
  }
  for (const m of rest.filter(x => x.group === 'openrouter')) {
    out.push(option(m.id, `${m.label} · ${describe(m, texts)}`, texts.openRouter, m));
  }
  return out;
}
