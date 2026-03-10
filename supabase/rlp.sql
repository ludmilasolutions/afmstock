-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- TECNIYA - AFM Solutions
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.urgent_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPERS
-- =====================================================

-- Función para verificar si usuario es admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
$$ LANGUAGE sql SECURITY DEFINER;

-- Función para verificar si usuario es profesional
CREATE OR REPLACE FUNCTION is_professional()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'professional'
    );
$$ LANGUAGE sql SECURITY DEFINER;

-- Función para obtener ID de profesional desde user_id
CREATE OR REPLACE FUNCTION get_professional_id(user_uuid UUID)
RETURNS UUID AS $$
    SELECT id FROM public.professionals WHERE user_id = user_uuid LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- =====================================================
-- PROFILES
-- =====================================================

-- Cualquiera puede leer perfiles públicos
CREATE POLICY "Public profiles are viewable by everyone"
    ON public.profiles FOR SELECT
    TO anon, authenticated
    USING (blocked = false);

-- Usuarios pueden actualizar su propio perfil
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid());

-- Solo admins pueden ver todos los perfiles
CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        id = auth.uid() OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Solo admins pueden actualizar otros perfiles
CREATE POLICY "Admins can update profiles"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (is_admin());

-- Solo admins pueden crear perfiles
CREATE POLICY "Admins can insert profiles"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (is_admin());

-- =====================================================
-- SPECIALTIES
-- =====================================================

-- Cualquiera puede leer especialidades
CREATE POLICY "Specialties are public"
    ON public.specialties FOR SELECT
    TO anon, authenticated
    USING (is_active = true);

-- Solo admins pueden modificar
CREATE POLICY "Admins manage specialties"
    ON public.specialties FOR ALL
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- =====================================================
-- CITIES
-- =====================================================

CREATE POLICY "Cities are public"
    ON public.cities FOR SELECT
    TO anon, authenticated
    USING (true);

-- =====================================================
-- PROFESSIONALS
-- =====================================================

-- Cualquiera puede ver profesionales públicos
CREATE POLICY "Public professionals are viewable"
    ON public.professionals FOR SELECT
    TO anon, authenticated
    USING (
        user_id IN (SELECT id FROM public.profiles WHERE blocked = false)
    );

-- Profesionales pueden actualizar su propio perfil
CREATE POLICY "Professionals can update own profile"
    ON public.professionals FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- Usuarios pueden ver profesionales (lectura)
CREATE POLICY "Users can read professionals"
    ON public.professionals FOR SELECT
    TO authenticated
    USING (true);

-- Solo admins pueden insertar/eliminar
CREATE POLICY "Admins manage professionals"
    ON public.professionals FOR INSERT
    TO authenticated
    WITH CHECK (is_admin() OR user_id = auth.uid());

CREATE POLICY "Admins delete professionals"
    ON public.professionals FOR DELETE
    TO authenticated
    USING (is_admin());

-- =====================================================
-- CERTIFICATIONS
-- =====================================================

-- Profesionales pueden gestionar sus propias certificaciones
CREATE POLICY "Professionals manage own certifications"
    ON public.certifications FOR ALL
    TO authenticated
    USING (
        professional_id IN (
            SELECT id FROM public.professionals 
            WHERE user_id = auth.uid()
        )
    );

-- Cualquiera puede ver certificaciones verificadas
CREATE POLICY "Verified certifications are public"
    ON public.certifications FOR SELECT
    TO anon, authenticated
    USING (verified = true);

-- =====================================================
-- WORK PHOTOS
-- =====================================================

-- Profesionales pueden gestionar sus fotos
CREATE POLICY "Professionals manage own photos"
    ON public.work_photos FOR ALL
    TO authenticated
    USING (
        professional_id IN (
            SELECT id FROM public.professionals 
            WHERE user_id = auth.uid()
        )
    );

-- Cualquiera puede ver fotos públicas
CREATE POLICY "Public work photos are viewable"
    ON public.work_photos FOR SELECT
    TO anon, authenticated
    USING (is_public = true);

-- =====================================================
-- JOBS
-- =====================================================

-- Usuarios pueden ver sus propios trabajos
CREATE POLICY "Users can view own jobs"
    ON public.jobs FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid() OR 
        professional_id = auth.uid() OR
        is_admin()
    );

-- Usuarios pueden crear trabajos
CREATE POLICY "Users can create jobs"
    ON public.jobs FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Profesionales pueden actualizar trabajos relacionados
CREATE POLICY "Professionals can update own jobs"
    ON public.jobs FOR UPDATE
    TO authenticated
    USING (
        professional_id = auth.uid() OR
        user_id = auth.uid() OR
        is_admin()
    );

-- =====================================================
-- URGENT REQUESTS
-- =====================================================

-- Usuarios pueden ver sus propias solicitudes urgentes
CREATE POLICY "Users can view own urgent requests"
    ON public.urgent_requests FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid() OR
        accepted_by = auth.uid() OR
        is_admin()
    );

-- Usuarios pueden crear solicitudes urgentes
CREATE POLICY "Users can create urgent requests"
    ON public.urgent_requests FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Profesionales pueden ver solicitudes en su zona
CREATE POLICY "Professionals can view nearby urgent requests"
    ON public.urgent_requests FOR SELECT
    TO authenticated
    USING (
        status = 'solicitado' OR
        accepted_by = auth.uid() OR
        is_admin()
    );

-- =====================================================
-- REVIEWS
-- =====================================================

-- Cualquiera puede leer reseñas públicas
CREATE POLICY "Public reviews are viewable"
    ON public.reviews FOR SELECT
    TO anon, authenticated
    USING (
        is_public = true OR 
        user_id = auth.uid() OR 
        professional_id = auth.uid() OR
        is_admin()
    );

-- Solo usuarios pueden crear reseñas (después de trabajo completado)
CREATE POLICY "Users can create reviews"
    ON public.reviews FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.jobs 
            WHERE id = job_id 
            AND user_id = auth.uid() 
            AND status = 'finalizado'
        )
    );

-- Usuarios pueden actualizar/eliminar sus propias reseñas
CREATE POLICY "Users can manage own reviews"
    ON public.reviews FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- =====================================================
-- SUBSCRIPTIONS
-- =====================================================

-- Usuarios pueden ver sus propias suscripciones
CREATE POLICY "Users can view own subscriptions"
    ON public.subscriptions FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid() OR
        professional_id = auth.uid() OR
        is_admin()
    );

-- Solo admins pueden gestionar suscripciones
CREATE POLICY "Admins manage subscriptions"
    ON public.subscriptions FOR ALL
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- =====================================================
-- BUDGETS
-- =====================================================

-- Usuarios y profesionales pueden ver presupuestos relacionados
CREATE POLICY "Related budgets are viewable"
    ON public.budgets FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid() OR
        professional_id = auth.uid() OR
        is_admin()
    );

-- Profesionales pueden crear presupuestos
CREATE POLICY "Professionals can create budgets"
    ON public.budgets FOR INSERT
    TO authenticated
    WITH CHECK (
        professional_id = auth.uid() OR
        is_admin()
    );

-- Usuarios pueden actualizar estado de presupuestos
CREATE POLICY "Users can update own budgets"
    ON public.budgets FOR UPDATE
    TO authenticated
    USING (
        user_id = auth.uid() OR
        professional_id = auth.uid() OR
        is_admin()
    );

-- =====================================================
-- FAVORITES
-- =====================================================

-- Usuarios pueden gestionar sus favoritos
CREATE POLICY "Users manage own favorites"
    ON public.favorites FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- =====================================================
-- ADDRESSES
-- =====================================================

-- Usuarios pueden gestionar sus direcciones
CREATE POLICY "Users manage own addresses"
    ON public.addresses FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- =====================================================
-- ADS
-- =====================================================

-- Cualquiera puede ver ads activas
CREATE POLICY "Active ads are viewable"
    ON public.ads FOR SELECT
    TO anon, authenticated
    USING (active = true);

-- Solo admins pueden gestionar ads
CREATE POLICY "Admins manage ads"
    ON public.ads FOR ALL
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- =====================================================
-- NOTIFICATIONS
-- =====================================================

-- Usuarios ven solo sus notificaciones
CREATE POLICY "Users view own notifications"
    ON public.notifications FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- =====================================================
-- CONVERSATIONS
-- =====================================================

-- Participantes ven sus conversaciones
CREATE POLICY "Participants view own conversations"
    ON public.conversations FOR SELECT
    TO authenticated
    USING (
        participant_one = auth.uid() OR 
        participant_two = auth.uid()
    );

-- Usuarios pueden crear conversaciones
CREATE POLICY "Users create conversations"
    ON public.conversations FOR INSERT
    TO authenticated
    WITH CHECK (
        participant_one = auth.uid() OR 
        participant_two = auth.uid()
    );

-- Participantes pueden actualizar conversaciones
CREATE POLICY "Participants update conversations"
    ON public.conversations FOR UPDATE
    TO authenticated
    USING (
        participant_one = auth.uid() OR 
        participant_two = auth.uid()
    );

-- =====================================================
-- MESSAGES
-- =====================================================

-- Participantes ven sus mensajes
CREATE POLICY "Participants view own messages"
    ON public.messages FOR SELECT
    TO authenticated
    USING (
        sender_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE id = conversation_id
            AND (participant_one = auth.uid() OR participant_two = auth.uid())
        )
    );

-- Participantes pueden enviar mensajes
CREATE POLICY "Participants send messages"
    ON public.messages FOR INSERT
    TO authenticated
    WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE id = conversation_id
            AND (participant_one = auth.uid() OR participant_two = auth.uid())
        )
    );

-- =====================================================
-- AUDIT LOG (solo admins pueden ver)
-- =====================================================

CREATE POLICY "Admins view audit log"
    ON public.audit_log FOR SELECT
    TO authenticated
    USING (is_admin());

-- =====================================================
-- SECURITY
-- =====================================================

-- Función de seguridad: verificar acceso a recurso
CREATE OR REPLACE FUNCTION can_access_resource(resource_owner UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN resource_owner = auth.uid() OR is_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Prevenir acceso a usuarios bloqueados (función en schema público)
-- Esta función debe crearse en public schema
CREATE OR REPLACE FUNCTION public.check_auth()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND blocked = true) THEN
        RAISE EXCEPTION 'Usuario bloqueado';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FIN POLÍTICAS RLS
-- =====================================================
