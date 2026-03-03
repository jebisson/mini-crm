# Mini CRM v2 — Spécifications complètes pour Claude Code

## Contexte
Application React existante (mini-crm) avec :
- Auth : Microsoft Entra ID (MSAL v3)
- Base de données : Supabase (PostgreSQL)
- Fonctionnalités actuelles : Contacts, Tâches, Notes

## Stack technique
- React 18
- @azure/msal-browser v3 + @azure/msal-react v2
- @supabase/supabase-js v2
- react-router-dom v6
- lucide-react
- date-fns

---

## 1. NOUVELLES TABLES SUPABASE

Exécuter ce SQL dans l'éditeur SQL de Supabase :

```sql
-- Départements
create table departments (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  color text default '#3b82f6',
  created_at timestamptz default now()
);

-- Profils utilisateurs (sync Entra ID + assignation manuelle)
create table user_profiles (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  display_name text,
  department_id uuid references departments(id) on delete set null,
  department_source text default 'manual' check (department_source in ('m365', 'manual')),
  role text default 'user' check (role in ('admin', 'manager', 'user')),
  created_at timestamptz default now(),
  last_login timestamptz
);

-- Opportunités (Pipeline Kanban global)
create table opportunities (
  id uuid default gen_random_uuid() primary key,
  contact_id uuid references contacts(id) on delete set null,
  title text not null,
  value numeric default 0,
  stage text default 'prospect' check (stage in ('prospect', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
  owner_email text not null,
  department_id uuid references departments(id) on delete set null,
  notes text,
  expected_close date,
  created_at timestamptz default now()
);

-- Historique d'activités
create table activities (
  id uuid default gen_random_uuid() primary key,
  user_email text not null,
  department_id uuid references departments(id) on delete set null,
  entity_type text check (entity_type in ('contact', 'task', 'note', 'opportunity')),
  entity_id uuid,
  action text not null,
  created_at timestamptz default now()
);

-- Modifications tables existantes
alter table tasks add column department_id uuid references departments(id) on delete set null;
alter table notes add column department_id uuid references departments(id) on delete set null;

-- RLS (Row Level Security)
alter table departments enable row level security;
alter table user_profiles enable row level security;
alter table opportunities enable row level security;
alter table activities enable row level security;

create policy "open departments" on departments for all using (true);
create policy "open profiles" on user_profiles for all using (true);
create policy "open opportunities" on opportunities for all using (true);
create policy "open activities" on activities for all using (true);

-- Départements par défaut (adapter selon votre organisation)
insert into departments (name, color) values
  ('Ventes', '#3b82f6'),
  ('Marketing', '#8b5cf6'),
  ('Support', '#10b981'),
  ('Finance', '#f59e0b'),
  ('RH', '#ec4899'),
  ('Opérations', '#6366f1'),
  ('Direction', '#ef4444');
```

---

## 2. MODIFICATION ENTRA ID (App Registration)

Dans Azure Portal → App registrations → l'app Mini CRM :

**API permissions → Ajouter :**
- Microsoft Graph → Delegated → `User.ReadBasic.All`
- (User.Read est déjà présent)
- Cliquer "Grant admin consent"

---

## 3. NOUVELLE STRUCTURE DE FICHIERS

```
src/
├── index.js
├── index.css
├── App.jsx                          ← modifier routes
├── authConfig.js                    ← inchangé
├── supabaseClient.js                ← inchangé
├── contexts/
│   └── UserProfileContext.jsx       ← NOUVEAU
├── hooks/
│   └── useUserProfile.js            ← NOUVEAU
├── components/
│   ├── Layout.jsx                   ← modifier (ajouter nav items)
│   └── DepartmentBadge.jsx          ← NOUVEAU
└── pages/
    ├── LoginPage.jsx                ← inchangé
    ├── ContactsPage.jsx             ← inchangé
    ├── TasksPage.jsx                ← modifier (filtrer par département)
    ├── NotesPage.jsx                ← modifier (filtrer par département)
    ├── DashboardPage.jsx            ← NOUVEAU
    ├── PipelinePage.jsx             ← NOUVEAU (Kanban)
    └── AdminPage.jsx                ← NOUVEAU
```

---

## 4. LOGIQUE DÉPARTEMENT (UserProfileContext)

Au login, effectuer dans l'ordre :

1. Récupérer le profil Graph API de l'utilisateur connecté :
   ```
   GET https://graph.microsoft.com/v1.0/me?$select=displayName,mail,department
   ```
   Utiliser `acquireTokenSilent` avec scope `User.Read` pour obtenir le token Graph.

2. Chercher si un `user_profiles` existe pour cet email dans Supabase.

3. Logique de synchronisation :
   - Si `department` trouvé dans M365 ET différent de celui en base → mettre à jour Supabase avec `department_source: 'm365'`
   - Si `department` trouvé dans M365 ET aucun profil en base → créer le profil avec le département correspondant (chercher par nom dans la table `departments`)
   - Si aucun `department` dans M365 ET aucun profil en base → créer profil sans département
   - Si `department_source = 'manual'` en base → ne pas écraser avec M365 (priorité à l'assignation manuelle)

4. Mettre à jour `last_login` à chaque connexion.

5. Exposer via context : `{ userProfile, department, role, isAdmin, isUnassigned, refreshProfile }`

---

## 5. RÈGLES DE VISIBILITÉ DES DONNÉES

| Entité | User | Manager | Admin |
|--------|------|---------|-------|
| Contacts | Tous (partagés) | Tous | Tous |
| Tâches | Son département seulement | Son département | Tous |
| Notes | Son département seulement | Son département | Tous |
| Opportunités | Toutes (pipeline global) | Toutes | Toutes |
| Activités | Son département | Son département | Toutes |
| Admin Panel | ✗ | ✗ | ✓ |

---

## 6. DASHBOARD (DashboardPage.jsx)

Afficher :
- **Statistiques globales** (cards en haut) :
  - Nombre total de contacts
  - Tâches en retard (due_date < aujourd'hui ET status != 'done')
  - Opportunités actives (stage != 'won' et != 'lost')
  - Valeur totale du pipeline (somme des `value` des opportunités actives)

- **Activité récente** : liste des 10 dernières activités (table `activities`) avec icône selon entity_type

- **Mes tâches urgentes** : tâches du département de l'utilisateur avec due_date dans les 7 prochains jours

- **Pipeline par stage** : mini graphique bar (recharts) montrant le nombre d'opportunités par stage

---

## 7. PIPELINE KANBAN (PipelinePage.jsx)

Colonnes (stages) dans l'ordre :
1. **Prospect** (gris)
2. **Qualifié** (bleu)
3. **Proposition** (violet)
4. **Négociation** (orange)
5. **Gagné** (vert)
6. **Perdu** (rouge)

Fonctionnalités :
- Drag & drop entre colonnes (utiliser `@hello-pangea/dnd` ou implémentation CSS simple avec boutons)
- Chaque carte affiche : titre, contact lié, valeur ($), owner, date de clôture prévue
- Bouton "Nouvelle opportunité" → formulaire modal avec champs : titre, contact (dropdown), valeur, stage, owner, date clôture, notes
- Total de la valeur affiché en bas de chaque colonne
- Filtre par département (dropdown) et par owner (dropdown)
- Cliquer sur une carte → modal détail avec historique des notes

---

## 8. ADMIN PANEL (AdminPage.jsx)

Accessible uniquement si `role === 'admin'`.

Sections :

### Gestion des utilisateurs
- Liste de tous les `user_profiles`
- Colonnes : Nom, Email, Département, Rôle, Source département (M365/Manuel), Dernier login
- Actions par utilisateur :
  - Changer le département (dropdown des départements)
  - Changer le rôle (user/manager/admin)
- Badge rouge pour les utilisateurs sans département assigné
- Filtre "Sans département" pour voir rapidement qui manque

### Gestion des départements
- Liste des départements avec couleur
- Ajouter / renommer / supprimer un département
- Voir le nombre de membres par département

### Vue globale
- Toutes les tâches de tous les départements
- Toutes les activités récentes

---

## 9. MODIFICATIONS FICHIERS EXISTANTS

### App.jsx
Ajouter les routes :
```jsx
<Route path="dashboard" element={<DashboardPage />} />
<Route path="pipeline" element={<PipelinePage />} />
<Route path="admin" element={<AdminPage />} />  // conditionnel si admin
```

### Layout.jsx
- Ajouter dans la nav : Dashboard (icône LayoutDashboard), Pipeline (icône Kanban)
- Ajouter conditionnellement : Admin (icône Shield) si `isAdmin`
- Afficher le département de l'utilisateur sous son email dans la sidebar
- Afficher une bannière d'avertissement si `isUnassigned` : "Département non assigné — contactez votre administrateur"

### TasksPage.jsx
- Filtrer les tâches par `department_id` de l'utilisateur (sauf admin qui voit tout)
- À la création d'une tâche, assigner automatiquement le `department_id` de l'utilisateur
- Logger l'activité dans la table `activities` à chaque création/modification/suppression

### NotesPage.jsx
- Même logique que TasksPage pour le filtrage par département
- Logger les activités

### ContactsPage.jsx
- Contacts restent partagés (pas de filtre département)
- Ajouter un champ "Département responsable" optionnel sur le contact
- Logger les activités

---

## 10. PACKAGE SUPPLÉMENTAIRE À INSTALLER

```bash
npm install @hello-pangea/dnd recharts
```

- `@hello-pangea/dnd` : drag & drop pour le Kanban
- `recharts` : graphiques pour le dashboard

---

## 11. COMPORTEMENT AU PREMIER LANCEMENT

1. Le premier utilisateur qui se connecte doit être promu `admin` automatiquement si aucun admin n'existe en base.
2. L'admin configure les départements si les valeurs par défaut ne conviennent pas.
3. L'admin assigne les départements aux utilisateurs sans département M365.

---

## 12. NOTES IMPORTANTES

- Ne pas casser les fonctionnalités existantes (Contacts, Tâches, Notes fonctionnent déjà)
- Garder le même design (dark theme, gris/bleu)
- Toutes les nouvelles pages doivent suivre le même style visuel que les pages existantes
- Le `userEmail` utilisé partout doit venir de `accounts[0]?.username` (MSAL)
- Toujours gérer les états loading et les cas de listes vides
