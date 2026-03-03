import React, { useState, useEffect } from "react";
import { useMsal } from "@azure/msal-react";
import { supabase } from "../supabaseClient";
import { useUserProfile } from "../hooks/useUserProfile";
import { Users, AlertCircle, TrendingUp, DollarSign, Clock, Activity } from "lucide-react";
import { format, addDays, isAfter, isBefore, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const STAGE_META = {
  prospect:    { label: "Prospect",      color: "#6b7280" },
  qualified:   { label: "Qualifié",      color: "#3b82f6" },
  proposal:    { label: "Proposition",   color: "#f2b705" },
  negotiation: { label: "Négociation",   color: "#d97904" },
  won:         { label: "Gagné",         color: "#22c55e" },
  lost:        { label: "Perdu",         color: "#a00021" },
};

function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="card p-6 flex items-center gap-5">
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${accent}18` }}
      >
        <Icon size={22} style={{ color: accent }} />
      </div>
      <div>
        <p className="text-2xl font-display font-black text-brand-dark">{value ?? "—"}</p>
        <p className="text-sm font-medium text-brand-gray80">{label}</p>
        {sub && <p className="text-xs text-brand-gray50 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { accounts } = useMsal();
  const userEmail = accounts[0]?.username;
  const { userProfile } = useUserProfile();

  const [stats, setStats] = useState({ contacts: null, overdue: null, active: null, pipeline: null });
  const [activities, setActivities] = useState([]);
  const [urgentTasks, setUrgentTasks] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userEmail) fetchAll();
  }, [userEmail, userProfile]);

  const fetchAll = async () => {
    setLoading(true);
    const today = startOfDay(new Date()).toISOString();
    const in7 = addDays(new Date(), 7).toISOString();

    const [
      { count: contactsCount },
      { count: overdueCount },
      oppActive,
      recentActivities,
      tasks,
    ] = await Promise.all([
      supabase.from("contacts").select("id", { count: "exact", head: true }).eq("user_email", userEmail),
      supabase.from("tasks").select("id", { count: "exact", head: true })
        .lt("due_date", today).neq("status", "done"),
      supabase.from("opportunities").select("id, value, stage").not("stage", "in", "(won,lost)"),
      supabase.from("activities").select("*").order("created_at", { ascending: false }).limit(10),
      supabase.from("tasks").select("*, contacts(name)")
        .eq("user_email", userEmail)
        .neq("status", "done")
        .gte("due_date", today)
        .lte("due_date", in7)
        .order("due_date"),
    ]);

    const activeOpps = oppActive.data || [];
    const pipelineTotal = activeOpps.reduce((s, o) => s + (o.value || 0), 0);

    // Chart: group by stage
    const stageCounts = Object.fromEntries(Object.keys(STAGE_META).map(k => [k, 0]));
    activeOpps.forEach(o => { if (stageCounts[o.stage] !== undefined) stageCounts[o.stage]++; });
    // Also fetch won/lost for chart
    const { data: allOpps } = await supabase.from("opportunities").select("stage");
    (allOpps || []).forEach(o => { if (stageCounts[o.stage] !== undefined) stageCounts[o.stage]++; });

    setStats({
      contacts: contactsCount,
      overdue: overdueCount,
      active: activeOpps.length,
      pipeline: pipelineTotal,
    });
    setActivities(recentActivities.data || []);
    setUrgentTasks(tasks.data || []);
    setChartData(
      Object.entries(STAGE_META).map(([key, meta]) => ({
        name: meta.label,
        value: stageCounts[key],
        color: meta.color,
      }))
    );
    setLoading(false);
  };

  const fmtCurrency = (n) =>
    n >= 1000 ? `${(n / 1000).toFixed(0)} k$` : `${n}$`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-24">
        <div className="w-6 h-6 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <h1 className="page-title">Tableau de bord</h1>
        <p className="page-subtitle">
          Bonjour {userProfile?.display_name?.split(" ")[0] ?? "vous"} — {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Users}       label="Contacts"              value={stats.contacts}                   accent="#e1a209" />
        <StatCard icon={AlertCircle} label="Tâches en retard"      value={stats.overdue}                    accent="#a00021" />
        <StatCard icon={TrendingUp}  label="Opportunités actives"  value={stats.active}                     accent="#3b82f6" />
        <StatCard icon={DollarSign}  label="Valeur pipeline"       value={fmtCurrency(stats.pipeline ?? 0)} accent="#22c55e" />
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Pipeline chart */}
        <div className="card p-6">
          <h2 className="font-display font-bold text-brand-dark mb-5">Pipeline par étape</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barSize={28}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#939393" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#939393" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,.1)" }}
                cursor={{ fill: "rgba(0,0,0,.04)" }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Urgent tasks */}
        <div className="card p-6">
          <h2 className="font-display font-bold text-brand-dark mb-5 flex items-center gap-2">
            <Clock size={16} className="text-brand-amber" /> Tâches urgentes (7 jours)
          </h2>
          {urgentTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-brand-gray50">Aucune tâche urgente</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {urgentTasks.map(t => (
                <li key={t.id} className="flex items-center gap-3 py-2.5 border-b border-brand-gray20/60 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-brand-dark truncate">{t.title}</p>
                    {t.contacts && <p className="text-xs text-brand-gray50">{t.contacts.name}</p>}
                  </div>
                  <span className="text-xs text-brand-amber font-medium flex-shrink-0">
                    {format(new Date(t.due_date), "d MMM", { locale: fr })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Recent activities */}
      <div className="card p-6">
        <h2 className="font-display font-bold text-brand-dark mb-5 flex items-center gap-2">
          <Activity size={16} className="text-brand-gold" /> Activités récentes
        </h2>
        {activities.length === 0 ? (
          <p className="text-sm text-brand-gray50 py-4 text-center">Aucune activité enregistrée</p>
        ) : (
          <ul className="space-y-0">
            {activities.map((a, i) => (
              <li key={a.id} className="flex items-start gap-3 py-3 border-b border-brand-gray20/60 last:border-0">
                <div className="w-2 h-2 rounded-full bg-brand-gold mt-1.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-brand-gray80">{a.action}</p>
                  <p className="text-xs text-brand-gray50 mt-0.5">
                    {a.user_email} · {format(new Date(a.created_at), "d MMM à HH:mm", { locale: fr })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
