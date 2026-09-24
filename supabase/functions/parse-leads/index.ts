import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type ParseRequest = { city?: string; industry?: string; limit?: number; csvRows?: Record<string, string>[] };

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const clean = (value: unknown) => String(value ?? '').trim();
const keyOf = (row: Record<string, unknown>) => [row.company, row.website, row.phone, row.city].map(clean).join('|').toLowerCase();

async function fetchGoogle(city: string, industry: string) {
  const key = Deno.env.get('GOOGLE_PLACES_API_KEY');
  if (!key) return [];
  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.googleMapsUri' },
    body: JSON.stringify({ textQuery: `${industry} ${city}`, languageCode: 'ru', maxResultCount: 20 }),
  });
  if (!response.ok) return [];
  const data = await response.json();
  return (data.places ?? []).map((place: Record<string, unknown>) => ({ company: (place.displayName as Record<string, string>)?.text, city, industry, address: place.formattedAddress, phone: place.nationalPhoneNumber, website: place.websiteUri, source_url: place.googleMapsUri, source: 'google_places' }));
}

async function fetch2gis(city: string, industry: string) {
  const key = Deno.env.get('DGIS_API_KEY');
  if (!key) return [];
  const url = `https://catalog.api.2gis.com/3.0/items?q=${encodeURIComponent(`${industry}, ${city}`)}&page_size=20&key=${encodeURIComponent(key)}`;
  const response = await fetch(url);
  if (!response.ok) return [];
  const data = await response.json();
  return (data.result?.items ?? []).map((item: Record<string, unknown>) => ({ company: item.name, city, industry, address: item.address_name, website: (item.contact_groups as unknown[])?.length ? undefined : undefined, source_url: `https://2gis.ru/${city}`, source: '2gis' }));
}

async function fetchYandex(city: string, industry: string) {
  const key = Deno.env.get('YANDEX_MAPS_API_KEY');
  if (!key) return [];
  const url = `https://search-maps.yandex.ru/v1/?text=${encodeURIComponent(`${industry}, ${city}`)}&type=biz&lang=ru_RU&results=20&apikey=${encodeURIComponent(key)}`;
  const response = await fetch(url);
  if (!response.ok) return [];
  const data = await response.json();
  return (data.features ?? []).map((feature: Record<string, unknown>) => ({ company: (feature.properties as Record<string, unknown>)?.name, city, industry, address: (feature.properties as Record<string, unknown>)?.description, source_url: 'https://yandex.ru/maps', source: 'yandex_maps' }));
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'Use POST' }, 405);
  try {
    const payload = await request.json() as ParseRequest;
    const city = clean(payload.city) || 'Москва';
    const industry = clean(payload.industry) || 'B2B-компании';
    const limit = Math.max(1, Math.min(1000, Number(payload.limit) || 50));
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: run, error: runError } = await supabase.from('parser_runs').insert({ city, industry, requested_limit: limit, status: 'running' }).select().single();
    if (runError) throw runError;
    const configured = [Deno.env.get('DGIS_API_KEY'), Deno.env.get('YANDEX_MAPS_API_KEY'), Deno.env.get('GOOGLE_PLACES_API_KEY')].some(Boolean);
    const csvRows = Array.isArray(payload.csvRows) ? payload.csvRows : [];
    const providerRows = configured ? (await Promise.all([fetch2gis(city, industry), fetchYandex(city, industry), fetchGoogle(city, industry)])).flat() : [];
    const candidates = [...csvRows, ...providerRows].slice(0, limit * 3);
    const keys = candidates.map(keyOf);
    const { data: existing } = keys.length ? await supabase.from('leads').select('source_key').in('source_key', keys) : { data: [] };
    const existingKeys = new Set((existing ?? []).map((row: { source_key: string }) => row.source_key));
    const fresh = candidates.filter((row) => !existingKeys.has(keyOf(row))).slice(0, limit).map((row) => ({ ...row, source_key: keyOf(row), source_url: clean(row.source_url) || 'csv-import', raw_data: row }));
    if (fresh.length) await supabase.from('leads').insert(fresh);
    await supabase.from('parser_runs').update({ found_count: fresh.length, status: 'completed' }).eq('id', run.id);
    return json({ runId: run.id, requested: limit, found: fresh.length, providers: { dgis: Boolean(Deno.env.get('DGIS_API_KEY')), yandex: Boolean(Deno.env.get('YANDEX_MAPS_API_KEY')), google: Boolean(Deno.env.get('GOOGLE_PLACES_API_KEY')) }, leads: fresh });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Parser failed' }, 500);
  }
});
