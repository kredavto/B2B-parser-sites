import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

type ParseRequest = { action?: string; url?: string; city?: string; industry?: string; limit?: number; csvRows?: Record<string, string>[] };

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

type AuditCheck = { name: string; ok: boolean; details: string };

const attr = (tag: string, name: string) => {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i'));
  return clean(match?.[1]);
};

const metaValue = (html: string, name: string) => {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    if (attr(tag, 'name').toLowerCase() === name.toLowerCase() || attr(tag, 'property').toLowerCase() === name.toLowerCase()) return attr(tag, 'content');
  }
  return '';
};

const visibleText = (html: string) => html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&amp;|&quot;|&#39;/gi, ' ').replace(/\s+/g, ' ').trim();
const check = (name: string, ok: boolean, details: string): AuditCheck => ({ name, ok, details });

const fetchText = async (url: string, timeoutMs = 8000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'B2B-Site-Audit/1.0 (+public website audit)' } });
    const text = await response.text();
    return { response, text };
  } finally {
    clearTimeout(timer);
  }
};

const isPublicHttpUrl = (value: string) => {
  let parsed: URL;
  try { parsed = new URL(value); } catch { return false; }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) return false;
  const host = parsed.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local') || host === '::1' || host === '0.0.0.0') return false;
  const parts = host.split('.').map(Number);
  if (parts.length === 4 && parts.every(Number.isFinite)) {
    const [a, b] = parts;
    if (a === 10 || a === 127 || a === 169 && b === 254 || a === 192 && b === 168 || a === 172 && b >= 16 && b <= 31) return false;
  }
  return true;
};

async function auditSite(rawUrl: string) {
  const url = rawUrl.trim().match(/^https?:\/\//i) ? rawUrl.trim() : `https://${rawUrl.trim()}`;
  if (url.length > 500 || !isPublicHttpUrl(url)) throw new Error('Укажите публичный URL сайта с протоколом http или https');
  const started = Date.now();
  const parsedUrl = new URL(url);
  const { response, text: html } = await fetchText(url, 12000);
  const finalUrl = response.url || url;
  const limitedHtml = html.slice(0, 2_000_000);
  const lower = limitedHtml.toLowerCase();
  const title = (limitedHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const description = metaValue(limitedHtml, 'description');
  const h1Count = (limitedHtml.match(/<h1\b/gi) || []).length;
  const headings = (limitedHtml.match(/<h[1-3]\b/gi) || []).length;
  const canonical = /<link\b[^>]*rel=["'][^"']*canonical[^"']*["']/i.test(limitedHtml);
  const viewport = Boolean(metaValue(limitedHtml, 'viewport'));
  const noindex = /<meta\b[^>]*(?:name|property)=["']robots["'][^>]*content=["'][^"']*noindex/i.test(limitedHtml);
  const jsonLd = [...limitedHtml.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1]);
  const hasOrgSchema = jsonLd.some(item => /Organization|LocalBusiness|ProfessionalService/i.test(item));
  const hasLocalSchema = jsonLd.some(item => /LocalBusiness|PostalAddress/i.test(item));
  const bodyText = visibleText(limitedHtml);
  const images = [...limitedHtml.matchAll(/<img\b[^>]*>/gi)].map(match => match[0]);
  const imagesWithoutAlt = images.filter(image => !attr(image, 'alt')).length;
  const internalLinks = [...limitedHtml.matchAll(/<a\b[^>]+href=["']([^"']+)["']/gi)].filter(match => {
    try { const link = new URL(match[1], finalUrl); return link.hostname === new URL(finalUrl).hostname; } catch { return false; }
  }).length;
  const origin = new URL(finalUrl).origin;
  const [robotsResult, sitemapResult, llmsResult] = await Promise.all([
    fetchText(`${origin}/robots.txt`, 5000).catch(() => null),
    fetchText(`${origin}/sitemap.xml`, 5000).catch(() => null),
    fetchText(`${origin}/llms.txt`, 5000).catch(() => null),
  ]);
  const hasRobots = Boolean(robotsResult?.response.ok);
  const hasSitemap = Boolean(sitemapResult?.response.ok && /<urlset|<sitemapindex/i.test(sitemapResult?.text || ''));
  const hasLlms = Boolean(llmsResult?.response.ok && clean(llmsResult?.text).length > 40);
  const phoneVisible = /(?:\+?7|8)[\s()-]?\d{3}[\s()-]?\d{2,3}[\s-]?\d{2}[\s-]?\d{2}/.test(bodyText);
  const addressVisible = /\b(?:ул\.?|улица|проспект|шоссе|дом|г\.?\s*[А-ЯA-Z])/i.test(bodyText);
  const faqSignals = /faq|часто задаваем|вопросы и ответы|<details\b/i.test(lower);
  const aboutSignals = /о компании|о нас|наша команда|сертификат|лицензи|гаранти|отзыв/i.test(bodyText.toLowerCase());
  const seoChecks = [
    check('Title', title.length >= 30 && title.length <= 60, title ? `${title.length} символов: «${title.slice(0, 90)}»` : 'Заголовок страницы не найден'),
    check('Meta description', description.length >= 70 && description.length <= 160, description ? `${description.length} символов` : 'Описание страницы не найдено'),
    check('Один H1', h1Count === 1, `Найдено H1: ${h1Count}`),
    check('Viewport', viewport, viewport ? 'Мобильная область просмотра задана' : 'Нет meta viewport'),
    check('Canonical', canonical, canonical ? 'Канонический URL задан' : 'Нет canonical-ссылки'),
    check('Индексация', !noindex, noindex ? 'Обнаружен запрет noindex' : 'Явного noindex нет'),
    check('Изображения alt', images.length === 0 || imagesWithoutAlt / images.length <= 0.2, images.length ? `${imagesWithoutAlt} из ${images.length} изображений без alt` : 'Изображения не найдены'),
    check('Структурированные данные', jsonLd.length > 0, jsonLd.length ? `JSON-LD блоков: ${jsonLd.length}` : 'JSON-LD не найден'),
    check('robots.txt', hasRobots, hasRobots ? 'Файл доступен' : 'Файл не найден или недоступен'),
    check('sitemap.xml', hasSitemap, hasSitemap ? 'Карта сайта доступна' : 'Карта сайта не найдена'),
  ];
  const geoChecks = [
    check('Организация в Schema.org', hasOrgSchema, hasOrgSchema ? 'Найдена Organization/LocalBusiness разметка' : 'Нет Organization/LocalBusiness в JSON-LD'),
    check('Локальные данные', phoneVisible && addressVisible, phoneVisible && addressVisible ? 'Телефон и адрес видны в тексте страницы' : 'Не удалось найти одновременно телефон и адрес'),
    check('Понятная сущность и услуга', title.length > 0 && headings > 0, title && headings ? 'Есть title и иерархия заголовков' : 'Недостаточно явных сигналов о тематике страницы'),
    check('FAQ-сигналы', faqSignals, faqSignals ? 'Найдены FAQ/вопросы и ответы' : 'FAQ-блок или FAQ-разметка не найдены'),
    check('Доверие и опыт', aboutSignals, aboutSignals ? 'Есть сигналы опыта, команды, гарантий или отзывов' : 'Слабые E-E-A-T-сигналы на странице'),
    check('AI-контекст', hasLlms, hasLlms ? 'llms.txt доступен' : 'llms.txt не найден; добавьте краткое описание компании и услуг для AI-поиска'),
  ];
  const seoScore = Math.round(seoChecks.filter(item => item.ok).length / seoChecks.length * 100);
  const geoScore = Math.round(geoChecks.filter(item => item.ok).length / geoChecks.length * 100);
  const websiteNeedScore = Math.min(100, Math.max(20, 35 + Math.round((100 - seoScore) * 0.45) + (response.status >= 400 ? 25 : 0) + (!viewport ? 10 : 0)));
  const salesPotential = Math.min(100, Math.max(20, 45 + Math.round(geoScore * 0.25 + seoScore * 0.2)));
  const businessActivity = response.ok ? 78 : 35;
  const opportunityScore = Math.round(websiteNeedScore * 0.5 + salesPotential * 0.3 + businessActivity * 0.2);
  const company = title.split(/[|–—-]/)[0].trim() || parsedUrl.hostname.replace(/^www\./, '');
  const weakest = seoScore <= geoScore ? 'SEO' : 'GEO';
  const mainProblem = response.status >= 400 ? `Сайт отвечает с ошибкой HTTP ${response.status} и теряет поисковый трафик.` : `Основная зона роста — ${weakest}: сайт недостаточно подготовлен к поисковой выдаче и ответам AI-систем.`;
  const suggestedImprovement = `${seoChecks.filter(item => !item.ok).slice(0, 3).map(item => item.name).join(', ') || 'технические сигналы'}; затем усилить ${geoChecks.filter(item => !item.ok).slice(0, 2).map(item => item.name).join(' и ') || 'структурированные данные и доверие'}.`;
  return {
    url, finalUrl, company, status: response.status, responseTimeMs: Date.now() - started, pageSize: new TextEncoder().encode(html).length,
    opportunityScore, websiteNeedScore, salesPotential, businessActivity, priority: opportunityScore >= 80 ? 'A+' : opportunityScore >= 70 ? 'A' : 'B',
    mainProblem,
    whyThisLead: `${company} уже имеет доступный сайт, но его SEO-оценка ${seoScore}/100 и GEO-оценка ${geoScore}/100 показывают конкретный резерв для роста органического спроса и AI-видимости.`,
    suggestedImprovement: suggestedImprovement.charAt(0).toUpperCase() + suggestedImprovement.slice(1),
    firstMessage: `Здравствуйте! Провёл экспресс-аудит сайта ${company}. Нашёл точки роста в SEO/GEO, которые могут улучшить видимость в поиске и увеличить количество обращений. Могу прислать приоритетный список исправлений.`,
    followUp1: 'Добрый день! В аудите есть несколько быстрых правок: метаданные, структурированные данные и блоки доверия. Готов показать, что даст наибольший эффект первым.',
    followUp2: 'Здравствуйте! Если задача продвижения сайта актуальна, могу подготовить короткий план SEO/GEO-улучшений с оценкой приоритетов.',
    seo: { score: seoScore, checks: seoChecks }, geo: { score: geoScore, checks: geoChecks },
    technical: { https: new URL(finalUrl).protocol === 'https:', hasViewport: viewport, h1Count, internalLinks, images: images.length, imagesWithoutAlt, hasSitemap, hasRobots },
  };
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
    if (payload.action === 'audit') return json(await auditSite(clean(payload.url)));
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
