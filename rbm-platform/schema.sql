-- ── USUARIOS Y ROLES ─────────────────────────────────────────
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  role text not null check (role in ('productor','agencia','marca','casa_productora')),
  created_at timestamptz default now()
);

-- ── PROYECTOS ─────────────────────────────────────────────────
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client text,
  productor_id uuid references users(id),
  created_at timestamptz default now(),
  archived boolean default false
);

-- ── MIEMBROS DEL PROYECTO ─────────────────────────────────────
create table if not exists project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  role text not null check (role in ('productor','agencia','marca','casa_productora')),
  unique(project_id, user_id)
);

-- ── PIEZAS ────────────────────────────────────────────────────
create table if not exists pieces (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  tag text not null,
  name text not null,
  group_name text,
  position integer default 0,
  status text default 'pendiente' check (status in ('pendiente','cambios','aprobado')),
  priority text check (priority in ('alta','media','baja')),
  created_at timestamptz default now()
);

-- ── FEEDBACK POR ÁREA ─────────────────────────────────────────
create table if not exists piece_feedback (
  id uuid primary key default gen_random_uuid(),
  piece_id uuid references pieces(id) on delete cascade,
  area text not null check (area in ('edit','color','audio','online','vfx')),
  feedback text default '',
  status text default 'pendiente' check (status in ('pendiente','cambios','aprobado','na')),
  sources text[] default '{}',
  updated_at timestamptz default now()
);

-- ── APROBACIONES (TERMÓMETRO) ─────────────────────────────────
create table if not exists piece_approvals (
  id uuid primary key default gen_random_uuid(),
  piece_id uuid references pieces(id) on delete cascade,
  role text not null check (role in ('meta','gut','primo')),
  state text default 'idle',
  updated_at timestamptz default now(),
  unique(piece_id, role)
);

-- ── VISIBILIDAD ───────────────────────────────────────────────
create table if not exists piece_visibility (
  id uuid primary key default gen_random_uuid(),
  piece_id uuid references pieces(id) on delete cascade,
  visible_to_marca boolean default false,
  visible_to_casa boolean default false,
  updated_at timestamptz default now(),
  unique(piece_id)
);

-- ── SNAPSHOTS / HISTORIAL ─────────────────────────────────────
create table if not exists snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  ronda text,
  fecha text,
  notas text,
  data jsonb,
  created_at timestamptz default now()
);

-- ── NOTAS GENERALES POR PROYECTO ──────────────────────────────
create table if not exists project_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade unique,
  notas text default '',
  fecha text default '',
  ronda text default '',
  updated_at timestamptz default now()
);
