import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

type ParseRequest = { city?: string; industry?: string; limit?: number; csvRows?: Record<string, string>[] };

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const clean = (value: unknown) => String(value ?? '').trim();
const keyOf = (row: Record<string, unknown>) => [row.company, row.website, row.phone, row.city].map(clean).join('|').toLowerCase();
const asRecord = (value: unknown): Record<string, unknown> => value && typeof value === 'object' ? value as Record<string, unknown> : {};
const readValue = (row: Record<string, unknown>, ...names: string[]) => {
  const raw = asRecord(row.raw_data);
  for (const name of names) {
    const value = row[name] ?? raw[name];
    if (value !== null && value !== undefined && clean(value) !== '') return value;
  }
  return undefined;
};
const numberValue = (value: unknown, fallback: number) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const enrichLead = (row: Record<string, unknown>) => {
  const company = clean(readValue(row, 'company', 'Company')) || 'Без названия';
  const industry = clean(readValue(row, 'industry', 'Industry')) || 'Не указано';
  const city = clean(readValue(row, 'city', 'City')) || 'Не указано';
  const website = clean(readValue(row, 'website', 'Website'));
  const phone = clean(readValue(row, 'phone', 'Phone'));
  const sourceUrl = clean(readValue(row, 'source_url', 'Source', 'source')) || 'csv-import';
  const hasWebsite = Boolean(website);
  const defaultWebsiteNeed = hasWebsite ? 72 : 92;
  const defaultSalesPotential = hasWebsite ? 74 : 68;
  const defaultBusinessActivity = phone || sourceUrl ? 76 : 60;
  const websiteNeedScore = numberValue(readValue(row, 'website_need_score', 'Website Need Score'), defaultWebsiteNeed);
  const salesPotential = numberValue(readValue(row, 'sales_potential', 'Sales Potential'), defaultSalesPotential);
  const businessActivity = numberValue(readValue(row, 'business_activity', 'Business Activity'), defaultBusinessActivity);
  const opportunityScore = numberValue(readValue(row, 'opportunity_score', 'Opportunity Score'), Math.round(websiteNeedScore * 0.5 + salesPotential * 0.3 + businessActivity * 0.2));
  const websiteStatus = clean(readValue(row, 'website_status', 'Website Status')).toUpperCase() || (hasWebsite ? 'AVERAGE' : 'NO WEBSITE');
  const priority = clean(readValue(row, 'priority', 'Priority')).toUpperCase() || (opportunityScore >= 80 ? 'A+' : opportunityScore >= 70 ? 'A' : 'B');
  const mainProblem = clean(readValue(row, 'main_problem', 'Main Problem')) || (hasWebsite
    ? `Сайт компании требует проверки и усиления конверсии в заявку для ниши «${industry}»`
    : `Нет собственного сайта — клиенты из города ${city} могут не находить компанию в поиске`);
  const whyThisLead = clean(readValue(row, 'why_this_lead', 'Why This Lead')) || (hasWebsite
    ? `${company} работает в нише «${industry}» в городе ${city}. Компания уже представлена в открытых источниках, поэтому улучшение сайта может помочь превратить текущий спрос в дополнительные заявки.`
    : `${company} работает в нише «${industry}» в городе ${city}. Компания найдена в открытых источниках, но собственного сайта в карточке не указано — это заметная точка роста для привлечения клиентов.`);
  const suggestedImprovement = clean(readValue(row, 'suggested_improvement', 'Suggested Improvement')) || (hasWebsite
    ? 'Проверить мобильную версию, сделать понятный первый экран, добавить явный призыв к действию, форму заявки и удобный блок контактов.'
    : 'Создать быстрый сайт с описанием услуг, преимуществами, контактами, картой и заметной кнопкой заявки или звонка.');
  const firstMessage = clean(readValue(row, 'first_message', 'First Message')) || (hasWebsite
    ? `Здравствуйте! Посмотрел представление ${company} в открытых источниках. Для компаний в нише «${industry}» сайт должен быстро объяснять предложение и приводить к заявке. Могу показать несколько точек роста для вашего сайта.`
    : `Здравствуйте! Нашёл ${company} в открытых источниках. Для бизнеса в нише «${industry}» собственный сайт помогает получать клиентов из поиска и сразу показывать услуги, цены и контакты. Могу предложить структуру такого сайта.`);
  const followUp1 = clean(readValue(row, 'follow_up_1', 'Follow-up 1')) || 'Добрый день! Продублирую предложение по улучшению сайта и привлечению заявок. Если актуально, покажу короткий вариант решения.';
  const followUp2 = clean(readValue(row, 'follow_up_2', 'Follow-up 2')) || 'Здравствуйте! Если вопрос сайта пока не в приоритете, сохраните контакт — буду рад помочь, когда задача станет актуальной.';
  const salesAngle = clean(readValue(row, 'sales_angle', 'Sales Angle')) || (hasWebsite
    ? 'Увеличение числа заявок через понятный сайт и удобный контакт с компанией'
    : 'Получение дополнительного спроса из поиска за счёт собственного сайта');
  const raw = {
    ...asRecord(row.raw_data),
    company, industry, city, website, phone,
    website_status: websiteStatus,
    website_need_score: websiteNeedScore,
    sales_potential: salesPotential,
    business_activity: businessActivity,
    opportunity_score: opportunityScore,
    priority,
    main_problem: mainProblem,
    why_this_lead: whyThisLead,
    suggested_improvement: suggestedImprovement,
    first_message: firstMessage,
    follow_up_1: followUp1,
    follow_up_2: followUp2,
    sales_angle: salesAngle,
  };

  return {
    company,
    industry,
    city,
    website: website || null,
    website_status: websiteStatus,
    phone: phone || null,
    email: clean(readValue(row, 'email', 'Email')) || null,
    address: clean(readValue(row, 'address', 'Address')) || null,
    source_url: sourceUrl,
    website_need_score: websiteNeedScore,
    sales_potential: salesPotential,
    business_activity: businessActivity,
    opportunity_score: opportunityScore,
    priority,
    main_problem: mainProblem,
    raw_data: raw,
    source_key: keyOf({ company, website, phone, city }),
  };
};

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
  if (request.method !== 'GET' && request.method !== 'POST') return json({ error: 'Use GET or POST' }, 405);
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    if (request.method === 'GET') {
      const requestedLimit = Number(new URL(request.url).searchParams.get('limit')) || 10000;
      const limit = Math.max(1, Math.min(10000, requestedLimit));
      const { data: leads, error } = await supabase.from('leads').select('*').order('parsed_at', { ascending: false }).limit(limit);
      if (error) throw error;
      return json({ leads: (leads ?? []).map((row) => enrichLead(row as Record<string, unknown>)) });
    }

    const payload = await request.json() as ParseRequest;
    const city = clean(payload.city) || 'Москва';
    const industry = clean(payload.industry) || 'B2B-компании';
    const limit = Math.max(1, Math.min(10000, Number(payload.limit) || 10000));
    const { data: run, error: runError } = await supabase.from('parser_runs').insert({ city, industry, requested_limit: limit, status: 'running' }).select().single();
    if (runError) throw runError;
    const configured = [Deno.env.get('DGIS_API_KEY'), Deno.env.get('YANDEX_MAPS_API_KEY'), Deno.env.get('GOOGLE_PLACES_API_KEY')].some(Boolean);
    const csvRows = Array.isArray(payload.csvRows) ? payload.csvRows : [];
    const providerRows = configured ? (await Promise.all([fetch2gis(city, industry), fetchYandex(city, industry), fetchGoogle(city, industry)])).flat() : [];
    const candidates = [...csvRows, ...providerRows].slice(0, limit * 3);
    const normalizedCandidates = candidates.map((row) => enrichLead(row));
    const keys = normalizedCandidates.map((row) => row.source_key);
    const { data: existing } = keys.length ? await supabase.from('leads').select('source_key').in('source_key', keys) : { data: [] };
    const existingKeys = new Set((existing ?? []).map((row: { source_key: string }) => row.source_key));
    const fresh = normalizedCandidates.filter((row) => !existingKeys.has(row.source_key)).slice(0, limit);
    if (fresh.length) await supabase.from('leads').insert(fresh);
    await supabase.from('parser_runs').update({ found_count: fresh.length, status: 'completed' }).eq('id', run.id);
    return json({ runId: run.id, requested: limit, found: fresh.length, providers: { dgis: Boolean(Deno.env.get('DGIS_API_KEY')), yandex: Boolean(Deno.env.get('YANDEX_MAPS_API_KEY')), google: Boolean(Deno.env.get('GOOGLE_PLACES_API_KEY')) }, leads: fresh });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Parser failed' }, 500);
  }
});
