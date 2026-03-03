import React, { useState, useEffect } from "react";
import { useMsal } from "@azure/msal-react";
import { supabase } from "../supabaseClient";
import { useUserProfile } from "../hooks/useUserProfile";
import { logActivity } from "../utils/logActivity";
import { Plus, Trash2, X, Save, FileText, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function NotesPage() {
  const { accounts } = useMsal();
  const userEmail = accounts[0]?.username;
  const { userProfile, isAdmin } = useUserProfile();

  const [notes, setNotes]                 = useState([]);
  const [contacts, setContacts]           = useState([]);
  const [showForm, setShowForm]           = useState(false);
  const [form, setForm]                   = useState({ content: "", contact_id: "" });
  const [filterContact, setFilterContact] = useState("");
  const [loading, setLoading]             = useState(true);

  useEffect(() => { fetchAll(); }, [userProfile]);

  const buildNotesQuery = () => {
    let q = supabase.from("notes").select("*, contacts(name)");
    if (!isAdmin && userProfile?.department_id) {
      q = q.eq("department_id", userProfile.department_id);
    } else if (!isAdmin) {
      q = q.eq("user_email", userEmail);
    }
    return q.order("created_at", { ascending: false });
  };

  const fetchAll = async () => {
    setLoading(true);
    const [n, c] = await Promise.all([
      buildNotesQuery(),
      supabase.from("contacts").select("id, name").order("name"),
    ]);
    setNotes(n.data || []); setContacts(c.data || []);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!form.content.trim()) return;
    const { data: newNote } = await supabase.from("notes").insert({
      content:       form.content,
      contact_id:    form.contact_id || null,
      user_email:    userEmail,
      department_id: userProfile?.department_id ?? null,
    }).select().single();

    await logActivity(supabase, {
      userEmail,
      departmentId: userProfile?.department_id,
      entityType: "note",
      entityId: newNote?.id,
      action: `Note créée`,
    });

    setForm({ content: "", contact_id: "" }); setShowForm(false); fetchAll();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cette note ?")) return;
    await supabase.from("notes").delete().eq("id", id);
    await logActivity(supabase, {
      userEmail,
      departmentId: userProfile?.department_id,
      entityType: "note",
      entityId: id,
      action: `Note supprimée`,
    });
    fetchAll();
  };

  const filtered = filterContact
    ? notes.filter(n => n.contact_id === filterContact)
    : notes;

  return (
    <div className="p-8 max-w-4xl mx-auto">

      {/* ─── Header ───────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Notes & Historique</h1>
          <p className="page-subtitle">{notes.length} note{notes.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={16} /> Nouvelle note
        </button>
      </div>

      {/* ─── Filter ───────────────────────────────────────── */}
      <div className="relative mb-6 inline-block">
        <select
          value={filterContact}
          onChange={e => setFilterContact(e.target.value)}
          className="input appearance-none pr-8 min-w-[220px]"
        >
          <option value="">Tous les contacts</option>
          {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gray50 pointer-events-none" />
      </div>

      {/* ─── Form ─────────────────────────────────────────── */}
      {showForm && (
        <div className="card p-6 mb-6 border-brand-gold/30">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-base font-bold text-brand-dark">Nouvelle note</h3>
            <button onClick={() => setShowForm(false)} className="text-brand-gray50 hover:text-brand-gray80 transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="relative mb-3">
            <select
              value={form.contact_id}
              onChange={e => setForm(f => ({ ...f, contact_id: e.target.value }))}
              className="input appearance-none pr-8"
            >
              <option value="">Aucun contact associé</option>
              {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gray50 pointer-events-none" />
          </div>

          <textarea
            rows={5}
            placeholder="Contenu de la note…"
            value={form.content}
            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            className="input resize-none mb-5"
          />

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

      {/* ─── Notes list ───────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(n => (
            <div key={n.id} className="card-hover p-5 group">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-brand-gold/10 flex items-center justify-center mt-0.5">
                  <FileText size={16} className="text-brand-amber" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {n.contacts && (
                    <span className="inline-flex items-center text-xs font-semibold text-brand-amber bg-brand-gold/10 px-2.5 py-0.5 rounded-full mb-2">
                      {n.contacts.name}
                    </span>
                  )}
                  <p className="text-sm text-brand-gray80 whitespace-pre-wrap leading-relaxed">
                    {n.content}
                  </p>
                  <p className="text-xs text-brand-gray50 mt-2">
                    {format(new Date(n.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                  </p>
                </div>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(n.id)}
                  className="p-2 text-brand-gray50 hover:text-brand-red hover:bg-brand-red/5 rounded-lg transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
                  title="Supprimer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="card flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-brand-gray20/50 flex items-center justify-center mb-4">
                <FileText size={22} className="text-brand-gray50" />
              </div>
              <p className="font-display font-semibold text-brand-dark mb-1">
                {filterContact ? "Aucune note pour ce contact" : "Aucune note"}
              </p>
              <p className="text-sm text-brand-gray50">
                {filterContact ? "Sélectionnez un autre contact" : "Ajoutez votre première note"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
