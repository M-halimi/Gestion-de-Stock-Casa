import Select from '@/Components/ui/Select';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Pagination from '@/Components/ui/Pagination';
import { Head, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';

const ACTION_CONFIG = {
    created:      { color: 'bg-success/20 text-success',   pill: 'bg-success/10 text-success',   dot: 'bg-success' },
    updated:      { color: 'bg-info/20 text-info',         pill: 'bg-info/10 text-info',         dot: 'bg-info' },
    deleted:      { color: 'bg-destructive/20 text-destructive', pill: 'bg-destructive/10 text-destructive', dot: 'bg-destructive' },
    login:        { color: 'bg-success/20 text-success',   pill: 'bg-success/10 text-success',   dot: 'bg-success' },
    logout:       { color: 'bg-warning/20 text-warning',   pill: 'bg-warning/10 text-warning',   dot: 'bg-warning' },
    failed_login: { color: 'bg-destructive/20 text-destructive', pill: 'bg-destructive/10 text-destructive', dot: 'bg-destructive' },
    transfer:     { color: 'bg-primary/20 text-primary',   pill: 'bg-primary/10 text-primary',   dot: 'bg-primary' },
    restored:     { color: 'bg-info/20 text-info',         pill: 'bg-info/10 text-info',         dot: 'bg-info' },
};

const ENTITY_COLORS = {
    Product: 'bg-info/10 text-info', Sale: 'bg-success/10 text-success',
    Purchase: 'bg-warning/10 text-warning', User: 'bg-primary/10 text-primary',
    Setting: 'bg-ink-mute/10 text-ink-secondary', Warehouse: 'bg-info/10 text-info',
    Stock: 'bg-primary/10 text-primary', Category: 'bg-accent-magenta/10 text-accent-magenta',
    Unit: 'bg-warning/10 text-warning', Supplier: 'bg-success/10 text-success',
    Customer: 'bg-destructive/10 text-destructive', AuditLog: 'bg-ink-mute/10 text-ink-secondary',
    InventoryAdjustment: 'bg-success/10 text-success',
    ProductionOrder: 'bg-primary/10 text-primary',
    BillOfMaterial: 'bg-info/10 text-info',
};

function Avatar({ name }) {
    const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const colors = ['bg-primary', 'bg-success', 'bg-info', 'bg-warning', 'bg-destructive', 'bg-accent-magenta'];
    const color = colors[(name || '').charCodeAt(0) % colors.length];
    return <div className={`h-8 w-8 rounded-full ${color} flex items-center justify-center text-[11px] font-semibold text-white shrink-0`}>{initials}</div>;
}
function TypeIcon({ action }) {
    const cfg = ACTION_CONFIG[action] || ACTION_CONFIG.updated;
    const icons = {
        created: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>,
        updated: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z"/></svg>,
        deleted: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>,
        login: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"/></svg>,
        logout: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M15 9l-3-3m0 0l3-3m-3 3H9"/></svg>,
        failed_login: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>,
        transfer: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"/></svg>,
        restored: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"/></svg>,
    };
    return <div className={`h-8 w-8 rounded-full ${cfg.color} flex items-center justify-center shrink-0`}>{icons[action] || icons.updated}</div>;
}

function ActionPill({ action }) {
    const cfg = ACTION_CONFIG[action] || { pill: 'bg-ink-mute/10 text-ink-secondary', dot: 'bg-ink-mute' };
    const label = action?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || action;
    return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.pill}`}><span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`}/>{label}</span>;
}

function EntityTag({ entity }) {
    if (!entity) return <span className="text-xs text-ink-mute">-</span>;
    const style = ENTITY_COLORS[entity] || 'bg-ink-mute/10 text-ink-secondary';
    return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${style}`}>{entity}</span>;
}

function SummaryWidget({ logs }) {
    const total = logs.total || 0;
    const recent = (logs.data || []).length;
    const counts = { created: 0, updated: 0, deleted: 0, login: 0, logout: 0, failed_login: 0 };
    (logs.data || []).forEach(log => { if (counts[log.action] !== undefined) counts[log.action]++; });
    const items = [
        { key: 'created', label: 'Created', color: 'bg-success', count: counts.created },
        { key: 'updated', label: 'Updated', color: 'bg-info', count: counts.updated },
        { key: 'deleted', label: 'Deleted', color: 'bg-destructive', count: counts.deleted },
        { key: 'login', label: 'Logins', color: 'bg-success', count: counts.login },
        { key: 'logout', label: 'Logouts', color: 'bg-warning', count: counts.logout },
        { key: 'failed_login', label: 'Failed', color: 'bg-destructive', count: counts.failed_login },
    ].filter(b => b.count > 0);

    return (
        <div className="rounded-xl border border-hairline bg-canvas p-5 shadow-level-2">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-sm font-semibold text-ink">Activity Summary</h3>
                    <p className="text-xs text-ink-mute mt-0.5">{recent} actions on this page · {total} total</p>
                </div>
                <div className="flex items-center gap-1 text-ink-mute">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/></svg>
                </div>
            </div>
            {items.length > 0 ? (
                <div className="space-y-3">
                    <div className="flex rounded-full overflow-hidden h-2 bg-hairline">
                        {items.map(item => <div key={item.key} className={`${item.color} transition-all duration-500`} style={{ width: `${(item.count / recent) * 100}%` }}/>)}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {items.map(item => (
                            <div key={item.key} className="flex items-center gap-1.5">
                                <div className={`h-2 w-2 rounded-full ${item.color}`}/>
                                <span className="text-[12px] text-ink-mute">{item.label}</span>
                                <span className="text-[12px] font-semibold text-ink-secondary">{item.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : <p className="text-xs text-ink-mute">No recent activity</p>}
        </div>
    );
}
function FilterBar({ filters, setFilters, users, actions, entities, applyFilters, resetFilters }) {
    return (
        <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-mute" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/></svg>
                <input type="text" value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} onKeyDown={e => e.key === 'Enter' && applyFilters()} placeholder="Search..." className="w-full rounded-lg border border-hairline-input bg-canvas-soft pl-9 pr-3 py-2 text-sm text-ink placeholder:text-ink-mute focus:border-primary focus:ring-1 focus:ring-primary outline-none"/>
            </div>
            <Select
                value={filters.entity_type}
                onChange={e => setFilters({ ...filters, entity_type: e.target.value })}
                className="w-full sm:w-44"
                options={[
                    { value: '', label: 'All modules' },
                    ...entities.map(e => ({ value: e, label: e })),
                ]}
            />
            <Select
                value={filters.user_id}
                onChange={e => setFilters({ ...filters, user_id: e.target.value })}
                className="w-full sm:w-44"
                options={[
                    { value: '', label: 'All users' },
                    ...users.map(u => ({ value: String(u.id), label: u.name })),
                ]}
            />
            <input type="date" value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value })} className="rounded-lg border border-hairline-input bg-canvas-soft px-3 py-2 text-sm text-ink-secondary focus:border-primary focus:ring-1 focus:ring-primary outline-none" title="From"/>
            <input type="date" value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value })} className="rounded-lg border border-hairline-input bg-canvas-soft px-3 py-2 text-sm text-ink-secondary focus:border-primary focus:ring-1 focus:ring-primary outline-none" title="To"/>
            <div className="flex gap-2">
                <button onClick={applyFilters} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 active:opacity-80 transition shadow-level-1">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/></svg>
                    Apply
                </button>
                <button onClick={resetFilters} className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-canvas-soft px-4 py-2 text-sm font-medium text-ink-mute hover:text-ink-secondary hover:bg-canvas-cream active:bg-hairline transition shadow-level-1">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"/></svg>
                    Reset
                </button>
            </div>
        </div>
    );
}

function ChangeList({ values, title }) {
    if (!values || Object.keys(values).length === 0) return null;
    const entries = Object.entries(values).filter(([k]) => !['password','password_confirmation','token','secret'].includes(k));
    if (entries.length === 0) return null;
    return (
        <div className="mt-3">
            <h4 className="text-[11px] font-semibold text-ink-mute uppercase tracking-wider mb-1.5">{title}</h4>
            <div className="rounded-lg bg-canvas-soft border border-hairline overflow-hidden">
                <table className="min-w-full text-[11px]">
                    <thead><tr className="border-b border-hairline"><th className="px-3 py-1.5 text-left text-ink-mute font-medium">Field</th><th className="px-3 py-1.5 text-left text-ink-mute font-medium">Value</th></tr></thead>
                    <tbody className="divide-y divide-hairline">
                        {entries.map(([key, val]) => (
                            <tr key={key}>
                                <td className="px-3 py-1 text-ink-mute whitespace-nowrap font-mono">{key}</td>
                                <td className="px-3 py-1 text-ink-secondary break-all font-mono">{val === null ? 'null' : typeof val === 'object' ? JSON.stringify(val) : String(val)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
export default function Index({ logs, filters: serverFilters, users, actions, entities }) {
    const { t } = useTranslation();
    const [selected, setSelected] = useState(new Set());
    const [expandedId, setExpandedId] = useState(null);
    const [sortKey, setSortKey] = useState('created_at');
    const [sortDir, setSortDir] = useState('desc');
    const [activeAction, setActiveAction] = useState(serverFilters.action ?? '');
    const [filters, setFilters] = useState({
        search: serverFilters.search ?? '', user_id: serverFilters.user_id ?? '',
        action: serverFilters.action ?? '', entity_type: serverFilters.entity_type ?? '',
        from: serverFilters.from ?? '', to: serverFilters.to ?? '',
    });

    const applyFilters = () => {
        const params = {};
        Object.entries({ ...filters, action: activeAction }).forEach(([k, v]) => { if (v) params[k] = v; });
        router.get(route('audit-logs.index'), params, { preserveState: true });
    };

    const resetFilters = () => {
        setFilters({ search: '', user_id: '', action: '', entity_type: '', from: '', to: '' });
        setActiveAction('');
        router.get(route('audit-logs.index'));
    };

    const handleChipAction = (a) => {
        setActiveAction(a);
        const params = {};
        Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
        if (a) params.action = a;
        router.get(route('audit-logs.index'), params, { preserveState: true });
    };

    const toggleSelect = id => {
        setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    };
    const toggleSelectAll = () => {
        setSelected(selected.size === logs.data.length ? new Set() : new Set(logs.data.map(l => l.id)));
    };
    const toggleExpand = id => setExpandedId(expandedId === id ? null : id);

    const handleSort = key => {
        if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('asc'); }
    };

    const SortIcon = ({ column }) => {
        if (sortKey !== column) return <svg className="h-3 w-3 text-ink-mute ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15M8.25 9L12 5.25 15.75 9"/></svg>;
        return <svg className="h-3 w-3 text-ink ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">{sortDir === 'asc' ? <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5"/> : <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/>}</svg>;
    };

    const sortedData = [...(logs.data || [])].sort((a, b) => {
        let aVal = a[sortKey] ?? '', bVal = b[sortKey] ?? '';
        if (sortKey === 'user') { aVal = a.user?.name ?? ''; bVal = b.user?.name ?? ''; }
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
        return 0;
    });

    const from = logs.total === 0 ? 0 : (logs.current_page - 1) * logs.per_page + 1;
    const to = Math.min(logs.current_page * logs.per_page, logs.total);

    const formatDate = (d) => {
        if (!d) return '-';
        try { return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d)); }
        catch { return d; }
    };
    return (
        <AuthenticatedLayout>
            <Head title={t('pages.audit_logs.title')} />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-ink">{t('pages.audit_logs.title')}</h1>
                        <p className="text-sm text-ink-mute mt-1">{t('pages.audit_logs.subtitle')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="inline-flex items-center gap-2 rounded-lg border border-hairline bg-canvas-soft px-3.5 py-2 text-sm font-medium text-ink-secondary hover:bg-canvas-cream active:bg-hairline transition shadow-level-1">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
                            {t('pages.audit_logs.export_csv')}
                        </button>
                        <button className="inline-flex items-center gap-2 rounded-lg bg-success px-3.5 py-2 text-sm font-medium text-white hover:opacity-90 active:opacity-80 transition shadow-level-1">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
                            {t('pages.audit_logs.new_rule')}
                        </button>
                    </div>
                </div>

                <div className="space-y-5">
                    <SummaryWidget logs={logs} />
                    <FilterBar filters={filters} setFilters={setFilters} users={users} actions={actions} entities={entities} applyFilters={applyFilters} resetFilters={resetFilters} />

                    <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => handleChipAction('')} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${activeAction === '' ? 'bg-primary text-white shadow-level-1' : 'bg-hairline text-ink-secondary hover:bg-hairline-strong'}`}>
                            All <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${activeAction === '' ? 'bg-white/20 text-white' : 'bg-canvas-cream text-ink-mute'}`}>{logs.total}</span>
                        </button>
                        {actions.map(a => (
                            <button key={a} onClick={() => handleChipAction(a)} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${activeAction === a ? 'bg-primary text-white shadow-level-1' : 'bg-hairline text-ink-secondary hover:bg-hairline-strong'}`}>
                                {a.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                            </button>
                        ))}
                    </div>

                    {selected.size > 0 && (
                        <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm shadow-level-1">
                            <span className="font-medium text-primary">{selected.size} selected</span>
                            <div className="flex gap-2 ml-auto">
                                <button className="inline-flex items-center gap-1.5 rounded-lg bg-success px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 active:opacity-80 transition shadow-level-1">
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                                    Fix all
                                </button>
                                <button className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-canvas-soft px-3 py-1.5 text-xs font-medium text-ink-secondary hover:bg-canvas-cream active:bg-hairline transition shadow-level-1">
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
                                    Ignore
                                </button>
                                <button className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-canvas-soft px-3 py-1.5 text-xs font-medium text-ink-secondary hover:bg-canvas-cream active:bg-hairline transition shadow-level-1">
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
                                    Export
                                </button>
                            </div>
                        </div>
                    )}
                    {logs.data.length === 0 ? (
                        <div className="rounded-xl border border-hairline bg-canvas py-16 text-center">
                            <svg className="mx-auto h-12 w-12 text-ink-mute" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
                            <h3 className="mt-3 text-sm font-semibold text-ink">{t('pages.audit_logs.empty_title')}</h3>
                            <p className="mt-1 text-sm text-ink-mute">{t('pages.audit_logs.empty_desc')}</p>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-hairline bg-canvas shadow-level-2 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead>
                                        <tr className="border-b border-hairline bg-canvas-soft/50">
                                            <th className="w-12 px-4 py-3">
                                                <input type="checkbox" checked={selected.size === logs.data.length && logs.data.length > 0} onChange={toggleSelectAll} className="h-4 w-4 rounded border-hairline-input bg-canvas-soft text-primary focus:ring-primary"/>
                                            </th>
                                            {[
                                                { key: 'created_at', label: t('pages.audit_logs.col_detected') },
                                                { key: 'user', label: t('pages.audit_logs.col_assigned') },
                                                { key: 'action', label: t('pages.audit_logs.col_severity') },
                                                { key: 'entity_type', label: t('pages.audit_logs.col_category') },
                                                { key: 'description', label: t('pages.audit_logs.col_finding') },
                                                { key: 'entity_id', label: 'Record' },
                                            ].map(col => (
                                                <th key={col.key} onClick={() => handleSort(col.key)} className="px-4 py-3 text-left text-xs font-semibold text-ink-mute uppercase tracking-wider cursor-pointer hover:text-ink-secondary select-none">
                                                    <span className="inline-flex items-center">{col.label}<SortIcon column={col.key}/></span>
                                                </th>
                                            ))}
                                            <th className="w-20 px-4 py-3"/>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-hairline">
                                        {sortedData.map(log => (
                                            <tr key={log.id} className={`group transition-colors ${expandedId === log.id ? 'bg-canvas-soft/50' : 'hover:bg-canvas-soft/30'}`}>
                                                <td className="px-4 py-3"><input type="checkbox" checked={selected.has(log.id)} onChange={() => toggleSelect(log.id)} className="h-4 w-4 rounded border-hairline-input bg-canvas-soft text-primary focus:ring-primary"/></td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <TypeIcon action={log.action}/>
                                                        <span className="text-sm text-ink-mute whitespace-nowrap">{formatDate(log.created_at)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3"><Avatar name={log.user?.name}/></td>
                                                <td className="px-4 py-3"><ActionPill action={log.action}/></td>
                                                <td className="px-4 py-3"><EntityTag entity={log.entity_type}/></td>
                                                <td className="px-4 py-3 text-sm text-ink-mute max-w-xs truncate">{log.description || '-'}</td>
                                                <td className="px-4 py-3 text-sm text-ink font-mono">#{log.entity_id || '-'}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => toggleExpand(log.id)} className="rounded-md p-1.5 text-ink-mute hover:text-ink hover:bg-canvas-cream transition" title="View details">
                                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                                                        </button>
                                                        <button onClick={e => e.stopPropagation()} className="rounded-md p-1.5 text-ink-mute hover:text-ink hover:bg-canvas-cream transition" title="Copy ID">
                                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"/></svg>
                                                        </button>
                                                        <button onClick={e => e.stopPropagation()} className="rounded-md p-1.5 text-ink-mute hover:text-ink hover:bg-canvas-cream transition" title="More options">
                                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"/></svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {sortedData.some((log, i) => expandedId === log.id) && sortedData.map(log => expandedId === log.id ? (
                                <div key={`expand-${log.id}`} className="px-4 py-4 bg-canvas-soft/50 border-t border-hairline">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                        <div className="space-y-3">
                                            <div><span className="text-[11px] font-semibold text-ink-mute uppercase tracking-wider">User</span><p className="mt-0.5 text-ink">{log.user ? `${log.user.name} (${log.user.email})` : 'System'}</p></div>
                                            <div><span className="text-[11px] font-semibold text-ink-mute uppercase tracking-wider">IP Address</span><p className="mt-0.5 text-ink font-mono text-xs">{log.ip_address || '-'}</p></div>
                                        </div>
                                        <div className="space-y-3">
                                            <div><span className="text-[11px] font-semibold text-ink-mute uppercase tracking-wider">Description</span><p className="mt-0.5 text-ink">{log.description || '-'}</p></div>
                                            <div><span className="text-[11px] font-semibold text-ink-mute uppercase tracking-wider">User Agent</span><p className="mt-0.5 text-ink-mute text-[11px] font-mono break-all">{log.user_agent || '-'}</p></div>
                                        </div>
                                        <div><ChangeList values={log.old_values} title="Previous Values"/><ChangeList values={log.new_values} title="New Values"/></div>
                                    </div>
                                </div>
                            ) : null)}
                        </div>
                    )}

                    <div className="flex items-center justify-between text-sm text-ink-mute">
                        <p>Showing {from}–{to} of {logs.total} findings</p>
                    </div>

                    {logs.last_page > 1 && <Pagination meta={logs}/>}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}