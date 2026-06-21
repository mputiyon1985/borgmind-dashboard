'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface StatusData {
  db: {
    connected: boolean;
    url?: string;
    error?: string;
  };
  memory: {
    total: number;
    hot: number;
    warm: number;
    cold: number;
    categories: { name: string; count: number }[];
  };
  souls: {
    soul_id: string;
    display_name: string;
    version: number;
    last_sync: string | null;
  }[];
  graph: {
    total_relationships: number;
    top_subjects: { subject: string; count: number }[];
  };
  recent_activity: {
    soul_id: string;
    action: string;
    table_name: string;
    timestamp: string;
  }[];
  sync_health: {
    soul_id: string;
    table_name: string;
    last_sync_at: string | null;
    status: string;
    consecutive_failures: number;
  }[];
  fetched_at: string;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'never';
  const d = new Date(dateStr);
  const now = Date.now();
  const diffMs = now - d.getTime();
  if (diffMs < 0) return 'just now';
  const secs = Math.floor(diffMs / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    // Format: MM/DD/YY HH:MM AM/PM EDT
    return d.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    });
  } catch {
    return dateStr;
  }
}

const AGENT_ORDER = ['pepper', 'jarvis', 'tony', 'rhodey'];
const AGENT_EMOJI: Record<string, string> = {
  pepper: '🌶️',
  jarvis: '🤖',
  tony: '⚙️',
  rhodey: '🛡️',
};

function agentColor(soulId: string): string {
  const colors: Record<string, string> = {
    pepper: 'text-pink-400',
    jarvis: 'text-blue-400',
    tony: 'text-yellow-400',
    rhodey: 'text-green-400',
  };
  return colors[soulId.toLowerCase()] ?? 'text-gray-400';
}

// ─────────────── ACTIVITY TAB ───────────────
function ActivityTab() {
  const [events, setEvents] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [paused, setPaused] = useState(false);
  const [filters, setFilters] = useState({ soul: '', action: '', table: '' });
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const fetchActivity = useCallback(async () => {
    if (paused) return;
    const params = new URLSearchParams({ limit: '50' });
    if (filters.soul) params.set('soul', filters.soul);
    if (filters.action) params.set('action', filters.action);
    if (filters.table) params.set('table', filters.table);
    try {
      const res = await fetch(`/api/activity?${params}`);
      const data = await res.json();
      // Sort most recent first (newest timestamp at top)
      const sorted = [...(data.events || [])].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setEvents(sorted);
      setTotal(data.total || 0);
      setLastUpdate(new Date());
    } catch (_) {}
  }, [paused, filters]);

  useEffect(() => {
    fetchActivity();
    const interval = setInterval(fetchActivity, 5000);
    return () => clearInterval(interval);
  }, [fetchActivity]);

  const agentColors: Record<string, string> = {
    pepper: 'text-purple-400',
    jarvis: 'text-blue-400',
    tony: 'text-yellow-400',
    rhodey: 'text-green-400',
  };

  const actionColors: Record<string, string> = {
    WRITE: 'bg-green-900 text-green-300',
    READ: 'bg-blue-900 text-blue-300',
    UPDATE: 'bg-yellow-900 text-yellow-300',
    SYNC: 'bg-purple-900 text-purple-300',
    DELETE: 'bg-red-900 text-red-300',
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`w-2 h-2 rounded-full ${paused ? 'bg-gray-500' : 'bg-green-400 animate-pulse'}`} />
          <span className="text-slate-300 text-sm">
            {paused ? 'Paused' : `Live · updates every 5s · last ${lastUpdate.toLocaleTimeString()}`}
          </span>
          <span className="text-slate-500 text-sm">({total.toLocaleString()} total events)</span>
        </div>
        <button
          onClick={() => setPaused(!paused)}
          className={`px-3 py-1 rounded text-sm ${paused ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-700 hover:bg-slate-600'} text-white transition`}
        >
          {paused ? '▶ Resume' : '⏸ Pause'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex space-x-3 mb-4">
        <select value={filters.soul} onChange={e => setFilters(f => ({ ...f, soul: e.target.value }))}
          className="bg-slate-800 border border-slate-700 text-slate-300 rounded px-3 py-1.5 text-sm">
          <option value="">All Agents</option>
          <option value="pepper">Pepper</option>
          <option value="jarvis">Jarvis</option>
          <option value="tony">Tony</option>
          <option value="rhodey">Rhodey</option>
        </select>
        <select value={filters.action} onChange={e => setFilters(f => ({ ...f, action: e.target.value }))}
          className="bg-slate-800 border border-slate-700 text-slate-300 rounded px-3 py-1.5 text-sm">
          <option value="">All Actions</option>
          <option value="WRITE">WRITE</option>
          <option value="READ">READ</option>
          <option value="UPDATE">UPDATE</option>
          <option value="SYNC">SYNC</option>
        </select>
        <select value={filters.table} onChange={e => setFilters(f => ({ ...f, table: e.target.value }))}
          className="bg-slate-800 border border-slate-700 text-slate-300 rounded px-3 py-1.5 text-sm">
          <option value="">All Tables</option>
          <option value="memory">memory</option>
          <option value="souls">souls</option>
          <option value="knowledge_graph">knowledge_graph</option>
          <option value="sync_state">sync_state</option>
        </select>
        <button onClick={fetchActivity} className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded text-sm transition">
          🔄 Refresh
        </button>
      </div>

      {/* Event table */}
      <div className="bg-slate-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left p-3 text-slate-400 font-medium">Time</th>
              <th className="text-left p-3 text-slate-400 font-medium">Agent</th>
              <th className="text-left p-3 text-slate-400 font-medium">Action</th>
              <th className="text-left p-3 text-slate-400 font-medium">Table</th>
              <th className="text-left p-3 text-slate-400 font-medium">Key</th>
              <th className="text-left p-3 text-slate-400 font-medium">Sync</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event: any, i: number) => (
              <tr key={event.id || i} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition">
                <td className="p-3 text-slate-500 font-mono text-xs">
                  {formatDateTime(event.timestamp)}
                </td>
                <td className={`p-3 font-medium ${agentColors[event.soul_id] || 'text-slate-300'}`}>
                  {event.soul_id}
                </td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-mono ${actionColors[event.action] || 'bg-slate-700 text-slate-300'}`}>
                    {event.action}
                  </span>
                </td>
                <td className="p-3 text-slate-400 font-mono text-xs">{event.table_name}</td>
                <td className="p-3 text-slate-300 font-mono text-xs max-w-xs truncate">{event.record_key}</td>
                <td className="p-3">
                  <span className={`text-xs ${event.synced ? 'text-green-400' : 'text-yellow-400'}`}>
                    {event.synced ? '✅' : '⏳'}
                  </span>
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-slate-500">No events yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────── PEOPLE TAB ───────────────
function PeopleTab() {
  const [people, setPeople] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, human: 0, agent: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const fetchPeople = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (filter) params.set('search', filter);
      const res = await fetch(`/api/people?${params}`);
      const data = await res.json();
      setPeople(data.people || []);
      const all = data.people || [];
      setStats({
        total: data.total || 0,
        active: all.filter((p: any) => p.status === 'active').length,
        human: all.filter((p: any) => p.role !== 'Engineering Agent' && p.role !== 'Tech Agent' && p.role !== 'Ops Agent' && p.role !== 'PM Agent').length,
        agent: all.filter((p: any) => p.role === 'Engineering Agent' || p.role === 'Tech Agent' || p.role === 'Ops Agent' || p.role === 'PM Agent').length,
      });
      setLoading(false);
    } catch (e) {
      console.error('People fetch error:', e);
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchPeople(); }, [fetchPeople]);

  const sourceEmoji: Record<string, string> = {
    telegram: '📱',
    discord: '💬',
    memory: '🧠',
    system: '⚙️',
    unknown: '❓',
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-900/50 text-green-400';
      case 'inactive': return 'bg-gray-800 text-gray-400';
      case 'suspended': return 'bg-red-900/50 text-red-400';
      default: return 'bg-slate-700 text-slate-300';
    }
  };

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">{stats.total}</div>
          <div className="text-xs text-slate-500">Total People</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{stats.active}</div>
          <div className="text-xs text-slate-500">Active</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-pink-400">{stats.human}</div>
          <div className="text-xs text-slate-500">Humans</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">{stats.agent}</div>
          <div className="text-xs text-slate-500">Agents</div>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-3 mb-4">
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Search people..."
          className="flex-1 bg-slate-800 border border-slate-700 text-slate-300 rounded px-3 py-1.5 text-sm placeholder-slate-500"
        />
        <button
          onClick={fetchPeople}
          className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded text-sm transition"
        >
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-slate-500">Loading people...</div>
      ) : people.length === 0 ? (
        <div className="text-center py-8 text-slate-500">No people found</div>
      ) : (
        <div className="space-y-2">
          {people.map((p: any) => (
            <div key={p.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:bg-slate-800 transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {p.role === 'CTO' ? '👨‍💼' :
                     p.role === 'Family' ? '👩‍❤️‍👨' :
                     p.role === 'PM Agent' ? '🌶️' :
                     p.role === 'Engineering Agent' ? '🤖' :
                     p.role === 'Tech Agent' ? '⚙️' :
                     p.role === 'Ops Agent' ? '🛡️' : '👤'}
                  </span>
                  <div>
                    <div className="font-semibold text-slate-200 flex items-center gap-2">
                      {p.name}
                      <span className={`text-xs px-2 py-0.5 rounded ${statusColor(p.status)}`}>
                        {p.status}
                      </span>
                    </div>
                    <div className="text-sm text-slate-500 flex items-center gap-2">
                      {p.role}
                      {p.email && <span>· {p.email}</span>}
                      {p.telegram_id && <span>· TG: {p.telegram_id}</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    {sourceEmoji[p.source] || '❓'} {p.source}
                  </div>
                  <div>Last seen: {timeAgo(p.last_seen)}</div>
                  <div>Joined: {formatDateTime(p.created_at)}</div>
                </div>
              </div>
              {p.notes && (
                <div className="mt-2 text-xs text-slate-500 pl-11">
                  {p.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────── COMMS TAB ───────────────
function CommsTab() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const fetchMessages = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (filter) params.set('agent', filter);
      const res = await fetch(`/api/comms?${params}`);
      const data = await res.json();
      setMessages(data.messages || []);
      setLoading(false);
    } catch (e) {
      console.error('Failed to fetch messages:', e);
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const agentEmoji: Record<string, string> = {
    pepper: '🌶️',
    jarvis: '🤖',
    tony: '⚙️',
    rhodey: '🛡️',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-300 rounded px-3 py-1.5 text-sm"
          >
            <option value="">All Agents</option>
            <option value="pepper">🌶️ Pepper</option>
            <option value="jarvis">🤖 Jarvis</option>
            <option value="tony">⚙️ Tony</option>
            <option value="rhodey">🛡️ Rhodey</option>
          </select>
          <button
            onClick={fetchMessages}
            className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded text-sm transition"
          >
            ↻ Refresh
          </button>
        </div>
        <span className="text-sm text-slate-400">
          {messages.length} messages
        </span>
      </div>

      {loading ? (
        <div className="text-center py-8 text-slate-500">Loading messages...</div>
      ) : messages.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          💬 No messages yet. Send one via BorgComms!
        </div>
      ) : (
        <div className="space-y-2">
          {messages.map((msg: any) => (
            <div
              key={msg.id}
              className={`bg-slate-800/50 border rounded-lg p-3 ${
                msg.read_status === 'unread' ? 'border-l-4 border-l-blue-500 border-blue-900/50' : 'border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <span className={agentColor(msg.sender_name || '')}>
                    {agentEmoji[msg.sender_name || ''] || '👤'} <span className="font-semibold">{msg.sender_name || msg.sender || 'unknown'}</span>
                  </span>
                  <span className="text-slate-500">→</span>
                  <span className="text-slate-400">
                    {(msg.recipient_name || msg.recipient || '') === 'broadcast' || (msg.recipient_name || msg.recipient || '') === 'all' ? '📢 All' : (agentEmoji[msg.recipient_name || msg.recipient || ''] || '👤') + ' ' + (msg.recipient_name || msg.recipient || '')}
                  </span>
                  {msg.priority >= 3 && (
                    <span className="text-red-400 text-xs">🔴</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    (msg.read_status || msg.status) === 'unread' ? 'bg-blue-900/50 text-blue-400' : 'bg-green-900/50 text-green-400'
                  }`}>
                    {(msg.read_status || msg.status) === 'unread' ? '● New' : '✓ Read'}
                  </span>
                  <span className="text-xs text-slate-500">{timeAgo(msg.timestamp)}</span>
                  <span className="text-xs text-slate-600">({formatDateTime(msg.timestamp)})</span>
                </div>
              </div>
              <div className="text-slate-300 text-sm mt-1 pl-6">
                {msg.message_text || msg.text || msg.payload?.text || msg.payload?.message || 'No message content'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────── VAULT TAB ───────────────
function VaultTab() {
  const [secrets, setSecrets] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, expired: 0, warning: 0 });
  const [loading, setLoading] = useState(true);

  const fetchVault = useCallback(async () => {
    try {
      const res = await fetch('/api/vault');
      const data = await res.json();
      setSecrets(data.secrets || []);
      setStats({
        total: data.total || 0,
        active: data.active || 0,
        expired: data.expired || 0,
        warning: data.warning || 0
      });
      setLoading(false);
    } catch (e) {
      console.error('Failed to fetch vault:', e);
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchVault(); }, [fetchVault]);

  const statusColors = {
    active: 'bg-green-900/50 text-green-400',
    expired: 'bg-red-900/50 text-red-400',
    warning: 'bg-yellow-900/50 text-yellow-400'
  };

  const sourceEmoji: Record<string, string> = {
    azure: '☁️ Azure',
    pass: '🔒 pass',
  };

  return (
    <div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">{stats.total}</div>
          <div className="text-xs text-slate-500">Total Secrets</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{stats.active}</div>
          <div className="text-xs text-slate-500">Active</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400">{stats.warning}</div>
          <div className="text-xs text-slate-500">Warning</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-400">{stats.expired}</div>
          <div className="text-xs text-slate-500">Expired</div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-slate-500">Loading vault secrets...</div>
      ) : (
        <div className="space-y-2">
          {secrets.map((secret: any) => (
            <div key={secret.name} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg">🔑</span>
                  <div>
                    <div className="font-semibold text-slate-300">{secret.name}</div>
                    <div className="text-sm text-slate-500">{secret.description}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded">
                    {sourceEmoji[secret.source] || secret.source}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${statusColors[secret.status as keyof typeof statusColors]}`}>
                    {secret.status}
                  </span>
                  <span className="text-xs text-slate-500">Modified: {secret.lastModified}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────── MEMORY TAB ───────────────
function MemoryTab() {
  const [entries, setEntries] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [tier, setTier] = useState('');

  const fetchMemory = useCallback(async () => {
    const params = new URLSearchParams({ limit: '50' });
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    if (tier) params.set('tier', tier);
    try {
      const res = await fetch(`/api/memory?${params}`);
      const data = await res.json();
      setEntries(data.entries || []);
      setTotal(data.total || 0);
      setCategories(data.categories || []);
    } catch (_) {}
  }, [search, category, tier]);

  useEffect(() => { fetchMemory(); }, [fetchMemory]);

  const tierColors: Record<string, string> = {
    hot: 'text-orange-400',
    warm: 'text-yellow-400',
    cold: 'text-blue-300',
  };
  const tierEmoji: Record<string, string> = { hot: '🔥', warm: '🌤', cold: '🧊' };

  return (
    <div>
      <div className="flex space-x-3 mb-4 items-center">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search memory keys or values..."
          className="flex-1 bg-slate-800 border border-slate-700 text-slate-300 rounded px-3 py-1.5 text-sm placeholder-slate-500" />
        <select value={category} onChange={e => setCategory(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-slate-300 rounded px-3 py-1.5 text-sm">
          <option value="">All Categories</option>
          {categories.map((c: any) => (
            <option key={c.category} value={c.category}>{c.category} ({c.count})</option>
          ))}
        </select>
        <select value={tier} onChange={e => setTier(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-slate-300 rounded px-3 py-1.5 text-sm">
          <option value="">All Tiers</option>
          <option value="hot">🔥 Hot</option>
          <option value="warm">🌤 Warm</option>
          <option value="cold">🧊 Cold</option>
        </select>
        <button onClick={fetchMemory} className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded text-sm transition">
          🔄 Refresh
        </button>
        <span className="text-slate-500 text-sm">{total.toLocaleString()} total</span>
      </div>
      <div className="space-y-2">
        {entries.map((entry: any, i: number) => (
          <div key={entry.id || i} className="bg-slate-800 rounded-lg p-3 hover:bg-slate-700/60 transition">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-blue-400 text-sm">{entry.mem_key}</span>
              <div className="flex items-center space-x-3 text-xs">
                <span className={tierColors[entry.tier] || 'text-slate-400'}>
                  {tierEmoji[entry.tier] || ''} {entry.tier}
                </span>
                <span className="text-slate-500">conf: {entry.confidence}</span>
                <span className="text-slate-600">{entry.category}</span>
              </div>
            </div>
            <div className="text-slate-400 text-xs font-mono truncate">
              {typeof entry.value === 'string'
                ? entry.value.substring(0, 120)
                : JSON.stringify(entry.value).substring(0, 120)}
              {(typeof entry.value === 'string' ? entry.value.length : JSON.stringify(entry.value).length) > 120 ? '...' : ''}
            </div>
          </div>
        ))}
        {entries.length === 0 && (
          <div className="text-center text-slate-500 py-12">No memory entries found</div>
        )}
      </div>
    </div>
  );
}

// ─────────────── OVERVIEW TAB ───────────────
function OverviewTab({ data, fetchStatus }: { data: StatusData; fetchStatus: () => void }) {
  const sortedSouls = data.souls.slice().sort((a, b) => {
    const ai = AGENT_ORDER.indexOf(a.soul_id.toLowerCase());
    const bi = AGENT_ORDER.indexOf(b.soul_id.toLowerCase());
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const tables = ['memory', 'souls', 'knowledge_graph', 'memory_log', 'sync_state'];
  const syncMap: Record<string, Record<string, { last_sync_at: string | null; status: string; failures: number }>> = {};
  for (const s of (data.sync_health ?? [])) {
    if (!syncMap[s.table_name]) syncMap[s.table_name] = {};
    syncMap[s.table_name][s.soul_id.toLowerCase()] = {
      last_sync_at: s.last_sync_at,
      status: s.status,
      failures: s.consecutive_failures,
    };
  }
  const existingTables = Object.keys(syncMap);

  return (
    <div className="space-y-6">
      {/* Top Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#1e293b] rounded-xl p-5 border border-blue-900/40">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">DB Status</div>
          <div className={`text-2xl font-bold ${data.db.connected ? 'text-green-400' : 'text-red-400'}`}>
            {data.db.connected ? '✅ Connected' : '❌ Error'}
          </div>
          <div className="text-xs text-gray-600 mt-1 truncate">{data.db.url}</div>
        </div>
        <div className="bg-[#1e293b] rounded-xl p-5 border border-blue-900/40">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Total Memory</div>
          <div className="text-2xl font-bold text-blue-400">{data.memory.total.toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">entries across all agents</div>
        </div>
        <div className="bg-[#1e293b] rounded-xl p-5 border border-blue-900/40">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Graph Edges</div>
          <div className="text-2xl font-bold text-purple-400">{data.graph.total_relationships.toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">knowledge relationships</div>
        </div>
      </div>

      {/* Agents */}
      <div className="bg-[#1e293b] rounded-xl border border-blue-900/40 overflow-hidden">
        <div className="px-5 py-3 bg-blue-900/20 border-b border-blue-900/40">
          <h2 className="text-sm font-semibold text-blue-300 uppercase tracking-wider">🤖 Agents</h2>
        </div>
        <div className="divide-y divide-blue-900/20">
          {sortedSouls.length === 0 ? (
            <div className="px-5 py-4 text-gray-500 text-sm">No agents found</div>
          ) : (
            sortedSouls.map(soul => (
              <div key={soul.soul_id} className="px-5 py-3 flex items-center justify-between hover:bg-blue-900/10 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-lg">{AGENT_EMOJI[soul.soul_id.toLowerCase()] ?? '🤖'}</span>
                  <span className={`font-semibold text-base ${agentColor(soul.soul_id)}`}>
                    {soul.display_name}
                  </span>
                  <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
                    v{soul.version}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  synced {timeAgo(soul.last_sync)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Memory Tiers + Knowledge Graph */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#1e293b] rounded-xl border border-blue-900/40 overflow-hidden">
          <div className="px-5 py-3 bg-blue-900/20 border-b border-blue-900/40">
            <h2 className="text-sm font-semibold text-blue-300 uppercase tracking-wider">🧠 Memory Tiers</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-orange-400 font-medium">🔥 Hot</span>
              <div className="flex items-center gap-3">
                <div className="w-32 bg-gray-800 rounded-full h-2 overflow-hidden">
                  <div className="bg-orange-500 h-2 rounded-full transition-all"
                    style={{ width: data.memory.total > 0 ? `${(data.memory.hot / data.memory.total) * 100}%` : '0%' }} />
                </div>
                <span className="text-gray-300 text-sm w-16 text-right">{data.memory.hot} entries</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-blue-300 font-medium">🌤️ Warm</span>
              <div className="flex items-center gap-3">
                <div className="w-32 bg-gray-800 rounded-full h-2 overflow-hidden">
                  <div className="bg-blue-400 h-2 rounded-full transition-all"
                    style={{ width: data.memory.total > 0 ? `${(data.memory.warm / data.memory.total) * 100}%` : '0%' }} />
                </div>
                <span className="text-gray-300 text-sm w-16 text-right">{data.memory.warm} entries</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-cyan-300 font-medium">🧊 Cold</span>
              <div className="flex items-center gap-3">
                <div className="w-32 bg-gray-800 rounded-full h-2 overflow-hidden">
                  <div className="bg-cyan-500 h-2 rounded-full transition-all"
                    style={{ width: data.memory.total > 0 ? `${(data.memory.cold / data.memory.total) * 100}%` : '0%' }} />
                </div>
                <span className="text-gray-300 text-sm w-16 text-right">{data.memory.cold} entries</span>
              </div>
            </div>
            <div className="pt-2 border-t border-blue-900/20">
              <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Top Categories</div>
              <div className="space-y-1">
                {data.memory.categories.slice(0, 5).map(cat => (
                  <div key={cat.name} className="flex justify-between text-sm">
                    <span className="text-gray-400 truncate">{cat.name}</span>
                    <span className="text-gray-500 ml-2">{cat.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#1e293b] rounded-xl border border-blue-900/40 overflow-hidden">
          <div className="px-5 py-3 bg-blue-900/20 border-b border-blue-900/40">
            <h2 className="text-sm font-semibold text-blue-300 uppercase tracking-wider">🕸️ Top Knowledge Entities</h2>
          </div>
          <div className="p-5">
            {data.graph.top_subjects.length === 0 ? (
              <div className="text-gray-500 text-sm">No knowledge graph data</div>
            ) : (
              <div className="space-y-2">
                {data.graph.top_subjects.slice(0, 8).map((s, i) => (
                  <div key={s.subject} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-4">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-0.5">
                        <span className="text-sm text-gray-300 truncate">{s.subject}</span>
                        <span className="text-xs text-purple-400 ml-2">{s.count} edges</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-1">
                        <div className="bg-purple-500 h-1 rounded-full"
                          style={{ width: `${(s.count / (data.graph.top_subjects[0]?.count || 1)) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-[#1e293b] rounded-xl border border-blue-900/40 overflow-hidden">
        <div className="px-5 py-3 bg-blue-900/20 border-b border-blue-900/40">
          <h2 className="text-sm font-semibold text-blue-300 uppercase tracking-wider">📋 Recent Activity (Last 10)</h2>
        </div>
        <div className="divide-y divide-blue-900/20">
          {data.recent_activity.length === 0 ? (
            <div className="px-5 py-4 text-gray-500 text-sm">No recent activity</div>
          ) : (
            data.recent_activity.map((a, i) => (
              <div key={i} className="px-5 py-2.5 flex items-center gap-4 hover:bg-blue-900/10 transition-colors">
                <span className="text-xs text-gray-600 w-52 flex-shrink-0">
                  {formatDateTime(a.timestamp)}
                </span>
                <span className={`text-xs font-semibold w-16 flex-shrink-0 ${agentColor(a.soul_id)}`}>
                  {a.soul_id}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-mono ${
                  a.action === 'WRITE' ? 'bg-green-900/40 text-green-400' :
                  a.action === 'READ' ? 'bg-blue-900/40 text-blue-400' :
                  a.action === 'DELETE' ? 'bg-red-900/40 text-red-400' :
                  'bg-gray-800 text-gray-400'
                }`}>
                  {a.action}
                </span>
                <span className="text-xs text-gray-500">{a.table_name}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Sync Health */}
      <div className="bg-[#1e293b] rounded-xl border border-blue-900/40 overflow-hidden">
        <div className="px-5 py-3 bg-blue-900/20 border-b border-blue-900/40">
          <h2 className="text-sm font-semibold text-blue-300 uppercase tracking-wider">🔄 Sync Health</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-blue-900/20">
                <th className="px-5 py-2.5 text-left text-xs text-gray-500 uppercase tracking-wider">Table</th>
                {AGENT_ORDER.map(a => (
                  <th key={a} className="px-4 py-2.5 text-center text-xs uppercase tracking-wider">
                    <span className={agentColor(a)}>{a}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-900/10">
              {existingTables.map(tbl => (
                <tr key={tbl} className="hover:bg-blue-900/10 transition-colors">
                  <td className="px-5 py-2.5 text-gray-400 font-mono text-xs">{tbl}</td>
                  {AGENT_ORDER.map(agent => {
                    const cell = syncMap[tbl]?.[agent];
                    if (!cell) return <td key={agent} className="px-4 py-2.5 text-center text-gray-700 text-xs">—</td>;
                    const isOk = (cell.status === 'ok' || cell.status === 'success') && cell.failures === 0;
                    return (
                      <td key={agent} className="px-4 py-2.5 text-center">
                        <span className={`text-xs ${isOk ? 'text-green-400' : 'text-yellow-400'}`}>
                          {isOk ? '✅' : '⚠️'} {timeAgo(cell.last_sync_at)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {existingTables.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-4 text-gray-500 text-sm text-center">No sync state data</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-700 pb-4">
        BorgMind Status · Auto-refreshes every 30s · {data.fetched_at ? new Date(data.fetched_at).toLocaleString() : ''}
      </div>
    </div>
  );
}

// ─────────────── MAIN DASHBOARD ───────────────
export default function BorgMindDashboard() {
  const router = useRouter();
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'people' | 'activity' | 'memory' | 'comms' | 'vault'>('overview');

  // ── Tab persistence via URL query param ──
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const searchParams = new URLSearchParams(window.location.search);
    const tabFromUrl = searchParams.get('tab');
    const validTabs: Array<typeof activeTab> = ['overview', 'people', 'activity', 'memory', 'comms', 'vault'];
    if (tabFromUrl && validTabs.includes(tabFromUrl as typeof activeTab)) {
      setActiveTab(tabFromUrl as typeof activeTab);
    }
  }, []);

  const setTab = useCallback((tab: typeof activeTab) => {
    setActiveTab(tab);
    if (typeof window === 'undefined') return;
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('tab', tab);
    window.history.pushState({}, '', newUrl);
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/status');
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date());
      setSecondsAgo(0);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  useEffect(() => {
    const tick = setInterval(() => {
      setSecondsAgo(s => s + 1);
    }, 1000);
    return () => clearInterval(tick);
  }, [lastUpdated]);

  return (
    <div className="min-h-screen bg-[#0f172a] text-gray-100 font-mono">
      {/* Header */}
      <div className="border-b border-blue-900/50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-blue-400">
              🐝 BorgMind Status Dashboard
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Codename: BorgMind · TipInc AI · Unified Agent Memory</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 justify-end">
              {data?.db.connected ? (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-green-400 text-sm">Connected</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className="text-red-400 text-sm">{data ? 'Disconnected' : '—'}</span>
                </span>
              )}
            </div>
            {lastUpdated && (
              <p className="text-xs text-gray-500 mt-1">
                Last updated: {secondsAgo}s ago
              </p>
            )}
            <button
              onClick={fetchStatus}
              className="mt-1 text-xs text-blue-500 hover:text-blue-300 transition-colors"
            >
              ↻ Refresh
            </button>
            <button
              onClick={async () => {
                await fetch('/api/logout', { method: 'POST' });
                router.push('/login');
                router.refresh();
              }}
              className="mt-1 ml-3 text-xs text-slate-500 hover:text-red-400 transition-colors"
            >
              🚪 Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Tab Bar */}
        <div className="flex space-x-1 bg-slate-800 rounded-lg p-1 mb-6">
          {([
            { key: 'overview', label: '📊 Overview' },
            { key: 'people', label: '👥 People' },
            { key: 'activity', label: '📡 Activity Log' },
            { key: 'memory', label: '🧠 Memory Browser' },
            { key: 'comms', label: '💬 Chat Log' },
            { key: 'vault', label: '🔐 Vault' },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setTab(tab.key)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading / Error states */}
        {loading && activeTab === 'overview' && (
          <div className="flex items-center justify-center h-32">
            <div className="text-blue-400 animate-pulse text-lg">Loading BorgMind status...</div>
          </div>
        )}
        {error && !loading && activeTab === 'overview' && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 text-red-300">
            ⚠️ {error}
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'overview' && data && (
          <OverviewTab data={data} fetchStatus={fetchStatus} />
        )}
        {activeTab === 'people' && <PeopleTab />}
        {activeTab === 'activity' && <ActivityTab />}
        {activeTab === 'memory' && <MemoryTab />}
        {activeTab === 'comms' && <CommsTab />}
        {activeTab === 'vault' && <VaultTab />}
      </div>
    </div>
  );
}
