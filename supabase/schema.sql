-- DramaAI Database Schema
-- Supabase SQL Editor で実行してください

-- 1. profiles テーブル（ユーザープロフィール）
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  display_name text not null default '',
  avatar_url text,
  coin_balance integer not null default 0,
  is_creator boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "自分のプロフィールを閲覧可能" on public.profiles
  for select using (auth.uid() = id);

create policy "自分のプロフィールを更新可能" on public.profiles
  for update using (auth.uid() = id);

create policy "プロフィール一覧を閲覧可能" on public.profiles
  for select using (true);

-- 2. dramas テーブル（ドラマ作品）
create table public.dramas (
  id uuid default gen_random_uuid() primary key,
  creator_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text not null default '',
  thumbnail_url text,
  genre text not null default 'drama',
  tags text[] default '{}',
  total_episodes integer not null default 0,
  total_views integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dramas enable row level security;

create policy "公開ドラマは誰でも閲覧可能" on public.dramas
  for select using (is_published = true);

create policy "クリエイターは自分のドラマを管理可能" on public.dramas
  for all using (auth.uid() = creator_id);

-- 3. episodes テーブル（エピソード）
create table public.episodes (
  id uuid default gen_random_uuid() primary key,
  drama_id uuid references public.dramas(id) on delete cascade not null,
  episode_number integer not null,
  title text not null,
  description text not null default '',
  thumbnail_url text,
  video_url text,
  cloudflare_video_id text,
  duration integer not null default 0,
  coin_price integer not null default 0,
  view_count integer not null default 0,
  is_published boolean not null default false,
  is_free boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(drama_id, episode_number)
);

alter table public.episodes enable row level security;

create policy "公開エピソードは誰でも閲覧可能" on public.episodes
  for select using (is_published = true);

create policy "クリエイターは自分のエピソードを管理可能" on public.episodes
  for all using (
    auth.uid() = (select creator_id from public.dramas where id = drama_id)
  );

-- 4. purchases テーブル（コイン購入履歴）
create table public.purchases (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  stripe_payment_intent_id text unique,
  amount_jpy integer not null,
  coin_amount integer not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.purchases enable row level security;

create policy "自分の購入履歴のみ閲覧可能" on public.purchases
  for select using (auth.uid() = user_id);

create policy "購入レコード作成可能" on public.purchases
  for insert with check (auth.uid() = user_id);

-- 5. transactions テーブル（コイン取引履歴）
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null, -- 'purchase', 'view', 'generate', 'revenue'
  amount integer not null, -- 正: 増加, 負: 消費
  balance_after integer not null,
  reference_id uuid, -- 関連するpurchase/episode/drama ID
  description text not null default '',
  created_at timestamptz not null default now()
);

alter table public.transactions enable row level security;

create policy "自分の取引履歴のみ閲覧可能" on public.transactions
  for select using (auth.uid() = user_id);

-- 6. views テーブル（視聴記録）
create table public.views (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  episode_id uuid references public.episodes(id) on delete cascade not null,
  coin_spent integer not null default 0,
  watched_at timestamptz not null default now(),
  unique(user_id, episode_id)
);

alter table public.views enable row level security;

create policy "自分の視聴記録のみ閲覧可能" on public.views
  for select using (auth.uid() = user_id);

create policy "視聴記録を作成可能" on public.views
  for insert with check (auth.uid() = user_id);

-- 7. 自動プロフィール作成トリガー
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 8. updated_at 自動更新トリガー
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at();

create trigger dramas_updated_at
  before update on public.dramas
  for each row execute procedure public.update_updated_at();

create trigger episodes_updated_at
  before update on public.episodes
  for each row execute procedure public.update_updated_at();

-- 9. コイン消費関数（アトミック処理）
create or replace function public.consume_coins(
  p_user_id uuid,
  p_episode_id uuid,
  p_amount integer
)
returns boolean as $$
declare
  v_balance integer;
begin
  -- 既に視聴済みか確認
  if exists (select 1 from public.views where user_id = p_user_id and episode_id = p_episode_id) then
    return true;
  end if;

  -- 残高確認と減算（行ロック）
  select coin_balance into v_balance
  from public.profiles
  where id = p_user_id
  for update;

  if v_balance < p_amount then
    return false;
  end if;

  -- コイン消費
  update public.profiles
  set coin_balance = coin_balance - p_amount
  where id = p_user_id;

  -- 視聴記録
  insert into public.views (user_id, episode_id, coin_spent)
  values (p_user_id, p_episode_id, p_amount);

  -- 取引履歴
  insert into public.transactions (user_id, type, amount, balance_after, reference_id, description)
  values (p_user_id, 'view', -p_amount, v_balance - p_amount, p_episode_id, 'エピソード視聴');

  -- 視聴回数加算
  update public.episodes
  set view_count = view_count + 1
  where id = p_episode_id;

  -- ドラマ総視聴数加算
  update public.dramas
  set total_views = total_views + 1
  where id = (select drama_id from public.episodes where id = p_episode_id);

  -- クリエイター収益（70%還元）
  declare
    v_creator_id uuid;
    v_creator_balance integer;
    v_revenue integer;
  begin
    v_revenue := floor(p_amount * 0.7);
    if v_revenue > 0 then
      select creator_id into v_creator_id
      from public.dramas
      where id = (select drama_id from public.episodes where id = p_episode_id);

      update public.profiles
      set coin_balance = coin_balance + v_revenue
      where id = v_creator_id
      returning coin_balance into v_creator_balance;

      insert into public.transactions (user_id, type, amount, balance_after, reference_id, description)
      values (v_creator_id, 'revenue', v_revenue, v_creator_balance, p_episode_id, 'クリエイター収益 (70%)');
    end if;
  end;

  return true;
end;
$$ language plpgsql security definer;

-- 10. コイン追加関数
create or replace function public.add_coins(
  p_user_id uuid,
  p_amount integer,
  p_purchase_id uuid
)
returns void as $$
declare
  v_balance integer;
begin
  update public.profiles
  set coin_balance = coin_balance + p_amount
  where id = p_user_id
  returning coin_balance into v_balance;

  insert into public.transactions (user_id, type, amount, balance_after, reference_id, description)
  values (p_user_id, 'purchase', p_amount, v_balance, p_purchase_id, 'コイン購入');
end;
$$ language plpgsql security definer;
