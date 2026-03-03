import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useUserProfile } from "../hooks/useUserProfile";
import { Plus, Save, Trash2, X, ChevronDown, Users, Building2, Globe } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const ROLES = ["user", "manager", "admin"];

// ── Users tab ────────────────────────────────────────────────────────────────
function UsersTab({ departments }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterUnassigned, setFilterUnassigned] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("user_profiles")
      .select("*, departments(name)")
      .order("display_name");
    setUsers(data || []);
    setLoading(false);
  };

  const updateUser = async (id, patch) => {
    await supabase.from("user_profiles").update(patch).eq("id", id);
    fetchUsers();
  };

  const displayed = filterUnassigned ? users.filter(u => !u.department_id) : users;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <label className="flex items-center gap-2 text-sm text-brand-gray80 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filterUnassigned}
            onChange={e => setFilterUnassigned(e.target.checked)}
            className="rounded border-brand-gray50 text-brand-gold focus:ring-brand-gold"
          />
          Afficher seulement sans département
        </label>
        <span className="text-xs text-brand-gray50 ml-auto">{users.length} utilisateur{users.length !== 1 ? "s" : ""}</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-gray20 text-left">
                <th className="pb-3 font-semibold text-brand-gray50 pr-4">Utilisateur</th>
                <th className="pb-3 font-semibold text-brand-gray50 pr-4">Département</th>
                <th className="pb-3 font-semibold text-brand-gray50 pr-4">Rôle</th>
                <th className="pb-3 font-semibold text-brand-gray50">Dernière connexion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-gray20/60">
              {displayed.map(u => (
                <tr key={u.id} className="hover:bg-brand-gray20/20 transition-colors">
                  <td className="py-3 pr-4">
                    <div>
                      <p className="font-semibold text-brand-dark">{u.display_name}</p>
                      <p className="text-xs text-brand-gray50">{u.email}</p>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="relative">
                      <select
                        value={u.department_id ?? ""}
                        onChange={e => updateUser(u.id, {
                          department_id: e.target.value || null,
                          department_source: "manual",
                        })}
                        className="input appearance-none pr-8 text-sm py-1.5"
                      >
                        <option value="">
                          {!u.department_id ? "⚠ Sans département" : "Aucun"}
                        </option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                      <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-gray50 pointer-events-none" />
                    </div>
                    {!u.department_id && (
                      <span className="inline-block mt-1 text-[10px] font-bold text-brand-red bg-brand-red/10 px-2 py-0.5 rounded-full">
                        Non assigné
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="relative">
                      <select
                        value={u.role}
                        onChange={e => updateUser(u.id, { role: e.target.value })}
                        className="input appearance-none pr-8 text-sm py-1.5"
                      >
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-gray50 pointer-events-none" />
                    </div>
                  </td>
                  <td className="py-3 text-xs text-brand-gray50">
                    {u.last_login
                      ? format(new Date(u.last_login), "d MMM yyyy, HH:mm", { locale: fr })
                      : "—"}
                  </td>
                </tr>
              ))}
              {displayed.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-brand-gray50">
                    Aucun utilisateur trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Departments tab ───────────────────────────────────────────────────────────
function DepartmentsTab() {
  const [depts, setDepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#e1a209");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");

  useEffect(() => { fetchDepts(); }, []);

  const fetchDepts = async () => {
    setLoading(true);
    const { data } = await supabase.from("departments").select("*, user_profiles(id)").order("name");
    setDepts(data || []);
    setLoading(false);
  };

  const addDept = async () => {
    if (!newName.trim()) return;
    await supabase.from("departments").insert({ name: newName.trim(), color: newColor });
    setNewName(""); fetchDepts();
  };

  const saveDept = async (id) => {
    if (!editName.trim()) return;
    await supabase.from("departments").update({ name: editName.trim() }).eq("id", id);
    setEditId(null); fetchDepts();
  };

  const deleteDept = async (id) => {
    if (!window.confirm("Supprimer ce département ? Les utilisateurs seront désassignés.")) return;
    await supabase.from("departments").delete().eq("id", id);
    fetchDepts();
  };

  return (
    <div>
      {/* Add form */}
      <div className="flex gap-3 mb-6">
        <input
          placeholder="Nom du département"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addDept()}
          className="input flex-1"
        />
        <input
          type="color"
          value={newColor}
          onChange={e => setNewColor(e.target.value)}
          className="w-10 h-10 rounded-lg border border-brand-gray20 cursor-pointer p-0.5"
          title="Couleur"
        />
        <button onClick={addDept} className="btn-primary">
          <Plus size={15} /> Ajouter
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <ul className="space-y-2">
          {depts.map(d => {
            const memberCount = d.user_profiles?.length ?? 0;
            return (
              <li key={d.id} className="card-hover px-5 py-3.5 flex items-center gap-4 group">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: d.color || "#e1a209" }}
                />
                {editId === d.id ? (
                  <>
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && saveDept(d.id)}
                      className="input flex-1 py-1.5 text-sm"
                      autoFocus
                    />
                    <button onClick={() => saveDept(d.id)} className="p-2 text-brand-gold hover:bg-brand-gold/10 rounded-lg transition-all">
                      <Save size={14} />
                    </button>
                    <button onClick={() => setEditId(null)} className="p-2 text-brand-gray50 hover:bg-brand-gray20 rounded-lg transition-all">
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <span
                      className="flex-1 font-semibold text-sm text-brand-dark cursor-pointer hover:text-brand-amber transition-colors"
                      onDoubleClick={() => { setEditId(d.id); setEditName(d.name); }}
                    >
                      {d.name}
                    </span>
                    <span className="text-xs text-brand-gray50">{memberCount} membre{memberCount !== 1 ? "s" : ""}</span>
                    <button
                      onClick={() => deleteDept(d.id)}
                      className="p-2 text-brand-gray50 hover:text-brand-red hover:bg-brand-red/5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </li>
            );
          })}
          {depts.length === 0 && (
            <div className="card flex flex-col items-center justify-center py-12 text-center">
              <Building2 size={24} className="text-brand-gray50 mb-3" />
              <p className="font-display font-semibold text-brand-dark">Aucun département</p>
              <p className="text-sm text-brand-gray50 mt-1">Créez le premier département ci-dessus</p>
            </div>
          )}
        </ul>
      )}
    </div>
  );
}

// ── Global view tab ───────────────────────────────────────────────────────────
function GlobalTab() {
  const [tasks, setTasks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [t, a] = await Promise.all([
      supabase.from("tasks").select("*, contacts(name), departments(name)").order("due_date"),
      supabase.from("activities").select("*").order("created_at", { ascending: false }).limit(20),
    ]);
    setTasks(t.data || []);
    setActivities(a.data || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* All tasks */}
      <div>
        <h3 className="font-display font-bold text-brand-dark mb-4">
          Toutes les tâches ({tasks.length})
        </h3>
        <ul className="space-y-2">
          {tasks.slice(0, 30).map(t => (
            <li key={t.id} className="card px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-brand-dark truncate">{t.title}</p>
                  <p className="text-xs text-brand-gray50 mt-0.5">
                    {t.user_email}
                    {t.departments && ` · ${t.departments.name}`}
                  </p>
                </div>
                {t.due_date && (
                  <span className="text-xs text-brand-gray50 flex-shrink-0 ml-3">
                    {format(new Date(t.due_date), "d MMM", { locale: fr })}
                  </span>
                )}
              </div>
            </li>
          ))}
          {tasks.length === 0 && (
            <li className="card py-8 text-center text-brand-gray50 text-sm">Aucune tâche</li>
          )}
        </ul>
      </div>

      {/* Recent activities */}
      <div>
        <h3 className="font-display font-bold text-brand-dark mb-4">Dernières activités</h3>
        <ul className="space-y-2">
          {activities.map(a => (
            <li key={a.id} className="card px-4 py-3">
              <p className="text-sm text-brand-gray80">{a.action}</p>
              <p className="text-xs text-brand-gray50 mt-0.5">
                {a.user_email} · {format(new Date(a.created_at), "d MMM, HH:mm", { locale: fr })}
              </p>
            </li>
          ))}
          {activities.length === 0 && (
            <li className="card py-8 text-center text-brand-gray50 text-sm">Aucune activité</li>
          )}
        </ul>
      </div>
    </div>
  );
}

// ── Main AdminPage ────────────────────────────────────────────────────────────
const TABS = [
  { key: "users",   label: "Utilisateurs", icon: Users      },
  { key: "depts",   label: "Départements", icon: Building2  },
  { key: "global",  label: "Vue globale",  icon: Globe      },
];

export default function AdminPage() {
  const { isAdmin } = useUserProfile();
  const [tab, setTab] = useState("users");
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    supabase.from("departments").select("*").order("name").then(({ data }) => setDepartments(data || []));
  }, []);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24">
        <p className="font-display font-bold text-brand-dark text-lg">Accès refusé</p>
        <p className="text-sm text-brand-gray50 mt-2">Cette page est réservée aux administrateurs.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="page-header mb-8">
        <div>
          <h1 className="page-title">Administration</h1>
          <p className="page-subtitle">Gestion des utilisateurs et des départements</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-brand-gray20/40 rounded-xl p-1 mb-8 w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
              tab === key
                ? "bg-white text-brand-dark shadow-sm"
                : "text-brand-gray50 hover:text-brand-gray80"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {tab === "users"  && <UsersTab departments={departments} />}
        {tab === "depts"  && <DepartmentsTab />}
        {tab === "global" && <GlobalTab />}
      </div>
    </div>
  );
}
