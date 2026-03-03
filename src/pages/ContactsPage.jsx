import React, { useState, useEffect } from "react";
import { useMsal } from "@azure/msal-react";
import { supabase } from "../supabaseClient";
import { useUserProfile } from "../hooks/useUserProfile";
import { logActivity } from "../utils/logActivity";
import { Plus, Search, Trash2, Edit2, X, Save, User, Building2, Mail, Phone } from "lucide-react";

const EMPTY_FORM = { name: "", company: "", email: "", phone: "" };

export default function ContactsPage() {
  const { accounts } = useMsal();
  const userEmail = accounts[0]?.username;
  const { userProfile } = useUserProfile();
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchContacts(); }, []);

  const fetchContacts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("contacts").select("*")
      .order("created_at", { ascending: false });
    setContacts(data || []);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    if (editId) {
      await supabase.from("contacts").update(form).eq("id", editId);
      await logActivity(supabase, {
        userEmail,
        departmentId: userProfile?.department_id,
        entityType: "contact",
        entityId: editId,
        action: `Contact modifié : ${form.name}`,
      });
    } else {
      const { data: newContact } = await supabase
        .from("contacts")
        .insert({ ...form, user_email: userEmail })
        .select()
        .single();
      await logActivity(supabase, {
        userEmail,
        departmentId: userProfile?.department_id,
        entityType: "contact",
        entityId: newContact?.id,
        action: `Contact créé : ${form.name}`,
      });
    }
    setForm(EMPTY_FORM); setEditId(null); setShowForm(false);
    fetchContacts();
  };

  const handleEdit = (c) => {
    setForm({ name: c.name, company: c.company || "", email: c.email || "", phone: c.phone || "" });
    setEditId(c.id); setShowForm(true);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm("Supprimer ce contact ?")) return;
    await supabase.from("contacts").delete().eq("id", id);
    await logActivity(supabase, {
      userEmail,
      departmentId: userProfile?.department_id,
      entityType: "contact",
      entityId: id,
      action: `Contact supprimé : ${name}`,
    });
    fetchContacts();
  };

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.company || "").toLowerCase().includes(search.toLowerCase())
  );

  const initials = (name) =>
    name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  const avatarColor = (name) => {
    const colors = [
      "bg-brand-gold/20 text-brand-amber",
      "bg-emerald-100 text-emerald-700",
      "bg-sky-100 text-sky-700",
      "bg-violet-100 text-violet-700",
      "bg-rose-100 text-rose-700",
    ];
    return colors[name.charCodeAt(0) % colors.length];
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">

      {/* ─── Header ───────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Contacts</h1>
          <p className="page-subtitle">{contacts.length} contact{contacts.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => { setForm(EMPTY_FORM); setEditId(null); setShowForm(true); }}
          className="btn-primary"
        >
          <Plus size={16} /> Nouveau contact
        </button>
      </div>

      {/* ─── Search ───────────────────────────────────────── */}
      <div className="relative mb-6">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-gray50" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un contact ou une entreprise…"
          className="input pl-10"
        />
      </div>

      {/* ─── Form ─────────────────────────────────────────── */}
      {showForm && (
        <div className="card p-6 mb-6 border-brand-gold/30">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-base font-bold text-brand-dark">
              {editId ? "Modifier le contact" : "Nouveau contact"}
            </h3>
            <button onClick={() => setShowForm(false)} className="text-brand-gray50 hover:text-brand-gray80 transition-colors">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-5">
            {[
              { key: "name",    label: "Nom complet",   icon: User,      required: true  },
              { key: "company", label: "Entreprise",    icon: Building2, required: false },
              { key: "email",   label: "Adresse email", icon: Mail,      required: false },
              { key: "phone",   label: "Téléphone",     icon: Phone,     required: false },
            ].map(({ key, label, icon: Icon, required }) => (
              <div key={key} className="relative">
                <Icon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-gray50" />
                <input
                  placeholder={label + (required ? " *" : "")}
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="input pl-9"
                />
              </div>
            ))}
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

      {/* ─── List ─────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <div key={c.id} className="card-hover px-5 py-4 flex items-center gap-4 group">
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-display font-bold text-sm ${avatarColor(c.name)}`}>
                {initials(c.name)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-display font-semibold text-brand-dark text-sm truncate">{c.name}</p>
                <p className="text-xs text-brand-gray50 truncate mt-0.5">
                  {[c.company, c.email, c.phone].filter(Boolean).join("  ·  ")}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleEdit(c)}
                  className="p-2 text-brand-gray50 hover:text-brand-gold hover:bg-brand-gold/10 rounded-lg transition-all"
                  title="Modifier"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => handleDelete(c.id, c.name)}
                  className="p-2 text-brand-gray50 hover:text-brand-red hover:bg-brand-red/5 rounded-lg transition-all"
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
                <User size={22} className="text-brand-gray50" />
              </div>
              <p className="font-display font-semibold text-brand-dark mb-1">
                {search ? "Aucun résultat" : "Aucun contact"}
              </p>
              <p className="text-sm text-brand-gray50">
                {search ? "Essayez un autre terme de recherche" : "Créez votre premier contact"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
