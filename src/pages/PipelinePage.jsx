import React, { useState, useEffect } from "react";
import { useMsal } from "@azure/msal-react";
import { supabase } from "../supabaseClient";
import { useUserProfile } from "../hooks/useUserProfile";
import { logActivity } from "../utils/logActivity";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Plus, X, Save, Clock, ChevronDown, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const STAGES = [
  { key: "prospect",    label: "Prospect",     color: "#6b7280", bg: "#f3f4f6" },
  { key: "qualified",   label: "Qualifié",     color: "#3b82f6", bg: "#eff6ff" },
  { key: "proposal",    label: "Proposition",  color: "#f2b705", bg: "#fffbeb" },
  { key: "negotiation", label: "Négociation",  color: "#d97904", bg: "#fff7ed" },
  { key: "won",         label: "Gagné",        color: "#22c55e", bg: "#f0fdf4" },
  { key: "lost",        label: "Perdu",        color: "#a00021", bg: "#fff1f2" },
];

const EMPTY_OPP = {
  title: "", contact_id: "", value: "", stage: "prospect",
  owner_email: "", expected_close: "", notes: "",
};

function OppCard({ opp, index, onClick }) {
  return (
    <Draggable draggableId={String(opp.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(opp)}
          className={`bg-white rounded-xl p-4 mb-2 shadow-sm border border-brand-gray20/60 cursor-pointer hover:shadow-md transition-shadow ${
            snapshot.isDragging ? "shadow-lg rotate-1" : ""
          }`}
        >
          <p className="font-display font-semibold text-sm text-brand-dark mb-1 truncate">{opp.title}</p>
          {opp.contacts && (
            <p className="text-xs text-brand-gray50 mb-2 flex items-center gap-1">
              <User size={10} /> {opp.contacts.name}
            </p>
          )}
          <div className="flex items-center justify-between mt-1">
            {opp.value ? (
              <span className="text-xs font-bold text-brand-amber flex items-center gap-0.5">
                <Clock size={10} />{Number(opp.value).toLocaleString("fr-CA")} h
              </span>
            ) : <span />}
            {opp.expected_close && (
              <span className="text-[10px] text-brand-gray50 flex items-center gap-0.5">
                <Calendar size={9} />{format(new Date(opp.expected_close), "d MMM", { locale: fr })}
              </span>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}

export default function PipelinePage() {
  const { accounts } = useMsal();
  const userEmail = accounts[0]?.username;
  const { userProfile, isAdmin } = useUserProfile();

  const [opps, setOpps] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filterDept, setFilterDept] = useState("");
  const [filterOwner, setFilterOwner] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_OPP);
  const [detailOpp, setDetailOpp] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    let oppsQuery = supabase.from("opportunities").select("*, contacts(name, id)").order("created_at", { ascending: false });
    if (!isAdmin && userProfile?.department_id) {
      oppsQuery = oppsQuery.eq("department_id", userProfile.department_id);
    }
    const [oppsRes, contactsRes, deptsRes] = await Promise.all([
      oppsQuery,
      supabase.from("contacts").select("id, name").order("name"),
      supabase.from("departments").select("*").order("name"),
    ]);
    if (oppsRes.error) console.error("Erreur fetch opportunités:", oppsRes.error);
    setOpps(oppsRes.data || []);
    setContacts(contactsRes.data || []);
    setDepartments(deptsRes.data || []);
    setLoading(false);
  };

  const handleDragEnd = async ({ source, destination, draggableId }) => {
    if (!destination || source.droppableId === destination.droppableId) return;
    const newStage = destination.droppableId;
    setOpps(prev => prev.map(o => o.id === draggableId ? { ...o, stage: newStage } : o));
    await supabase.from("opportunities").update({ stage: newStage }).eq("id", draggableId);
    await logActivity(supabase, {
      userEmail,
      departmentId: userProfile?.department_id,
      entityType: "opportunity",
      entityId: draggableId,
      action: `Opportunité déplacée vers ${STAGES.find(s => s.key === newStage)?.label}`,
    });
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    const payload = {
      title: form.title,
      contact_id: form.contact_id || null,
      value: form.value ? Number(form.value) : null,
      stage: form.stage,
      owner_email: form.owner_email || userEmail,
      expected_close: form.expected_close || null,
      notes: form.notes || null,
      department_id: userProfile?.department_id ?? null,
    };
    const { data: newOpp, error } = await supabase.from("opportunities").insert(payload).select().single();
    if (error) {
      console.error("Erreur insert opportunité:", error);
      alert("Erreur lors de la sauvegarde : " + error.message);
      return;
    }
    await logActivity(supabase, {
      userEmail,
      departmentId: userProfile?.department_id,
      entityType: "opportunity",
      entityId: newOpp?.id,
      action: `Opportunité créée : ${form.title}`,
    });
    setForm(EMPTY_OPP);
    setShowForm(false);
    await fetchAll();
  };

  // Filter opps
  const filtered = opps.filter(o => {
    if (filterDept && o.department_id !== filterDept) return false;
    if (filterOwner && o.owner_email !== filterOwner) return false;
    return true;
  });

  const byStage = (stageKey) => filtered.filter(o => o.stage === stageKey);
  const colTotal = (stageKey) =>
    byStage(stageKey).reduce((s, o) => s + (o.value || 0), 0);

  const owners = [...new Set(opps.map(o => o.owner_email).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-24">
        <div className="w-6 h-6 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="px-8 pt-8 pb-4 flex-shrink-0">
        <div className="page-header">
          <div>
            <h1 className="page-title">Pipeline</h1>
            <p className="page-subtitle">{opps.length} opportunité{opps.length !== 1 ? "s" : ""}</p>
          </div>
          <button onClick={() => { setForm(EMPTY_OPP); setShowForm(true); }} className="btn-primary">
            <Plus size={16} /> Nouvelle opportunité
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mt-3">
          <div className="relative">
            <select
              value={filterDept}
              onChange={e => setFilterDept(e.target.value)}
              className="input appearance-none pr-8 text-sm"
            >
              <option value="">Tous les départements</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gray50 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={filterOwner}
              onChange={e => setFilterOwner(e.target.value)}
              className="input appearance-none pr-8 text-sm"
            >
              <option value="">Tous les responsables</option>
              {owners.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gray50 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* New opp form */}
      {showForm && (
        <div className="mx-8 mb-4 card p-6 border-brand-gold/30 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-brand-dark">Nouvelle opportunité</h3>
            <button onClick={() => setShowForm(false)} className="text-brand-gray50 hover:text-brand-gray80 transition-colors">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <input
              placeholder="Titre *"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="input col-span-2"
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
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gray50 pointer-events-none" />
            </div>
            <input
              type="number"
              placeholder="Heures estimées (h)"
              value={form.value}
              onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
              className="input"
            />
            <div className="relative">
              <select
                value={form.stage}
                onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}
                className="input appearance-none pr-8"
              >
                {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gray50 pointer-events-none" />
            </div>
            <input
              placeholder="Responsable (email)"
              value={form.owner_email}
              onChange={e => setForm(f => ({ ...f, owner_email: e.target.value }))}
              className="input"
            />
            <input
              type="date"
              value={form.expected_close}
              onChange={e => setForm(f => ({ ...f, expected_close: e.target.value }))}
              className="input"
            />
            <textarea
              rows={2}
              placeholder="Notes"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="input resize-none col-span-2"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={handleSubmit} className="btn-primary"><Save size={14} /> Sauvegarder</button>
            <button onClick={() => setShowForm(false)} className="btn-ghost"><X size={14} /> Annuler</button>
          </div>
        </div>
      )}

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto px-8 pb-8">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 min-w-max">
            {STAGES.map(stage => {
              const cards = byStage(stage.key);
              const total = colTotal(stage.key);
              return (
                <div key={stage.key} className="w-64 flex flex-col">
                  {/* Column header */}
                  <div
                    className="rounded-t-xl px-4 py-3 mb-1 flex items-center justify-between"
                    style={{ background: stage.bg, borderBottom: `2px solid ${stage.color}` }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: stage.color }} />
                      <span className="text-xs font-bold" style={{ color: stage.color }}>{stage.label}</span>
                    </div>
                    <span className="text-xs text-brand-gray50 font-medium">{cards.length}</span>
                  </div>

                  {/* Drop zone */}
                  <Droppable droppableId={stage.key}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 min-h-[200px] rounded-b-xl p-2 transition-colors ${
                          snapshot.isDraggingOver ? "bg-brand-gold/8" : "bg-brand-gray20/20"
                        }`}
                      >
                        {cards.map((opp, index) => (
                          <OppCard key={opp.id} opp={opp} index={index} onClick={setDetailOpp} />
                        ))}
                        {provided.placeholder}
                        {cards.length === 0 && !snapshot.isDraggingOver && (
                          <div className="flex items-center justify-center h-16">
                            <span className="text-xs text-brand-gray50/60">Glissez ici</span>
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>

                  {/* Column total */}
                  {total > 0 && (
                    <div className="text-right px-2 pt-1">
                      <span className="text-xs font-bold text-brand-amber">
                        {total.toLocaleString("fr-CA")} h
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>

      {/* Detail modal */}
      {detailOpp && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="font-display font-bold text-xl text-brand-dark">{detailOpp.title}</h3>
                <span
                  className="inline-block mt-1 text-xs font-bold px-2.5 py-0.5 rounded-full"
                  style={{
                    background: STAGES.find(s => s.key === detailOpp.stage)?.bg,
                    color: STAGES.find(s => s.key === detailOpp.stage)?.color,
                  }}
                >
                  {STAGES.find(s => s.key === detailOpp.stage)?.label}
                </span>
              </div>
              <button onClick={() => setDetailOpp(null)} className="text-brand-gray50 hover:text-brand-gray80 transition-colors">
                <X size={20} />
              </button>
            </div>

            <dl className="space-y-3 text-sm">
              {detailOpp.contacts && (
                <div className="flex gap-3">
                  <dt className="w-28 text-brand-gray50 font-medium flex-shrink-0">Contact</dt>
                  <dd className="text-brand-dark">{detailOpp.contacts.name}</dd>
                </div>
              )}
              {detailOpp.value && (
                <div className="flex gap-3">
                  <dt className="w-28 text-brand-gray50 font-medium flex-shrink-0">Heures</dt>
                  <dd className="text-brand-dark font-bold">{Number(detailOpp.value).toLocaleString("fr-CA")} h</dd>
                </div>
              )}
              {detailOpp.owner_email && (
                <div className="flex gap-3">
                  <dt className="w-28 text-brand-gray50 font-medium flex-shrink-0">Responsable</dt>
                  <dd className="text-brand-dark">{detailOpp.owner_email}</dd>
                </div>
              )}
              {detailOpp.expected_close && (
                <div className="flex gap-3">
                  <dt className="w-28 text-brand-gray50 font-medium flex-shrink-0">Date de clôture</dt>
                  <dd className="text-brand-dark">{format(new Date(detailOpp.expected_close), "d MMMM yyyy", { locale: fr })}</dd>
                </div>
              )}
              {detailOpp.notes && (
                <div className="flex gap-3">
                  <dt className="w-28 text-brand-gray50 font-medium flex-shrink-0 mt-0.5">Notes</dt>
                  <dd className="text-brand-dark whitespace-pre-wrap leading-relaxed">{detailOpp.notes}</dd>
                </div>
              )}
            </dl>

            <button
              onClick={() => setDetailOpp(null)}
              className="btn-ghost w-full mt-8"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
