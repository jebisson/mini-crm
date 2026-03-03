import React, { useState, useEffect } from "react";
import { useMsal } from "@azure/msal-react";
import { supabase } from "../supabaseClient";
import { useUserProfile } from "../hooks/useUserProfile";
import { logActivity } from "../utils/logActivity";
import { Plus, Trash2, X, Save, CheckCircle2, Circle, Clock, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const STATUSES = {
  todo:        { label: "À faire",  badge: "badge-todo",     icon: Circle       },
  in_progress: { label: "En cours", badge: "badge-progress", icon: Clock        },
  done:        { label: "Terminé",  badge: "badge-done",     icon: CheckCircle2 },
};
const NEXT = { todo: "in_progress", in_progress: "done", done: "todo" };
const EMPTY = { title: "", description: "", due_date: "", status: "todo", contact_id: "" };

export default function TasksPage() {
  const { accounts } = useMsal();
  const userEmail = accounts[0]?.username;
  const { userProfile, isAdmin } = useUserProfile();

  const [tasks, setTasks]       = useState([]);
  const [contacts, setContacts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(EMPTY);
  const [loading, setLoading]   = useState(true);

  useEffect(() => { fetchAll(); }, [userProfile]);

  const buildTaskQuery = () => {
    let q = supabase.from("tasks").select("*, contacts(name)");
    if (!isAdmin && userProfile?.department_id) {
      q = q.eq("department_id", userProfile.department_id);
    } else if (!isAdmin) {
      q = q.eq("user_email", userEmail);
    }
    return q.order("due_date");
  };

  const fetchAll = async () => {
    setLoading(true);
    const [t, c] = await Promise.all([
      buildTaskQuery(),
      supabase.from("contacts").select("id, name").eq("user_email", userEmail).order("name"),
    ]);
    setTasks(t.data || []);
    setContacts(c.data || []);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    const { data: newTask } = await supabase.from("tasks").insert({
      ...form,
      contact_id:    form.contact_id || null,
      due_date:      form.due_date   || null,
      user_email:    userEmail,
      department_id: userProfile?.department_id ?? null,
    }).select().single();

    await logActivity(supabase, {
      userEmail,
      departmentId: userProfile?.department_id,
      entityType: "task",
      entityId: newTask?.id,
      action: `Tâche créée : ${form.title}`,
    });

    setForm(EMPTY); setShowForm(false); fetchAll();
  };

  const cycleStatus = async (task) => {
    const nextStatus = NEXT[task.status];
    await supabase.from("tasks").update({ status: nextStatus }).eq("id", task.id);
    await logActivity(supabase, {
      userEmail,
      departmentId: userProfile?.department_id,
      entityType: "task",
      entityId: task.id,
      action: `Tâche "${task.title}" → ${STATUSES[nextStatus].label}`,
    });
    fetchAll();
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm("Supprimer cette tâche ?")) return;
    await supabase.from("tasks").delete().eq("id", id);
    await logActivity(supabase, {
      userEmail,
      departmentId: userProfile?.department_id,
      entityType: "task",
      entityId: id,
      action: `Tâche supprimée : ${title}`,
    });
    fetchAll();
  };

  const todo       = tasks.filter(t => t.status === "todo");
  const inProgress = tasks.filter(t => t.status === "in_progress");
  const done       = tasks.filter(t => t.status === "done");

  const isOverdue = (task) =>
    task.due_date && task.status !== "done" && new Date(task.due_date) < new Date();

  return (
    <div className="p-8 max-w-4xl mx-auto">

      {/* ─── Header ───────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Tâches</h1>
          <p className="page-subtitle">
            {todo.length} à faire · {inProgress.length} en cours · {done.length} terminée{done.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={16} /> Nouvelle tâche
        </button>
      </div>

      {/* ─── Form ─────────────────────────────────────────── */}
      {showForm && (
        <div className="card p-6 mb-8 border-brand-gold/30">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-base font-bold text-brand-dark">Nouvelle tâche</h3>
            <button onClick={() => setShowForm(false)} className="text-brand-gray50 hover:text-brand-gray80 transition-colors">
              <X size={18} />
            </button>
          </div>
          <div className="space-y-3 mb-5">
            <input
              placeholder="Titre de la tâche *"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="input"
            />
            <input
              placeholder="Description (optionnel)"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="input"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={form.due_date}
                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                className="input"
              />
              <div className="relative">
                <select
                  value={form.contact_id}
                  onChange={e => setForm(f => ({ ...f, contact_id: e.target.value }))}
                  className="input appearance-none pr-8"
                >
                  <option value="">Aucun contact</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gray50 pointer-events-none" />
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSubmit} className="btn-primary">
              <Save size={14} /> Sauvegarder
            </button>
            <button onClick={() => setShowForm(false)} className="btn-ghost">
              <X size={14} /> Annuler
            </button>
          </div>
        </div>
      )}

      {/* ─── Task list ────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map(t => {
            const { badge } = STATUSES[t.status];
            const overdue = isOverdue(t);
            return (
              <div
                key={t.id}
                className={`card-hover px-5 py-4 flex items-center gap-4 group ${
                  t.status === "done" ? "opacity-60" : ""
                }`}
              >
                {/* Status toggle */}
                <button
                  onClick={() => cycleStatus(t)}
                  title={`Passer à : ${STATUSES[NEXT[t.status]].label}`}
                  className="flex-shrink-0 transition-transform hover:scale-110"
                >
                  {t.status === "done"
                    ? <CheckCircle2 size={22} className="text-emerald-500" />
                    : t.status === "in_progress"
                    ? <Clock size={22} className="text-brand-amber" />
                    : <Circle size={22} className="text-brand-gray20 hover:text-brand-gold transition-colors" />
                  }
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`font-display font-semibold text-sm ${t.status === "done" ? "line-through text-brand-gray50" : "text-brand-dark"}`}>
                    {t.title}
                  </p>
                  {t.description && (
                    <p className="text-xs text-brand-gray50 mt-0.5 truncate">{t.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5">
                    {t.contacts && (
                      <span className="text-xs text-brand-gray50 bg-brand-gray20/50 px-2 py-0.5 rounded-full">
                        {t.contacts.name}
                      </span>
                    )}
                    {t.due_date && (
                      <span className={`text-xs font-medium ${overdue ? "text-brand-red" : "text-brand-gray50"}`}>
                        {overdue ? "En retard · " : ""}{format(new Date(t.due_date), "d MMM yyyy", { locale: fr })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Badge */}
                <span className={badge}>{STATUSES[t.status].label}</span>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(t.id, t.title)}
                  className="p-2 text-brand-gray50 hover:text-brand-red hover:bg-brand-red/5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  title="Supprimer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}

          {tasks.length === 0 && (
            <div className="card flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-brand-gray20/50 flex items-center justify-center mb-4">
                <CheckCircle2 size={22} className="text-brand-gray50" />
              </div>
              <p className="font-display font-semibold text-brand-dark mb-1">Aucune tâche</p>
              <p className="text-sm text-brand-gray50">Créez votre première tâche pour commencer</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
