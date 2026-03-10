-- =============================================
-- POLÍTICAS RLS PARA STORAGE - EJECUTAR UNA POR UNA
-- =============================================

-- 1. AVATARS - Lectura pública
CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT USING ( bucket_id = 'avatars' );

-- 2. AVATARS - Upload/Update/Delete para usuarios autenticados
CREATE POLICY "Auth upload avatars" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );

CREATE POLICY "Auth update avatars" ON storage.objects FOR UPDATE USING ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );

CREATE POLICY "Auth delete avatars" ON storage.objects FOR DELETE USING ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );

-- 3. WORK-PHOTOS - Lectura pública
CREATE POLICY "Public read work-photos" ON storage.objects FOR SELECT USING ( bucket_id = 'work-photos' );

-- 4. WORK-PHOTOS - Upload/Update/Delete
CREATE POLICY "Auth upload work-photos" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'work-photos' AND auth.role() = 'authenticated' );

CREATE POLICY "Auth update work-photos" ON storage.objects FOR UPDATE USING ( bucket_id = 'work-photos' AND auth.role() = 'authenticated' );

CREATE POLICY "Auth delete work-photos" ON storage.objects FOR DELETE USING ( bucket_id = 'work-photos' AND auth.role() = 'authenticated' );

-- 5. CERTIFICATIONS - Lectura pública
CREATE POLICY "Public read certifications" ON storage.objects FOR SELECT USING ( bucket_id = 'certifications' );

-- 6. CERTIFICATIONS - Upload/Update/Delete
CREATE POLICY "Auth upload certifications" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'certifications' AND auth.role() = 'authenticated' );

CREATE POLICY "Auth update certifications" ON storage.objects FOR UPDATE USING ( bucket_id = 'certifications' AND auth.role() = 'authenticated' );

CREATE POLICY "Auth delete certifications" ON storage.objects FOR DELETE USING ( bucket_id = 'certifications' AND auth.role() = 'authenticated' );

-- 7. ADS - Lectura pública
CREATE POLICY "Public read ads" ON storage.objects FOR SELECT USING ( bucket_id = 'ads' );

-- 8. ADS - Upload/Update/Delete
CREATE POLICY "Auth upload ads" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'ads' AND auth.role() = 'authenticated' );

CREATE POLICY "Auth update ads" ON storage.objects FOR UPDATE USING ( bucket_id = 'ads' AND auth.role() = 'authenticated' );

CREATE POLICY "Auth delete ads" ON storage.objects FOR DELETE USING ( bucket_id = 'ads' AND auth.role() = 'authenticated' );
