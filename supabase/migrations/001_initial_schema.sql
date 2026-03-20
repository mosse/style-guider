-- Enable the pgvector extension
create extension if not exists vector;

-- Style guide metadata
create table style_guides (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  device_token text not null,
  chunk_count integer default 0,
  created_at timestamptz default now()
);

-- Style guide chunks with embeddings
create table style_guide_chunks (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid references style_guides(id) on delete cascade,
  section_title text,
  chunk_text text not null,
  chunk_index integer not null,
  embedding vector(512),
  created_at timestamptz default now()
);

-- Index for fast vector similarity search
create index on style_guide_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Index for filtering by guide
create index on style_guide_chunks(guide_id);

-- Index for filtering by device token
create index on style_guides(device_token);

-- RPC function for vector similarity search
create or replace function match_style_guide_chunks(
  query_embedding vector(512),
  match_guide_id uuid,
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  chunk_text text,
  section_title text,
  chunk_index int,
  similarity float
)
language sql stable
as $$
  select
    sgc.id,
    sgc.chunk_text,
    sgc.section_title,
    sgc.chunk_index,
    1 - (sgc.embedding <=> query_embedding) as similarity
  from style_guide_chunks sgc
  where sgc.guide_id = match_guide_id
    and 1 - (sgc.embedding <=> query_embedding) > match_threshold
  order by sgc.embedding <=> query_embedding
  limit match_count;
$$;
