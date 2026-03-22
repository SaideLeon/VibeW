-- ============================================================
-- SCHEMA: Copiloto Académico
-- ============================================================

-- Habilitar extensão UUID
create extension if not exists "uuid-ossp";

-- ── Trabalhos ─────────────────────────────────────────────
create table trabalhos (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  titulo      text not null default 'Sem título',
  tema        text not null,
  norma       text not null default 'APA',
  created_at  timestamptz default now()
);

alter table trabalhos enable row level security;
create policy "Utilizador vê os seus trabalhos"
  on trabalhos for all
  using (auth.uid() = user_id);

-- ── Fichas técnicas ───────────────────────────────────────
create table fichas_tecnicas (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  trabalho_id  uuid references trabalhos(id) on delete cascade,
  titulo       text not null,
  autor        text not null,
  ano          int,
  conteudo     text not null,   -- corpo da ficha / pesquisa qualitativa
  fonte_apa    text not null,   -- ex: "Silva, J. (2020). Título. Editora."
  created_at   timestamptz default now()
);

alter table fichas_tecnicas enable row level security;
create policy "Utilizador gere as suas fichas"
  on fichas_tecnicas for all
  using (auth.uid() = user_id);

-- ── Estrutura / Índice ────────────────────────────────────
create type status_seccao as enum (
  'pendente', 'aprovada', 'a_gerar', 'escrita', 'editada'
);

create table estrutura (
  id               uuid primary key default uuid_generate_v4(),
  trabalho_id      uuid references trabalhos(id) on delete cascade not null,
  capitulo_index   int not null,
  seccao_index     int not null,
  titulo_capitulo  text not null,
  titulo_seccao    text not null,
  status           status_seccao default 'pendente',
  created_at       timestamptz default now(),
  unique (trabalho_id, capitulo_index, seccao_index)
);

alter table estrutura enable row level security;
create policy "Utilizador vê estrutura dos seus trabalhos"
  on estrutura for all
  using (
    exists (
      select 1 from trabalhos t
      where t.id = estrutura.trabalho_id
        and t.user_id = auth.uid()
    )
  );

-- ── Secções ───────────────────────────────────────────────
create table seccoes (
  id                  uuid primary key default uuid_generate_v4(),
  estrutura_id        uuid references estrutura(id) on delete cascade not null,
  trabalho_id         uuid references trabalhos(id) on delete cascade not null,
  capitulo_index      int not null,
  seccao_index        int not null,
  conteudo_markdown   text not null default '',
  referencias_apa     text[] default '{}',
  versao              int default 1,
  updated_at          timestamptz default now(),
  unique (trabalho_id, capitulo_index, seccao_index)
);

alter table seccoes enable row level security;
create policy "Utilizador vê secções dos seus trabalhos"
  on seccoes for all
  using (
    exists (
      select 1 from trabalhos t
      where t.id = seccoes.trabalho_id
        and t.user_id = auth.uid()
    )
  );

-- ── Mensagens do chat ─────────────────────────────────────
create type role_msg as enum ('user', 'assistant');
create type tipo_agente as enum ('planificador', 'desenvolvedor', 'editor');

create table mensagens (
  id           uuid primary key default uuid_generate_v4(),
  trabalho_id  uuid references trabalhos(id) on delete cascade not null,
  user_id      uuid references auth.users(id) on delete cascade not null,
  role         role_msg not null,
  agent_type   tipo_agente,
  content      text not null,
  metadata     jsonb default '{}',  -- índice gerado, seccao_id, etc.
  created_at   timestamptz default now()
);

alter table mensagens enable row level security;
create policy "Utilizador vê as suas mensagens"
  on mensagens for all
  using (auth.uid() = user_id);

-- ── Índices para acesso rápido por matriz [i][j] ──────────
create index idx_estrutura_matrix on estrutura(trabalho_id, capitulo_index, seccao_index);
create index idx_seccoes_matrix   on seccoes(trabalho_id, capitulo_index, seccao_index);
create index idx_mensagens_trabalho on mensagens(trabalho_id, created_at);
create index idx_fichas_trabalho on fichas_tecnicas(trabalho_id);
