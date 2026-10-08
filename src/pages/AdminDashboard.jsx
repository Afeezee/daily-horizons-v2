import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';

const TABS = [
  'Analytics',
  'Moderation',
  'Users',
  'Newsletter',
  'Agent',
  'Settings',
];

export default function AdminDashboard() {
  const [tab, setTab] = useState('Analytics');
  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-semibold mb-1">Admin</h1>
      <p className="text-slate-500 mb-6">
        Analytics, moderation, users, newsletter, agent monitoring, and settings.
      </p>
      <div className="flex gap-2 border-b mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 whitespace-nowrap ${
              tab === t
                ? 'border-b-2 border-slate-900 text-slate-900 font-medium'
                : 'text-slate-500'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 'Analytics' && <AnalyticsPanel />}
      {tab === 'Moderation' && <ModerationPanel />}
      {tab === 'Users' && <UsersPanel />}
      {tab === 'Newsletter' && <NewsletterPanel />}
      {tab === 'Agent' && <AgentPanel />}
      {tab === 'Settings' && <SettingsPanel />}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
function AnalyticsPanel() {
  const overview = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: () => api.admin.analytics.overview(),
  });
  const top = useQuery({
    queryKey: ['admin', 'top'],
    queryFn: () => api.admin.analytics.top(),
  });
  const authorship = useQuery({
    queryKey: ['admin', 'authorship'],
    queryFn: () => api.admin.analytics.authorship(),
  });
  const budget = useQuery({
    queryKey: ['admin', 'budget'],
    queryFn: () => api.admin.analytics.budget(),
  });
  const digest = useQuery({
    queryKey: ['admin', 'digest'],
    queryFn: () => api.admin.analytics.digest(),
  });

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-medium mb-2">Traffic (last 30 days)</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="py-1">Day</th>
              <th>Articles</th>
              <th>Views</th>
              <th>Likes</th>
              <th>Comments</th>
            </tr>
          </thead>
          <tbody>
            {(overview.data ?? []).map((r) => (
              <tr key={r.day} className="border-t">
                <td className="py-1">{r.day}</td>
                <td>{r.articles}</td>
                <td>{r.views}</td>
                <td>{r.likes}</td>
                <td>{r.comments}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="font-medium mb-2">Top articles</h2>
        <ul className="space-y-1 text-sm">
          {(top.data ?? []).map((a) => (
            <li key={a.id}>
              <span className="font-medium">{a.title}</span>{' '}
              <span className="text-slate-500">
                — {a.category} · {a.views_count} views
                {a.is_agent_authored ? ' · agent' : ''}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-medium mb-2">Human vs agent (30d)</h2>
        <ul className="text-sm">
          {(authorship.data ?? []).map((r) => (
            <li key={String(r.is_agent_authored)}>
              {r.is_agent_authored ? 'Agent' : 'Human'}: {r.count}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-medium mb-2">Budget today</h2>
        <pre className="bg-slate-50 p-3 rounded text-xs overflow-auto">
          {JSON.stringify(budget.data, null, 2)}
        </pre>
      </section>

      <section>
        <h2 className="font-medium mb-2">Digest sends (recent)</h2>
        <ul className="text-sm space-y-1">
          {(digest.data ?? []).slice(0, 20).map((s) => (
            <li key={s.id}>
              <span className="text-slate-500">
                {new Date(s.created_date).toLocaleString()}
              </span>{' '}
              — {s.recipient_email} — {s.status} ({s.article_count} articles)
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
function ModerationPanel() {
  const qc = useQueryClient();
  const events = useQuery({
    queryKey: ['admin', 'moderation'],
    queryFn: () => api.admin.moderation.events(),
  });
  const unpublish = useMutation({
    mutationFn: (id) => api.admin.moderation.unpublish(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'moderation'] }),
  });
  const approve = useMutation({
    mutationFn: (id) => api.admin.moderation.approve(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'moderation'] }),
  });

  return (
    <table className="w-full text-sm">
      <thead className="text-left text-slate-500">
        <tr>
          <th className="py-1">When</th>
          <th>Verdict</th>
          <th>Actor</th>
          <th>Reason</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {(events.data ?? []).map((e) => (
          <tr key={e.id} className="border-t align-top">
            <td className="py-1 whitespace-nowrap">
              {new Date(e.created_date).toLocaleString()}
            </td>
            <td>{e.verdict}</td>
            <td>{e.actor_email}</td>
            <td className="max-w-xl">{e.reason}</td>
            <td className="whitespace-nowrap">
              {e.article_id && (
                <>
                  <button
                    className="text-blue-600 mr-2"
                    onClick={() => approve.mutate(e.article_id)}
                  >
                    Approve
                  </button>
                  <button
                    className="text-red-600"
                    onClick={() => unpublish.mutate(e.article_id)}
                  >
                    Unpublish
                  </button>
                </>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ──────────────────────────────────────────────────────────────────────────
function UsersPanel() {
  const [q, setQ] = useState('');
  const qc = useQueryClient();
  const users = useQuery({
    queryKey: ['admin', 'users', q],
    queryFn: () => api.admin.users.list(q),
  });
  const update = useMutation({
    mutationFn: ({ id, patch }) => api.admin.users.update(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  return (
    <div>
      <input
        className="border rounded px-2 py-1 mb-3"
        placeholder="Search by email or name"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <table className="w-full text-sm">
        <thead className="text-left text-slate-500">
          <tr>
            <th className="py-1">Email</th>
            <th>Name</th>
            <th>Role</th>
            <th>Exempt</th>
            <th>Banned</th>
          </tr>
        </thead>
        <tbody>
          {(users.data ?? []).map((u) => (
            <tr key={u.id} className="border-t">
              <td className="py-1">{u.email}</td>
              <td>{u.display_name}</td>
              <td>
                <select
                  value={u.role}
                  onChange={(e) =>
                    update.mutate({ id: u.id, patch: { role: e.target.value } })
                  }
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={u.daily_post_limit_exempt}
                  onChange={(e) =>
                    update.mutate({
                      id: u.id,
                      patch: { daily_post_limit_exempt: e.target.checked },
                    })
                  }
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={u.is_banned}
                  onChange={(e) =>
                    update.mutate({ id: u.id, patch: { is_banned: e.target.checked } })
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
function NewsletterPanel() {
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('');
  const subs = useQuery({
    queryKey: ['admin', 'subs'],
    queryFn: () => api.admin.newsletter.subscribers(''),
  });
  const send = useMutation({
    mutationFn: () => api.admin.newsletter.send({ subject, html }),
  });

  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-medium mb-2">Compose</h2>
        <input
          className="border rounded w-full px-2 py-1 mb-2"
          placeholder="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
        <textarea
          className="border rounded w-full px-2 py-1 mb-2 min-h-[200px] font-mono text-sm"
          placeholder="HTML body"
          value={html}
          onChange={(e) => setHtml(e.target.value)}
        />
        <button
          className="px-4 py-2 bg-slate-900 text-white rounded disabled:opacity-50"
          disabled={!subject || !html || send.isPending}
          onClick={() => send.mutate()}
        >
          Send to active subscribers
        </button>
        {send.data && (
          <p className="text-green-700 mt-2 text-sm">
            Sent to {send.data.recipientCount} subscribers (campaign {send.data.campaignId}).
          </p>
        )}
        {send.error && (
          <p className="text-red-700 mt-2 text-sm">Error: {send.error.message}</p>
        )}
      </section>

      <section>
        <h2 className="font-medium mb-2">Subscribers ({subs.data?.length ?? 0})</h2>
        <ul className="text-sm max-h-96 overflow-auto">
          {(subs.data ?? []).map((s) => (
            <li key={s.id} className="border-t py-1">
              {s.email} {s.is_active ? '' : '(unsubscribed)'}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
function AgentPanel() {
  const qc = useQueryClient();
  const runs = useQuery({
    queryKey: ['admin', 'agent', 'runs'],
    queryFn: () => api.admin.agent.runs(),
    refetchInterval: 15_000,
  });
  const [queries, setQueries] = useState('Nigeria economy, Lagos');
  const [category, setCategory] = useState('');
  const [region, setRegion] = useState('all');
  const [count, setCount] = useState(1);
  const [forceReview, setForceReview] = useState(false);
  const generate = useMutation({
    mutationFn: () =>
      api.admin.agent.generate({
        queries: queries.split(',').map((s) => s.trim()).filter(Boolean),
        category: category || undefined,
        region,
        count,
        require_review: forceReview,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'agent', 'runs'] }),
  });

  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-medium mb-2">Generate now</h2>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <label className="text-sm">
            Queries (comma-separated)
            <input
              className="border rounded w-full px-2 py-1"
              value={queries}
              onChange={(e) => setQueries(e.target.value)}
            />
          </label>
          <label className="text-sm">
            Category (optional)
            <input
              className="border rounded w-full px-2 py-1"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </label>
          <label className="text-sm">
            Region
            <select
              className="border rounded w-full px-2 py-1"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            >
              <option value="all">all</option>
              <option value="global">global</option>
              <option value="nigeria">nigeria</option>
              <option value="africa">africa</option>
            </select>
          </label>
          <label className="text-sm">
            How many articles
            <input
              type="number"
              min="1"
              max="20"
              className="border rounded w-full px-2 py-1"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </label>
          <label className="text-sm col-span-2">
            <input
              type="checkbox"
              checked={forceReview}
              onChange={(e) => setForceReview(e.target.checked)}
              className="mr-2"
            />
            Force this run into pending_review (even if auto-publish is on)
          </label>
        </div>
        <button
          className="px-4 py-2 bg-slate-900 text-white rounded disabled:opacity-50"
          disabled={generate.isPending}
          onClick={() => generate.mutate()}
        >
          {generate.isPending ? 'Running…' : 'Run agent now'}
        </button>
        {generate.data && (
          <pre className="bg-slate-50 p-3 rounded text-xs mt-3 overflow-auto">
            {JSON.stringify(generate.data, null, 2)}
          </pre>
        )}
        {generate.error && (
          <p className="text-red-700 mt-2 text-sm">Error: {generate.error.message}</p>
        )}
      </section>

      <section>
        <h2 className="font-medium mb-2">Runs</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="py-1">Started</th>
              <th>Trigger</th>
              <th>Status</th>
              <th>Stories</th>
              <th>Published</th>
              <th>Tokens</th>
            </tr>
          </thead>
          <tbody>
            {(runs.data ?? []).map((r) => (
              <tr key={r.id} className="border-t">
                <td className="py-1">{new Date(r.started_at).toLocaleString()}</td>
                <td>{r.triggered_by}</td>
                <td>{r.status}</td>
                <td>{r.stories_found}</td>
                <td>{r.articles_published}</td>
                <td>{r.tokens_used}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
function SettingsPanel() {
  const qc = useQueryClient();
  const settings = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => api.admin.settings.list(),
  });
  const update = useMutation({
    mutationFn: ({ key, value }) => api.admin.settings.set(key, value),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'settings'] }),
  });

  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-medium mb-2">Platform settings</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="py-1">Key</th>
              <th>Value</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {(settings.data ?? []).map((s) => (
              <tr key={s.key} className="border-t">
                <td className="py-1 font-mono">{s.key}</td>
                <td className="font-mono text-xs">{JSON.stringify(s.value)}</td>
                <td>{s.updated_by}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="font-medium mb-2">Set a key</h2>
        <div className="flex gap-2">
          <input
            className="border rounded px-2 py-1 flex-1"
            placeholder="key (e.g. REQUIRE_ADMIN_APPROVAL)"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
          />
          <input
            className="border rounded px-2 py-1 flex-1"
            placeholder='value (JSON, e.g. true or "0 */3 * * *")'
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
          />
          <button
            className="px-4 py-2 bg-slate-900 text-white rounded"
            onClick={() =>
              update.mutate({
                key: newKey,
                value: safeParse(newValue),
              })
            }
          >
            Save
          </button>
        </div>
      </section>
    </div>
  );
}

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}
