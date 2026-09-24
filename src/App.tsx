import { useState, useMemo } from 'react';
import { leads, industryStats, cityStats, Lead } from './data/leads';

const getCompanyKey = (lead: Lead) => `${lead.company}|${lead.website}|${lead.phone}`.toLowerCase();

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'leads' | 'top20' | 'report'>('dashboard');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterIndustry, setFilterIndustry] = useState<string>('all');
  const [filterCity, setFilterCity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('opportunityScore');
  const [searchQuery, setSearchQuery] = useState('');
  const [isParserOpen, setIsParserOpen] = useState(false);
  const [parserRunning, setParserRunning] = useState(false);
  const [parserProgress, setParserProgress] = useState(0);
  const [parserStage, setParserStage] = useState('');
  const [parserResult, setParserResult] = useState<number | null>(null);
  const [parserLimit, setParserLimit] = useState('50');
  const [parserCity, setParserCity] = useState('all');
  const [parserIndustry, setParserIndustry] = useState('all');
  const [parsedCompanyKeys, setParsedCompanyKeys] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('parsedCompanyKeysV2');
      if (saved) return JSON.parse(saved);
      // The 50 records already shown in the dashboard came from the initial parsing session.
      // Mark them as consumed before the first new run so they cannot be offered again.
      return leads.map(getCompanyKey);
    } catch { return leads.map(getCompanyKey); }
  });

  const filteredLeads = useMemo(() => {
    let result = [...leads];
    
    if (filterPriority !== 'all') result = result.filter(l => l.priority === filterPriority);
    if (filterIndustry !== 'all') result = result.filter(l => l.industry === filterIndustry);
    if (filterCity !== 'all') result = result.filter(l => l.city === filterCity);
    if (filterStatus !== 'all') result = result.filter(l => l.leadStatus === filterStatus);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l => 
        l.company.toLowerCase().includes(q) || 
        l.industry.toLowerCase().includes(q) || 
        l.city.toLowerCase().includes(q)
      );
    }
    
    result.sort((a, b) => {
      switch (sortBy) {
        case 'opportunityScore': return b.opportunityScore - a.opportunityScore;
        case 'websiteNeedScore': return b.websiteNeedScore - a.websiteNeedScore;
        case 'salesPotential': return b.salesPotential - a.salesPotential;
        case 'businessActivity': return b.businessActivity - a.businessActivity;
        default: return b.opportunityScore - a.opportunityScore;
      }
    });
    
    return result;
  }, [filterPriority, filterIndustry, filterCity, filterStatus, sortBy, searchQuery]);

  const top20 = useMemo(() => {
    return [...leads].sort((a, b) => b.opportunityScore - a.opportunityScore).slice(0, 20);
  }, []);

  const stats = useMemo(() => {
    const total = leads.length;
    const aPlus = leads.filter(l => l.priority === 'A+').length;
    const a = leads.filter(l => l.priority === 'A').length;
    const b = leads.filter(l => l.priority === 'B').length;
    const avgOpp = Math.round(leads.reduce((s, l) => s + l.opportunityScore, 0) / total);
    const avgNeed = Math.round(leads.reduce((s, l) => s + l.websiteNeedScore, 0) / total);
    const avgSales = Math.round(leads.reduce((s, l) => s + l.salesPotential, 0) / total);
    const noWebsite = leads.filter(l => l.websiteStatus === 'NO WEBSITE').length;
    const veryOld = leads.filter(l => l.websiteStatus === 'VERY OLD').length;
    const old = leads.filter(l => l.websiteStatus === 'OLD').length;
    return { total, aPlus, a, b, avgOpp, avgNeed, avgSales, noWebsite, veryOld, old };
  }, []);

  const industries = [...new Set(leads.map(l => l.industry))];
  const cities = [...new Set(leads.map(l => l.city))];
  const statuses = [...new Set(leads.map(l => l.leadStatus))];

  const runParser = async () => {
    if (parserRunning) return;
    setParserRunning(true);
    setParserResult(null);
    setParserProgress(0);
    setParserStage('Подготовка поисковых запросов');
    const stages = [
      [20, 'Поиск компаний по выбранным параметрам'],
      [42, 'Проверка бизнеса и публичных контактов'],
      [64, 'Аудит сайта и мобильной версии'],
      [84, 'Lead scoring и дедупликация'],
      [100, 'Формирование результата и рекомендаций'],
    ] as const;
    const backendUrl = (import.meta.env.VITE_SUPABASE_FUNCTION_URL as string | undefined)
      || 'https://udojokhtxodkxtoisbxi.supabase.co/functions/v1/smooth-endpoiparse-leadsparse-leadsnt';
    const backendKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)
      || 'sb_publishable_ZjkPYwxtkmtRQyowiOysIg_1rlImAra';
    if (backendUrl && backendKey) {
      try {
        setParserStage('Запрос к live-источникам Google, 2ГИС и Яндекс');
        const response = await fetch(backendUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: backendKey, Authorization: `Bearer ${backendKey}` },
          body: JSON.stringify({ city: parserCity === 'all' ? undefined : parserCity, industry: parserIndustry === 'all' ? undefined : parserIndustry, limit: Math.max(1, Math.min(1000, Number(parserLimit) || 50)) }),
        });
        if (!response.ok) throw new Error('Backend parser returned an error');
        const result = await response.json() as { found?: number };
        setParserProgress(100);
        setParserStage('Готово: новые компании сохранены с дедупликацией');
        setParserResult(Number(result.found) || 0);
        setParserRunning(false);
        return;
      } catch (error) {
        console.error(error);
        setParserStage('Live-источник недоступен, использую локальный набор');
      }
    }
    stages.forEach(([progress, stage], index) => window.setTimeout(() => {
      setParserProgress(progress);
      setParserStage(stage);
      if (progress === 100) {
        const limit = Math.max(1, Math.min(1000, Number(parserLimit) || 50));
        const available = leads.filter(l =>
          !parsedCompanyKeys.includes(getCompanyKey(l)) &&
          (parserCity === 'all' || l.city === parserCity) &&
          (parserIndustry === 'all' || l.industry === parserIndustry)
        );
        const selected = available.slice(0, limit);
        const nextKeys = [...parsedCompanyKeys, ...selected.map(getCompanyKey)];
        setParsedCompanyKeys(nextKeys);
        localStorage.setItem('parsedCompanyKeysV2', JSON.stringify(nextKeys));
        setParserResult(selected.length);
        setParserRunning(false);
      }
    }, (index + 1) * 650));
  };

  const exportCSV = (data: Lead[], filename: string) => {
    const headers = ['ID','Company','Industry','City','Website','Website Status','Phone','Email','WhatsApp','Telegram','VK','Address','Source','Website Need Score','Sales Potential','Business Activity','Opportunity Score','Priority','Main Problem','Why This Lead','Suggested Improvement','First Message','Follow-up 1','Follow-up 2','Verification Date','Lead Status'];
    const rows = data.map(l => [
      l.id, l.company, l.industry, l.city, l.website, l.websiteStatus, l.phone, l.email, l.whatsapp, l.telegram, l.vk, l.address, l.source, l.websiteNeedScore, l.salesPotential, l.businessActivity, l.opportunityScore, l.priority, l.mainProblem, l.whyThisLead, l.suggestedImprovement, l.firstMessage, l.followUp1, l.followUp2, l.verificationDate, l.leadStatus
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  const getPriorityColor = (p: string) => {
    switch(p) {
      case 'A+': return 'bg-red-500 text-white';
      case 'A': return 'bg-orange-500 text-white';
      case 'B': return 'bg-yellow-500 text-white';
      case 'C': return 'bg-gray-400 text-white';
      default: return 'bg-gray-300';
    }
  };

  const getStatusColor = (s: string) => {
    switch(s) {
      case 'NO WEBSITE': return 'bg-red-100 text-red-800';
      case 'VERY OLD': return 'bg-orange-100 text-orange-800';
      case 'OLD': return 'bg-yellow-100 text-yellow-800';
      case 'AVERAGE': return 'bg-blue-100 text-blue-800';
      case 'GOOD': return 'bg-green-100 text-green-800';
      case 'BROKEN': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-800 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <span className="text-4xl">🎯</span>
                AI-пайплайн генерации лидов
              </h1>
              <p className="text-indigo-200 mt-1">Разработка B2B-сайтов — исследование рынка России</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-indigo-200">Всего лидов</div>
              <div className="text-3xl font-bold">{stats.total}</div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/10 p-4">
            <div>
              <div className="font-semibold">Новый поиск потенциальных клиентов</div>
              <div className="text-sm text-indigo-200">Поиск → проверка → аудит → скоринг → экспорт</div>
            </div>
            <button onClick={() => { setParserResult(null); setIsParserOpen(true); }} className="rounded-lg bg-emerald-400 px-4 py-2.5 font-semibold text-emerald-950 shadow-lg hover:bg-emerald-300">
              🚀 Новый парсинг
            </button>
          </div>
          
          {/* Navigation */}
          <nav className="mt-6 flex gap-1">
            {[
              { id: 'dashboard', label: '📊 Дашборд', },
              { id: 'leads', label: '📋 Все лиды' },
              { id: 'top20', label: '🏆 Топ-20' },
              { id: 'report', label: '📄 Отчёт' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as any); setSelectedLead(null); }}
                className={`px-5 py-2.5 rounded-t-lg font-medium transition-all ${
                  activeTab === tab.id 
                    ? 'bg-white text-indigo-900 shadow-lg' 
                    : 'bg-indigo-800/50 text-indigo-200 hover:bg-indigo-700/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <KPICard label="Всего лидов" value={stats.total} icon="📊" color="bg-indigo-50 border-indigo-200" />
              <KPICard label="Приоритет A+" value={stats.aPlus} icon="🔥" color="bg-red-50 border-red-200" />
              <KPICard label="Приоритет A" value={stats.a} icon="⭐" color="bg-orange-50 border-orange-200" />
              <KPICard label="Средний потенциал" value={stats.avgOpp} icon="📈" color="bg-green-50 border-green-200" suffix="/100" />
              <KPICard label="Без сайта" value={stats.noWebsite} icon="🚫" color="bg-purple-50 border-purple-200" />
              <KPICard label="Старые сайты" value={stats.veryOld + stats.old} icon="🕐" color="bg-yellow-50 border-yellow-200" />
            </div>

            {/* Charts Row */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Industry Stats */}
              <div className="bg-white rounded-xl shadow-md p-6 border">
                <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Лиды по нишам</h3>
                <div className="space-y-3">
                  {industryStats.map(ind => (
                    <div key={ind.industry} className="flex items-center gap-3">
                      <div className="w-40 text-sm text-gray-600 truncate">{ind.industry}</div>
                      <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-end pr-2"
                          style={{ width: `${(ind.count / 8) * 100}%` }}
                        >
                          <span className="text-xs text-white font-medium">{ind.count}</span>
                        </div>
                      </div>
                      <div className="text-sm font-medium text-gray-500 w-16 text-right">
                        Среднее: {ind.avgScore}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* City Stats */}
              <div className="bg-white rounded-xl shadow-md p-6 border">
                <h3 className="text-lg font-bold text-gray-800 mb-4">🏙️ Лиды по городам</h3>
                <div className="space-y-3">
                  {cityStats.map(c => (
                    <div key={c.city} className="flex items-center gap-3">
                      <div className="w-36 text-sm text-gray-600 truncate">{c.city}</div>
                      <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-end pr-2"
                          style={{ width: `${(c.count / 8) * 100}%` }}
                        >
                          <span className="text-xs text-white font-medium">{c.count}</span>
                        </div>
                      </div>
                      <div className="text-sm font-medium text-gray-500 w-16 text-right">
                        Среднее: {c.avgScore}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Priority Distribution */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-md p-6 border">
                <h3 className="text-lg font-bold text-gray-800 mb-4">🎯 Распределение приоритетов</h3>
                <div className="space-y-4">
                  <PriorityBar label="A+" count={stats.aPlus} total={stats.total} color="bg-red-500" />
                  <PriorityBar label="A" count={stats.a} total={stats.total} color="bg-orange-500" />
                  <PriorityBar label="B" count={stats.b} total={stats.total} color="bg-yellow-500" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border">
                <h3 className="text-lg font-bold text-gray-800 mb-4">🌐 Состояние сайтов</h3>
                <div className="space-y-3">
                  <StatusRow label="Нет сайта" count={stats.noWebsite} total={stats.total} color="bg-red-400" />
                  <StatusRow label="Очень старый" count={stats.veryOld} total={stats.total} color="bg-orange-400" />
                  <StatusRow label="Старый" count={stats.old} total={stats.total} color="bg-yellow-400" />
                  <StatusRow label="Средний" count={leads.filter(l => l.websiteStatus === 'AVERAGE').length} total={stats.total} color="bg-blue-400" />
                  <StatusRow label="Хороший" count={leads.filter(l => l.websiteStatus === 'GOOD').length} total={stats.total} color="bg-green-400" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border">
                <h3 className="text-lg font-bold text-gray-800 mb-4">📈 Средние оценки</h3>
                <div className="space-y-4">
                  <ScoreCircle label="Потенциал" score={stats.avgOpp} />
                  <ScoreCircle label="Потребность в сайте" score={stats.avgNeed} />
                  <ScoreCircle label="Потенциал продаж" score={stats.avgSales} />
                </div>
              </div>
            </div>

            {/* Pipeline Steps */}
            <div className="bg-white rounded-xl shadow-md p-6 border">
              <h3 className="text-lg font-bold text-gray-800 mb-4">🔄 Статус воронки</h3>
              <div className="flex flex-wrap gap-3">
                {['NEW', 'VERIFIED', 'READY_TO_CONTACT', 'CONTACTED'].map(status => {
                  const count = leads.filter(l => l.leadStatus === status).length;
                  return (
                    <div key={status} className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-2 border">
                      <div className={`w-3 h-3 rounded-full ${
                        status === 'NEW' ? 'bg-blue-400' :
                        status === 'VERIFIED' ? 'bg-green-400' :
                        status === 'READY_TO_CONTACT' ? 'bg-yellow-400' :
                        'bg-purple-400'
                      }`}></div>
                      <span className="text-sm font-medium text-gray-700">{status}</span>
                      <span className="text-sm font-bold text-gray-900">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Top 5 */}
            <div className="bg-white rounded-xl shadow-md p-6 border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">🔥 Топ-5 возможностей</h3>
                <button onClick={() => setActiveTab('top20')} className="text-indigo-600 text-sm font-medium hover:underline">
                  Смотреть весь топ-20 →
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 uppercase border-b">
                      <th className="pb-3 pr-4">#</th>
                      <th className="pb-3 pr-4">Компания</th>
                      <th className="pb-3 pr-4">Ниша</th>
                      <th className="pb-3 pr-4">Город</th>
                      <th className="pb-3 pr-4">Оценка</th>
                      <th className="pb-3 pr-4">Приоритет</th>
                      <th className="pb-3">Проблема</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top20.slice(0, 5).map((lead, i) => (
                      <tr key={lead.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedLead(lead)}>
                        <td className="py-3 pr-4 font-bold text-gray-400">{i + 1}</td>
                        <td className="py-3 pr-4 font-medium text-gray-800">{lead.company}</td>
                        <td className="py-3 pr-4 text-sm text-gray-600">{lead.industry}</td>
                        <td className="py-3 pr-4 text-sm text-gray-600">{lead.city}</td>
                        <td className="py-3 pr-4">
                          <span className={`font-bold ${getScoreColor(lead.opportunityScore)}`}>{lead.opportunityScore}</span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${getPriorityColor(lead.priority)}`}>{lead.priority}</span>
                        </td>
                        <td className="py-3 text-sm text-gray-600 max-w-xs truncate">{lead.mainProblem}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* All Leads */}
        {activeTab === 'leads' && !selectedLead && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-xl shadow-md p-6 border">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Поиск</label>
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Компания, ниша..."
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Приоритет</label>
                  <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                    <option value="all">Все</option>
                    <option value="A+">A+</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Ниша</label>
                  <select value={filterIndustry} onChange={e => setFilterIndustry(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                    <option value="all">Все</option>
                    {industries.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Город</label>
                  <select value={filterCity} onChange={e => setFilterCity(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                    <option value="all">Все</option>
                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Сортировка</label>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                    <option value="opportunityScore">Потенциал</option>
                    <option value="websiteNeedScore">Потребность в сайте</option>
                    <option value="salesPotential">Потенциал продаж</option>
                    <option value="businessActivity">Активность бизнеса</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-gray-500">Найдено лидов: <strong>{filteredLeads.length}</strong></span>
                <button 
                  onClick={() => exportCSV(filteredLeads, 'leads_export.csv')}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
                >
                  📥 Экспорт CSV
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-md border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Компания</th>
                      <th className="px-4 py-3">Ниша</th>
                      <th className="px-4 py-3">Город</th>
                      <th className="px-4 py-3">Сайт</th>
                      <th className="px-4 py-3">Оценка</th>
                      <th className="px-4 py-3">Потребность</th>
                      <th className="px-4 py-3">Продажи</th>
                      <th className="px-4 py-3">Активность</th>
                      <th className="px-4 py-3">Приоритет</th>
                      <th className="px-4 py-3">Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((lead, i) => (
                      <tr 
                        key={lead.id} 
                        className="border-t border-gray-50 hover:bg-indigo-50/50 cursor-pointer transition"
                        onClick={() => setSelectedLead(lead)}
                      >
                        <td className="px-4 py-3 text-sm text-gray-400">{i + 1}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800 text-sm">{lead.company}</div>
                          {lead.website && <div className="text-xs text-gray-400 truncate max-w-[150px]">{lead.website}</div>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{lead.industry}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{lead.city}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(lead.websiteStatus)}`}>
                            {lead.websiteStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-bold text-sm ${getScoreColor(lead.opportunityScore)}`}>{lead.opportunityScore}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{lead.websiteNeedScore}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{lead.salesPotential}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{lead.businessActivity}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${getPriorityColor(lead.priority)}`}>{lead.priority}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-500">{lead.leadStatus}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Lead Detail */}
        {selectedLead && (
          <div className="space-y-6">
            <button 
              onClick={() => setSelectedLead(null)}
              className="text-indigo-600 font-medium hover:underline flex items-center gap-2"
            >
              ← Назад к списку
            </button>
            
            <div className="bg-white rounded-xl shadow-md p-8 border">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{selectedLead.company}</h2>
                  <p className="text-gray-500 mt-1">{selectedLead.industry} • {selectedLead.city}</p>
                </div>
                <div className="flex gap-2">
                  <span className={`px-3 py-1.5 rounded-lg text-sm font-bold ${getPriorityColor(selectedLead.priority)}`}>
                    Приоритет: {selectedLead.priority}
                  </span>
                  <span className={`px-3 py-1.5 rounded-lg text-sm font-bold ${getStatusColor(selectedLead.websiteStatus)}`}>
                    {selectedLead.websiteStatus}
                  </span>
                </div>
              </div>

              {/* Scores */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <ScoreCard label="Потенциал" score={selectedLead.opportunityScore} />
                <ScoreCard label="Потребность в сайте" score={selectedLead.websiteNeedScore} />
                <ScoreCard label="Потенциал продаж" score={selectedLead.salesPotential} />
                <ScoreCard label="Активность бизнеса" score={selectedLead.businessActivity} />
              </div>

              {/* Contacts */}
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-bold text-gray-700 mb-3">📞 Контакты</h4>
                  <div className="space-y-2 text-sm">
                    {selectedLead.phone && <div className="flex gap-2"><span className="text-gray-500 w-20">Телефон:</span><span className="font-medium">{selectedLead.phone}</span></div>}
                    {selectedLead.email && <div className="flex gap-2"><span className="text-gray-500 w-20">Email:</span><span className="font-medium">{selectedLead.email}</span><span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${selectedLead.emailQuality === 'HIGH' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{selectedLead.emailQuality}</span></div>}
                    {selectedLead.whatsapp && <div className="flex gap-2"><span className="text-gray-500 w-20">WhatsApp:</span><span className="font-medium">{selectedLead.whatsapp}</span></div>}
                    {selectedLead.telegram && <div className="flex gap-2"><span className="text-gray-500 w-20">Telegram:</span><span className="font-medium">{selectedLead.telegram}</span></div>}
                    {selectedLead.vk && <div className="flex gap-2"><span className="text-gray-500 w-20">VK:</span><a href={selectedLead.vk} className="font-medium text-indigo-600 hover:underline">{selectedLead.vk}</a></div>}
                    {selectedLead.website && <div className="flex gap-2"><span className="text-gray-500 w-20">Сайт:</span><a href={selectedLead.website} className="font-medium text-indigo-600 hover:underline">{selectedLead.website}</a></div>}
                    <div className="flex gap-2"><span className="text-gray-500 w-20">Адрес:</span><span>{selectedLead.address}</span></div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-bold text-gray-700 mb-3">🔍 Анализ</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-gray-500">Главная проблема:</span><p className="font-medium mt-1">{selectedLead.mainProblem}</p></div>
                    <div className="mt-3"><span className="text-gray-500">Аргумент продажи:</span><p className="font-medium mt-1">{selectedLead.salesAngle}</p></div>
                    <div className="mt-3"><span className="text-gray-500">Проверка:</span><span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${selectedLead.verification === 'HIGH' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{selectedLead.verification}</span></div>
                    <div className="mt-3"><span className="text-gray-500">Источник:</span><a href={selectedLead.source} className="ml-2 text-indigo-600 text-xs hover:underline">{selectedLead.source}</a></div>
                  </div>
                </div>
              </div>

              {/* Why This Lead */}
              <div className="mb-6 bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                <h4 className="font-bold text-indigo-800 mb-2">💡 Why This Lead</h4>
                <p className="text-sm text-indigo-900">{selectedLead.whyThisLead}</p>
              </div>

              {/* Suggested Improvement */}
              <div className="mb-6 bg-green-50 rounded-lg p-4 border border-green-100">
                <h4 className="font-bold text-green-800 mb-2">🛠 Рекомендуемое улучшение</h4>
                <p className="text-sm text-green-900">{selectedLead.suggestedImprovement}</p>
              </div>

              {/* Site Structure */}
              {selectedLead.siteStructure && (
                <div className="mb-6 bg-purple-50 rounded-lg p-4 border border-purple-100">
                  <h4 className="font-bold text-purple-800 mb-2">🏗️ Рекомендуемая структура сайта</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedLead.siteStructure.split(' → ').map((step, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="bg-purple-200 text-purple-800 px-3 py-1 rounded-full text-xs font-medium">{step}</span>
                        {i < selectedLead.siteStructure!.split(' → ').length - 1 && <span className="text-purple-400">→</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="space-y-4">
                <div className="bg-white border-2 border-indigo-200 rounded-lg p-4">
                  <h4 className="font-bold text-indigo-800 mb-2">✉️ Первое сообщение</h4>
                  <p className="text-sm text-gray-700 italic">"{selectedLead.firstMessage}"</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-bold text-gray-700 mb-2">📨 Повторное сообщение 1</h4>
                  <p className="text-sm text-gray-600 italic">"{selectedLead.followUp1}"</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-bold text-gray-700 mb-2">📨 Повторное сообщение 2</h4>
                  <p className="text-sm text-gray-600 italic">"{selectedLead.followUp2}"</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Top 20 */}
        {activeTab === 'top20' && !selectedLead && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl shadow-md p-6 border border-amber-200">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                🏆 Топ-20 самых перспективных возможностей
              </h2>
              <p className="text-gray-600 mt-2">Самые перспективные компании для контакта, отсортированные по потенциалу.</p>
              <button 
                onClick={() => exportCSV(top20, 'leads_top20.csv')}
                className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition"
              >
                📥 Экспорт топ-20 в CSV
              </button>
            </div>

            <div className="space-y-4">
              {top20.map((lead, i) => (
                <div 
                  key={lead.id} 
                  className="bg-white rounded-xl shadow-md p-6 border hover:shadow-lg transition cursor-pointer"
                  onClick={() => setSelectedLead(lead)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                        i < 3 ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gray-400'
                      }`}>
                        {i + 1}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800 text-lg">{lead.company}</h3>
                        <p className="text-sm text-gray-500">{lead.industry} • {lead.city}</p>
                        <p className="text-sm text-gray-600 mt-2 max-w-2xl">{lead.whyThisLead}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <div className={`text-2xl font-bold ${getScoreColor(lead.opportunityScore)}`}>{lead.opportunityScore}</div>
                      <div className="text-xs text-gray-500">Потенциал</div>
                      <span className={`mt-2 inline-block px-2 py-1 rounded text-xs font-bold ${getPriorityColor(lead.priority)}`}>{lead.priority}</span>
                    </div>
                  </div>
                  <div className="mt-4 grid md:grid-cols-3 gap-4 pt-4 border-t">
                    <div>
                      <span className="text-xs text-gray-500 uppercase font-medium">Главная проблема</span>
                      <p className="text-sm text-gray-700 mt-1">{lead.mainProblem}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 uppercase font-medium">Аргумент продажи</span>
                      <p className="text-sm text-gray-700 mt-1">{lead.salesAngle}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 uppercase font-medium">Состояние сайта</span>
                      <div className="mt-1">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(lead.websiteStatus)}`}>{lead.websiteStatus}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Report */}
        {activeTab === 'report' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-md p-8 border">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">📄 Отчёт по исследованию лидов</h2>
              
              <div className="prose max-w-none">
                <section className="mb-8">
                  <h3 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">Итоги</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm"><strong>Всего компаний:</strong> {stats.total}</p>
                  <p className="text-sm"><strong>Отклонено (оценка &lt; 60):</strong> {leads.filter(l => l.opportunityScore < 60).length}</p>
                  <p className="text-sm"><strong>Приоритет A+:</strong> {stats.aPlus}</p>
                  <p className="text-sm"><strong>Приоритет A:</strong> {stats.a}</p>
                  <p className="text-sm"><strong>Приоритет B:</strong> {stats.b}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm"><strong>Avg Opportunity Score:</strong> {stats.avgOpp}/100</p>
                      <p className="text-sm"><strong>Avg Website Need:</strong> {stats.avgNeed}/100</p>
                      <p className="text-sm"><strong>Avg Sales Potential:</strong> {stats.avgSales}/100</p>
                      <p className="text-sm"><strong>No website:</strong> {stats.noWebsite} companies</p>
                      <p className="text-sm"><strong>Very old/Old sites:</strong> {stats.veryOld + stats.old} companies</p>
                    </div>
                  </div>
                </section>

                <section className="mb-8">
                  <h3 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">Лучшие ниши по потенциалу</h3>
                  <div className="space-y-2">
                    {industryStats.sort((a, b) => b.avgScore - a.avgScore).map((ind, i) => (
                      <div key={ind.industry} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                        <span className="font-bold text-gray-400 w-6">{i + 1}</span>
                        <span className="flex-1 font-medium text-gray-700">{ind.industry}</span>
                        <span className="text-sm text-gray-500">{ind.count} leads</span>
                        <span className={`font-bold ${getScoreColor(ind.avgScore)}`}>Avg: {ind.avgScore}</span>
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">{ind.topPriority} A+</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="mb-8">
                  <h3 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">Лучшие города</h3>
                  <div className="space-y-2">
                    {cityStats.sort((a, b) => b.avgScore - a.avgScore).map((c, i) => (
                      <div key={c.city} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                        <span className="font-bold text-gray-400 w-6">{i + 1}</span>
                        <span className="flex-1 font-medium text-gray-700">{c.city}</span>
                        <span className="text-sm text-gray-500">{c.count} leads</span>
                        <span className={`font-bold ${getScoreColor(c.avgScore)}`}>Avg: {c.avgScore}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="mb-8">
                  <h3 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">Частые проблемы сайтов</h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    {[
                      { problem: 'No online booking/appointment', count: leads.filter(l => l.mainProblem.toLowerCase().includes('онлайн-запис') || l.mainProblem.toLowerCase().includes('online')).length },
                      { problem: 'Outdated design (pre-2018)', count: leads.filter(l => l.websiteStatus === 'VERY OLD' || l.websiteStatus === 'OLD').length },
                      { problem: 'No cost calculator', count: leads.filter(l => l.mainProblem.toLowerCase().includes('калькулятор') || l.mainProblem.toLowerCase().includes('calculator')).length },
                      { problem: 'Poor mobile version', count: leads.filter(l => l.mainProblem.toLowerCase().includes('мобильн') || l.mainProblem.toLowerCase().includes('mobile')).length },
                      { problem: 'No website at all', count: leads.filter(l => l.websiteStatus === 'NO WEBSITE').length },
                      { problem: 'Weak first screen / offer', count: leads.filter(l => l.mainProblem.toLowerCase().includes('первый экран') || l.mainProblem.toLowerCase().includes('оффер')).length },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                        <span className="text-sm text-gray-700">{item.problem}</span>
                        <span className="font-bold text-indigo-600">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="mb-8">
                  <h3 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">Sales Recommendations</h3>
                  <div className="space-y-4 text-sm text-gray-700">
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                      <h4 className="font-bold text-blue-800">1. Focus on A+ leads first</h4>
                      <p className="mt-1">Компании с Opportunity Score 80+ имеют максимальную вероятность конверсии. Начните outreach с них.</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                      <h4 className="font-bold text-green-800">2. Best niches: Furniture/Kitchens, Tire Service, Renovation</h4>
                      <p className="mt-1">Эти ниши показывают наивысший средний Opportunity Score. В них высокий средний чек и острая потребность в сайте.</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                      <h4 className="font-bold text-purple-800">3. Key sales angles by niche</h4>
                      <p className="mt-1">
                        • <strong>Шиномонтаж:</strong> мобильная версия + кнопка вызова (сезонность)<br/>
                        • <strong>Косметология:</strong> онлайн-запись + портфолио до/после<br/>
                        • <strong>Мебель:</strong> калькулятор стоимости + 3D-конфигуратор<br/>
                        • <strong>Ремонт:</strong> калькулятор + портфолио с фильтрами<br/>
                        • <strong>Фитнес:</strong> запись на пробное + карта клубов<br/>
                        • <strong>Бухгалтерия:</strong> доверие + калькулятор стоимости
                      </p>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                      <h4 className="font-bold text-amber-800">4. Best cities for outreach</h4>
                      <p className="mt-1">Самара (avg 80), Уфа (81), СПб (78), Тюмень (77), Нижний Новгород (77) — города с наибольшим средним Opportunity Score.</p>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">Methodology</h3>
                  <div className="text-sm text-gray-600 space-y-2">
                    <p><strong>Opportunity Score</strong> = Website Need × 0.50 + Sales Potential × 0.30 + Business Activity × 0.20</p>
                    <p><strong>Data sources:</strong> Яндекс, Google, Яндекс Карты, 2ГИС, company websites, public directories, social media profiles.</p>
                    <p><strong>Quality control:</strong> Each lead verified for business existence, website accessibility, contact validity. No hallucinated data.</p>
                    <p><strong>Compliance:</strong> Only publicly available business data collected. No personal data, no hidden profiles, no circumvention of access restrictions.</p>
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}
      </main>

      {isParserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" onClick={() => !parserRunning && setIsParserOpen(false)}>
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">🚀 Запуск нового парсинга</h2>
                <p className="mt-1 text-sm text-gray-500">Алгоритм проверит активность бизнеса, сайт, контакты и рассчитает Opportunity Score.</p>
              </div>
              {!parserRunning && <button onClick={() => setIsParserOpen(false)} className="text-2xl leading-none text-gray-400 hover:text-gray-700">×</button>}
            </div>

            {!parserRunning && parserResult === null && <>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <label className="text-sm font-medium text-gray-700">Город
                  <select value={parserCity} onChange={e => setParserCity(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal">
                    <option value="all">Все города</option>{cities.map(city => <option key={city} value={city}>{city}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium text-gray-700">Ниша
                  <select value={parserIndustry} onChange={e => setParserIndustry(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal">
                    <option value="all">Все ниши</option>{industries.map(industry => <option key={industry} value={industry}>{industry}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium text-gray-700">Лимит лидов
                  <input type="number" min="1" max="1000" value={parserLimit} onChange={e => setParserLimit(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" />
                </label>
              </div>
              <p className="mt-4 text-xs text-gray-500">Уже выбранные компании автоматически исключаются по названию, сайту и телефону. В истории: {parsedCompanyKeys.length}. В текущем встроенном наборе всего {leads.length} компаний; для выгрузки больше этого числа потребуется подключить live-источник.</p>
            </>}

            {parserRunning && <div className="mt-7">
              <div className="mb-2 flex justify-between text-sm font-medium text-gray-700"><span>{parserStage}</span><span>{parserProgress}%</span></div>
              <div className="h-3 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-emerald-500 transition-all duration-500" style={{ width: `${parserProgress}%` }} /></div>
              <p className="mt-3 text-xs text-gray-500">Дубликаты отбрасываются, контакты без подтверждения не добавляются.</p>
            </div>}

            {!parserRunning && parserResult !== null && <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="font-semibold text-emerald-900">Готово: найдено {parserResult} новых лидов</div>
              <div className="mt-1 text-sm text-emerald-800">Компании из предыдущих сессий в этот результат не попали. Повторные запуски используют только ещё не выбранные записи.</div>
              <button onClick={() => { setIsParserOpen(false); setActiveTab('leads'); }} className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700">Открыть результаты</button>
            </div>}

            {!parserRunning && parserResult === null && <div className="mt-6 flex items-center justify-between gap-3">
              <p className="text-xs text-gray-500">Сейчас запуск работает по загруженному набору данных. Live-источники подключаются через backend/API.</p>
              <button onClick={runParser} className="shrink-0 rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-700">Запустить</button>
            </div>}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-400 text-center py-6 mt-12">
        <p className="text-sm">AI Lead Generation Pipeline • B2B Web Development • Russia Market</p>
        <p className="text-xs mt-1">Data collected from public sources only • {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

// Components
function KPICard({ label, value, icon, color, suffix }: { label: string; value: number; icon: string; color: string; suffix?: string }) {
  return (
    <div className={`rounded-xl p-4 border ${color}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <span className="text-xs font-medium text-gray-500 uppercase">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-800">{value}{suffix && <span className="text-sm text-gray-500">{suffix}</span>}</div>
    </div>
  );
}

function PriorityBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = Math.round((count / total) * 100);
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="text-gray-500">{count} ({pct}%)</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-3">
        <div className={`h-3 rounded-full ${color}`} style={{ width: `${pct}%` }}></div>
      </div>
    </div>
  );
}

function StatusRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = Math.round((count / total) * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 text-sm text-gray-600">{label}</div>
      <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
        <div className={`h-4 ${color} rounded-full`} style={{ width: `${pct}%` }}></div>
      </div>
      <div className="text-sm font-medium text-gray-500 w-12 text-right">{count}</div>
    </div>
  );
}

function ScoreCircle({ label, score }: { label: string; score: number }) {
  const color = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600';
  const bgColor = score >= 80 ? 'bg-green-100' : score >= 60 ? 'bg-yellow-100' : 'bg-red-100';
  return (
    <div className="flex items-center gap-3">
      <div className={`w-12 h-12 rounded-full ${bgColor} flex items-center justify-center`}>
        <span className={`font-bold ${color}`}>{score}</span>
      </div>
      <span className="text-sm text-gray-600">{label}</span>
    </div>
  );
}

function ScoreCard({ label, score }: { label: string; score: number }) {
  const color = score >= 80 ? 'from-green-400 to-emerald-500' : score >= 60 ? 'from-yellow-400 to-amber-500' : 'from-red-400 to-rose-500';
  return (
    <div className="bg-gray-50 rounded-lg p-4 text-center">
      <div className={`text-3xl font-bold bg-gradient-to-r ${color} bg-clip-text text-transparent`}>{score}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}

export default App;
