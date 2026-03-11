-- Schema para o Supabase Cloud (Multi-tenant)
-- Tabela de perfis vinculada ao auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Logs de disparo com isolamento por usuário
CREATE TABLE IF NOT EXISTS public.dispatch_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_name TEXT,
    phone TEXT,
    status TEXT,
    message_sent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configurações por usuário
CREATE TABLE IF NOT EXISTS public.user_configs (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    niche_default TEXT,
    city_default TEXT,
    whatsapp_status TEXT DEFAULT 'disconnected',
    whatsapp_number TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

ALTER TABLE public.dispatch_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own logs" ON public.dispatch_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own logs" ON public.dispatch_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.user_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own config" ON public.user_configs FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own config" ON public.user_configs FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own config" ON public.user_configs FOR INSERT WITH CHECK (auth.uid() = id);

-- Trigger: auto-criar perfil no registro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário'));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
