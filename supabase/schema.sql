-- =====================================================
-- TECNIYA - Schema de Base de Datos Completo
-- AFM Solutions - PostgreSQL / Supabase
-- =====================================================

-- =====================================================
-- LIMPIAR BASE DE DATOS EXISTENTE
-- =====================================================
DROP TABLE IF EXISTS public.audit_log CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.ads CASCADE;
DROP TABLE IF EXISTS public.addresses CASCADE;
DROP TABLE IF EXISTS public.favorites CASCADE;
DROP TABLE IF EXISTS public.budgets CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.urgent_requests CASCADE;
DROP TABLE IF EXISTS public.jobs CASCADE;
DROP TABLE IF EXISTS public.work_photos CASCADE;
DROP TABLE IF EXISTS public.certifications CASCADE;
DROP TABLE IF EXISTS public.professionals CASCADE;
DROP TABLE IF EXISTS public.cities CASCADE;
DROP TABLE IF EXISTS public.specialties CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- =====================================================
-- EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- Para geolocalización

-- =====================================================
-- USERS (perfiles públicos, relacionado con auth.users)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    city TEXT,
    province TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'professional', 'admin')),
    blocked BOOLEAN DEFAULT false,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SPECIALTIES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.specialties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    icon TEXT,
    category TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar especialidades por defecto
INSERT INTO public.specialties (name, icon, category) VALUES
('Plomería', 'fa-faucet', 'Técnico'),
('Electricidad', 'fa-bolt', 'Técnico'),
('Gas', 'fa-fire', 'Técnico'),
('Carpintería', 'fa-hammer', 'Técnico'),
('Pintura', 'fa-paint-roller', 'Técnico'),
('Albañilería', 'fa-bricks', 'Técnico'),
('Refrigeración', 'fa-snowflake', 'Técnico'),
('Aire Acondicionado', 'fa-wind', 'Técnico'),
('Herrería', 'fa-gears', 'Técnico'),
('Cerrajería', 'fa-key', 'Técnico'),
('Jardinería', 'fa-leaf', 'Técnico'),
('Limpieza', 'fa-broom', 'Servicios'),
('Informática', 'fa-laptop', 'Técnico'),
('TV / Electrónica', 'fa-tv', 'Técnico'),
('Mudanzas', 'fa-truck', 'Servicios'),
('Fumigación', 'fa-bug', 'Servicios'),
('Impermeabilización', 'fa-umbrella', 'Técnico'),
('Soldadura', 'fa-fire-flame-curved', 'Técnico'),
('Techista', 'fa-house-chimney', 'Técnico'),
('Tapicería', 'fa-couch', 'Técnico')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- CITIES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.cities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    province TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    population INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar ciudades principales
INSERT INTO public.cities (name, province, latitude, longitude, population) VALUES
('Buenos Aires', 'Buenos Aires', -34.6037, -58.3816, 2891082),
('Córdoba', 'Córdoba', -31.4201, -64.1888, 1395260),
('Rosario', 'Santa Fe', -32.9442, -60.6505, 1277656),
('Mendoza', 'Mendoza', -32.8895, -68.8458, 1039296),
('Tucumán', 'Tucumán', -26.8083, -65.2075, 694327),
('Salta', 'Salta', -24.7859, -65.4117, 536234),
('Neuquén', 'Neuquén', -38.9516, -68.0591, 291039),
('La Plata', 'Buenos Aires', -34.9205, -57.9536, 193144),
('Mar del Plata', 'Buenos Aires', -38.0055, -57.5426, 614350),
('San Miguel de Tucumán', 'Tucumán', -26.8305, -65.2046, 394324)
ON CONFLICT DO NOTHING;

-- =====================================================
-- PROFESSIONALS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.professionals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    specialty_id UUID REFERENCES public.specialties(id),
    specialty TEXT NOT NULL,
    description TEXT,
    city TEXT,
    province TEXT,
    zones TEXT[],
    whatsapp TEXT,
    phone TEXT,
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_featured BOOLEAN DEFAULT false,
    is_certified BOOLEAN DEFAULT false,
    is_online BOOLEAN DEFAULT false,
    avg_rating DECIMAL(3,2) DEFAULT 0,
    reviews_count INT DEFAULT 0,
    jobs_count INT DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 100,
    response_time INT DEFAULT 0, -- minutos promedio
    years_experience INT,
    hourly_rate DECIMAL(10,2),
    availability JSONB DEFAULT '{"dias": [], "desde": "08:00", "hasta": "18:00", "urgencias": false}',
    working_hours JSONB,
    featured_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsquedas geográficas
CREATE INDEX idx_professionals_location ON public.professionals(latitude, longitude);
CREATE INDEX idx_professionals_specialty ON public.professionals(specialty);
CREATE INDEX idx_professionals_city ON public.professionals(city, province);

-- =====================================================
-- CERTIFICATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.certifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    issuer TEXT,
    issue_date DATE,
    expiry_date DATE,
    document_url TEXT,
    verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES public.profiles(id),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- WORK PHOTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.work_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE,
    title TEXT,
    description TEXT,
    photo_url TEXT NOT NULL,
    thumbnail_url TEXT,
    category TEXT,
    views INT DEFAULT 0,
    likes INT DEFAULT 0,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- JOBS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    professional_id UUID REFERENCES public.profiles(id),
    specialty TEXT NOT NULL,
    description TEXT NOT NULL,
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    status TEXT DEFAULT 'solicitado' CHECK (status IN (
        'solicitado', 'notificado', 'aceptado', 'en_proceso', 
        'finalizado', 'cancelado', 'rechazado'
    )),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'urgente')),
    scheduled_date DATE,
    scheduled_time TIME,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jobs_user ON public.jobs(user_id);
CREATE INDEX idx_jobs_professional ON public.jobs(professional_id);
CREATE INDEX idx_jobs_status ON public.jobs(status);

-- =====================================================
-- URGENT REQUESTS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.urgent_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    specialty TEXT NOT NULL,
    description TEXT NOT NULL,
    radius INT DEFAULT 10,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    status TEXT DEFAULT 'solicitado' CHECK (status IN ('solicitado', 'aceptado', 'expirado', 'cancelado')),
    accepted_by UUID REFERENCES public.profiles(id),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- REVIEWS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    professional_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating DECIMAL(3,2) NOT NULL CHECK (rating >= 1 AND rating <= 5),
    puntualidad DECIMAL(3,2) CHECK (puntualidad >= 1 AND puntualidad <= 5),
    calidad DECIMAL(3,2) CHECK (calidad >= 1 AND calidad <= 5),
    precio DECIMAL(3,2) CHECK (precio >= 1 AND precio <= 5),
    comunicacion DECIMAL(3,2) CHECK (comunicacion >= 1 AND comunicacion <= 5),
    comment TEXT,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para actualizar rating del profesional
CREATE OR REPLACE FUNCTION update_professional_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.professionals
    SET 
        avg_rating = (
            SELECT COALESCE(AVG(rating), 0)
            FROM public.reviews
            WHERE professional_id = NEW.professional_id
        ),
        reviews_count = (
            SELECT COUNT(*)
            FROM public.reviews
            WHERE professional_id = NEW.professional_id
        ),
        updated_at = NOW()
    WHERE user_id = NEW.professional_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_rating ON public.reviews;
CREATE TRIGGER trigger_update_rating
AFTER INSERT OR UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION update_professional_rating();

-- =====================================================
-- SUBSCRIPTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id),
    type TEXT NOT NULL CHECK (type IN ('destacado', 'premium', 'basic')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'pending')),
    price DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'ARS',
    payment_method TEXT,
    payment_id TEXT,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    renewed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- BUDGETS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
    professional_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id),
    client_name TEXT NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    materials_cost DECIMAL(10,2),
    labor_cost DECIMAL(10,2),
    discount DECIMAL(10,2) DEFAULT 0,
    tax DECIMAL(5,2) DEFAULT 21,
    validity_days INT DEFAULT 30,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
    date DATE,
    pdf_url TEXT,
    sent_via_whatsapp BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- FAVORITES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    professional_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, professional_id)
);

-- =====================================================
-- ADDRESSES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    label TEXT DEFAULT 'Casa',
    street TEXT NOT NULL,
    number TEXT,
    apartment TEXT,
    city TEXT NOT NULL,
    province TEXT NOT NULL,
    postal_code TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_default BOOLEAN DEFAULT false,
    instructions TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ADS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    level TEXT NOT NULL CHECK (level IN ('nacional', 'provincial', 'local')),
    province TEXT,
    city TEXT,
    link TEXT,
    active BOOLEAN DEFAULT true,
    clicks INT DEFAULT 0,
    impressions INT DEFAULT 0,
    start_date DATE,
    end_date DATE,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ads_level ON public.ads(level, province, city) WHERE active = true;

-- =====================================================
-- NOTIFICATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    data JSONB,
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, read);
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);

-- =====================================================
-- CONVERSATIONS (Chat)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_one UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    participant_two UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
    last_message_at TIMESTAMPTZ,
    last_message_preview TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(participant_one, participant_two)
);

-- =====================================================
-- MESSAGES (Chat)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'file', 'location')),
    metadata JSONB,
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at);

-- =====================================================
-- AUDIT LOG
-- =====================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_table ON public.audit_log(table_name, created_at);

-- =====================================================
-- TRIGGER PARA AUDITORÍA
-- =====================================================
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    audit_row public.audit_log;
    current_user_id UUID;
BEGIN
    -- Obtener el usuario actual
    SELECT auth.uid() INTO current_user_id;
    
    audit_row := ROW(
        uuid_generate_v4(),
        current_user_id,
        TG_OP,
        TG_TABLE_NAME,
        CASE WHEN TG_OP = 'UPDATE' THEN OLD.id ELSE NEW.id END,
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
        NULL,
        NULL,
        NOW()
    );
    
    INSERT INTO public.audit_log VALUES (audit_row.*);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER AUTO-CREATE PROFILE
-- =====================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, role)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'user')
    );
    
    -- Si es profesional, crear registro
    IF COALESCE(NEW.raw_user_meta_data->>'role', 'user') = 'professional' THEN
        INSERT INTO public.professionals (user_id, specialty, city, province, description)
        VALUES (
            NEW.id,
            'General',
            '',
            '',
            ''
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- El trigger en auth.users debe crearse desde el Dashboard de Supabase
-- o ejecutar: CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- ACTUALIZAR CONTADOR DE JOBS
-- =====================================================
CREATE OR REPLACE FUNCTION update_jobs_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'finalizado' AND OLD.status != 'finalizado' THEN
        UPDATE public.professionals
        SET jobs_count = jobs_count + 1,
            updated_at = NOW()
        WHERE user_id = NEW.professional_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_jobs_count ON public.jobs;
CREATE TRIGGER trigger_update_jobs_count
AFTER UPDATE ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION update_jobs_count();

-- =====================================================
-- VISTAS ÚTILES
-- =====================================================
CREATE OR REPLACE VIEW v_professionals_public AS
SELECT 
    p.id,
    p.user_id,
    pr.full_name as name,
    pr.avatar_url,
    p.specialty,
    p.description,
    p.city,
    p.province,
    p.zones,
    p.whatsapp,
    p.is_featured,
    p.is_certified,
    p.is_online,
    p.avg_rating,
    p.reviews_count,
    p.jobs_count,
    p.success_rate,
    p.response_time,
    p.years_experience,
    p.hourly_rate,
    p.availability,
    p.created_at
FROM public.professionals p
LEFT JOIN public.profiles pr ON p.user_id = pr.id
WHERE pr.blocked = false;

CREATE OR REPLACE VIEW v_user_dashboard AS
SELECT 
    j.id,
    j.status,
    j.description,
    j.specialty,
    j.address,
    j.created_at,
    j.scheduled_date,
    p.full_name as professional_name,
    pr.specialty as professional_specialty
FROM public.jobs j
LEFT JOIN public.profiles p ON j.professional_id = p.id
LEFT JOIN public.professionals pr ON j.professional_id = pr.user_id;

-- =====================================================
-- FUNCIONES ÚTILES
-- =====================================================

-- Buscar profesionales por distancia
CREATE OR REPLACE FUNCTION get_nearby_professionals(
    lat DECIMAL,
    lon DECIMAL,
    radius_km INT DEFAULT 10,
    specialty_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    specialty TEXT,
    city TEXT,
    distance_km DECIMAL,
    avg_rating DECIMAL,
    is_online BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        pr.full_name,
        p.specialty,
        p.city,
        (6371 * acos(
            cos(radians(lat)) * cos(radians(p.latitude)) * 
            cos(radians(p.longitude) - radians(lon)) + 
            sin(radians(lat)) * sin(radians(p.latitude))
        ))::DECIMAL(10,2) as distance_km,
        p.avg_rating,
        p.is_online
    FROM public.professionals p
    LEFT JOIN public.profiles pr ON p.user_id = pr.id
    WHERE pr.blocked = false
    AND p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND (
        6371 * acos(
            cos(radians(lat)) * cos(radians(p.latitude)) * 
            cos(radians(p.longitude) - radians(lon)) + 
            sin(radians(lat)) * sin(radians(p.latitude))
        )
    ) <= radius_km
    AND (specialty_filter IS NULL OR p.specialty = specialty_filter)
    ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql;

-- Obtener estadísticas del sistema
CREATE OR REPLACE FUNCTION get_system_stats()
RETURNS TABLE (
    total_users BIGINT,
    total_professionals BIGINT,
    total_jobs BIGINT,
    total_reviews BIGINT,
    avg_rating DECIMAL,
    jobs_this_month BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM public.profiles WHERE role = 'user')::BIGINT,
        (SELECT COUNT(*) FROM public.profiles WHERE role = 'professional')::BIGINT,
        (SELECT COUNT(*) FROM public.jobs)::BIGINT,
        (SELECT COUNT(*) FROM public.reviews)::BIGINT,
        (SELECT COALESCE(AVG(avg_rating), 0) FROM public.professionals)::DECIMAL(3,2),
        (SELECT COUNT(*) FROM public.jobs WHERE created_at >= date_trunc('month', NOW()))::BIGINT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMENTARIOS
-- =====================================================
COMMENT ON TABLE public.profiles IS 'Perfiles de usuarios - relacionados con auth.users';
COMMENT ON TABLE public.professionals IS 'Información profesional extendida';
COMMENT ON TABLE public.jobs IS 'Trabajos/solicitudes de servicios';
COMMENT ON TABLE public.reviews IS 'Reseñas y calificaciones';
COMMENT ON TABLE public.subscriptions IS 'Suscripciones de profesionales destacados';
COMMENT ON TABLE public.audit_log IS 'Log de auditoría para cumplimiento';

-- =====================================================
-- FIN DEL SCHEMA
-- =====================================================
