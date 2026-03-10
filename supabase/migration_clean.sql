-- =====================================================
-- SISTEMA DE CALIFICACIÓN BIDIRECCIONAL
-- Permite que profesionales también califiquen a usuarios
-- =====================================================

-- 1. MODIFICAR TABLA REVIEWS PARA SOPORTAR BIDIRECCIONALIDAD
-- Agregar campo para indicar quién hizo la review
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS reviewer_type TEXT DEFAULT 'user' CHECK (reviewer_type IN ('user', 'professional'));

-- Agregar campo para el usuario que está siendo calificado (cuando es profesional quien califica)
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS reviewed_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Agregar índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_type ON public.reviews(reviewer_type);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_user ON public.reviews(reviewed_user_id);

-- 2. AGREGAR CAMPOS DE CALIFICACIÓN ESPECÍFICOS PARA USUARIOS
-- Cuando un profesional califica a un usuario
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS cumplimiento DECIMAL(3,2) CHECK (cumplimiento >= 1 AND cumplimiento <= 5);

ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS respeto DECIMAL(3,2) CHECK (respeto >= 1 AND respeto <= 5);

ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS claridad DECIMAL(3,2) CHECK (claridad >= 1 AND claridad <= 5);

-- 3. AGREGAR CAMPOS DE CONFIABILIDAD DEL USUARIO EN PROFILES
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS user_trust_score INT DEFAULT 100 CHECK (user_trust_score >= 0 AND user_trust_score <= 100);

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS user_avg_rating DECIMAL(3,2);

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS user_reviews_count INT DEFAULT 0;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS jobs_as_client INT DEFAULT 0;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS cancelled_as_client INT DEFAULT 0;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS reported_as_client INT DEFAULT 0;

-- 4. CREAR VISTA PARA ESTADÍSTICAS DE USUARIOS
CREATE OR REPLACE VIEW v_user_ratings AS
SELECT 
    p.id,
    p.full_name,
    p.user_trust_score,
    p.user_avg_rating,
    p.user_reviews_count,
    p.jobs_as_client,
    p.cancelled_as_client,
    p.reported_as_client,
    COALESCE(AVG(r.cumplimiento), 0) as avg_cumplimiento,
    COALESCE(AVG(r.respeto), 0) as avg_respeto,
    COALESCE(AVG(r.claridad), 0) as avg_claridad,
    COUNT(r.id) as total_reviews_received
FROM public.profiles p
LEFT JOIN public.reviews r ON r.reviewed_user_id = p.id AND r.reviewer_type = 'professional'
GROUP BY p.id, p.full_name, p.user_trust_score, p.user_avg_rating, 
         p.user_reviews_count, p.jobs_as_client, p.cancelled_as_client, p.reported_as_client;

-- 5. FUNCIÓN PARA ACTUALIZAR ESTADÍSTICAS DEL USUARIO
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.reviewer_type = 'professional' AND NEW.reviewed_user_id IS NOT NULL THEN
        -- Actualizar estadísticas del usuario
        UPDATE public.profiles
        SET 
            user_avg_rating = (
                SELECT AVG(rating)
                FROM public.reviews
                WHERE reviewed_user_id = NEW.reviewed_user_id
                AND reviewer_type = 'professional'
            ),
            user_reviews_count = (
                SELECT COUNT(*)
                FROM public.reviews
                WHERE reviewed_user_id = NEW.reviewed_user_id
                AND reviewer_type = 'professional'
            )
        WHERE id = NEW.reviewed_user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. TRIGGER PARA ACTUALIZAR ESTADÍSTICAS AUTOMÁTICAMENTE
DROP TRIGGER IF EXISTS trigger_update_user_stats ON public.reviews;
CREATE TRIGGER trigger_update_user_stats
AFTER INSERT OR UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION update_user_stats();

-- 7. FUNCIÓN PARA CALCULAR TRUST SCORE DEL USUARIO
CREATE OR REPLACE FUNCTION calculate_user_trust_score(user_id_param UUID)
RETURNS INT AS $$
DECLARE
    base_score INT := 100;
    avg_rating DECIMAL;
    reviews_count INT;
    jobs_count INT;
    cancellations INT;
    reports INT;
    final_score INT;
BEGIN
    -- Obtener datos del usuario
    SELECT 
        COALESCE(user_avg_rating, 0),
        COALESCE(user_reviews_count, 0),
        COALESCE(jobs_as_client, 0),
        COALESCE(cancelled_as_client, 0),
        COALESCE(reported_as_client, 0)
    INTO avg_rating, reviews_count, jobs_count, cancellations, reports
    FROM public.profiles
    WHERE id = user_id_param;
    
    -- Calcular score
    final_score := base_score;
    
    -- Penalizaciones por cancelaciones (cada cancelación -5 puntos)
    IF jobs_count > 0 THEN
        final_score := final_score - (cancellations * 5);
    END IF;
    
    -- Penalizaciones por reportes (cada reporte -10 puntos)
    final_score := final_score - (reports * 10);
    
    -- Bonus por buenas calificaciones
    IF reviews_count > 0 AND avg_rating >= 4.5 THEN
        final_score := final_score + 10;
    ELSIF reviews_count > 0 AND avg_rating < 3.0 THEN
        final_score := final_score - 15;
    END IF;
    
    -- Limitar entre 0 y 100
    final_score := GREATEST(0, LEAST(100, final_score));
    
    RETURN final_score;
END;
$$ LANGUAGE plpgsql;

-- 8. ACTUALIZAR TRUST SCORE DE TODOS LOS USUARIOS EXISTENTES
UPDATE public.profiles
SET user_trust_score = calculate_user_trust_score(id);

-- 9. POLÍTICAS RLS PARA REVIEWS BIDIRECCIONALES
-- Usuarios pueden ver reviews donde ellos son el reviewer o el reviewed
DROP POLICY IF EXISTS "Users can view their reviews" ON public.reviews;
CREATE POLICY "Users can view their reviews" ON public.reviews
    FOR SELECT
    USING (
        auth.uid() = user_id OR 
        auth.uid() = professional_id OR 
        auth.uid() = reviewed_user_id OR
        is_public = true
    );

-- Usuarios pueden crear reviews como clientes
DROP POLICY IF EXISTS "Users can create reviews as clients" ON public.reviews;
CREATE POLICY "Users can create reviews as clients" ON public.reviews
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND 
        reviewer_type = 'user'
    );

-- Profesionales pueden crear reviews sobre usuarios
DROP POLICY IF EXISTS "Professionals can create reviews about users" ON public.reviews;
CREATE POLICY "Professionals can create reviews about users" ON public.reviews
    FOR INSERT
    WITH CHECK (
        auth.uid() = professional_id AND 
        reviewer_type = 'professional' AND
        reviewed_user_id IS NOT NULL
    );

-- 10. COMENTARIOS EN LAS COLUMNAS
COMMENT ON COLUMN public.reviews.reviewer_type IS 'Indica quién hizo la review: user (cliente califica profesional) o professional (profesional califica cliente)';
COMMENT ON COLUMN public.reviews.reviewed_user_id IS 'ID del usuario siendo calificado (solo cuando reviewer_type = professional)';
COMMENT ON COLUMN public.reviews.cumplimiento IS 'Calificación de cumplimiento del usuario (paga a tiempo, respeta acuerdos)';
COMMENT ON COLUMN public.reviews.respeto IS 'Calificación de respeto y trato del usuario';
COMMENT ON COLUMN public.reviews.claridad IS 'Calificación de claridad en la descripción del trabajo';
COMMENT ON COLUMN public.profiles.user_trust_score IS 'Score de confiabilidad del usuario como cliente (0-100)';
COMMENT ON COLUMN public.profiles.user_avg_rating IS 'Calificación promedio del usuario recibida de profesionales';
COMMENT ON COLUMN public.profiles.user_reviews_count IS 'Cantidad de reviews recibidas de profesionales';
