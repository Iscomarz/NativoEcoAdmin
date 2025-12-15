-- ======================================
-- CONFIGURACIÓN RLS PARA NATIVO TOURS
-- ======================================

-- 1. HABILITAR RLS EN LAS TABLAS
-- ======================================

ALTER TABLE cexperiencia ENABLE ROW LEVEL SECURITY;

ALTER TABLE cubicacion ENABLE ROW LEVEL SECURITY;

-- 2. ELIMINAR POLÍTICAS EXISTENTES (SI LAS HAY)
-- ======================================

DROP POLICY IF EXISTS "Allow all for authenticated users" ON cexperiencia;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON cubicacion;

DROP POLICY IF EXISTS "Enable read access for all users" ON cexperiencia;

DROP POLICY IF EXISTS "Enable read access for all users" ON cubicacion;

-- 3. POLÍTICAS PARA cexperiencia
-- ======================================

-- SELECT: Usuarios autenticados pueden leer
CREATE POLICY "authenticated_select_cexperiencia" ON cexperiencia FOR
SELECT TO authenticated USING (true);

-- INSERT: Usuarios autenticados pueden crear
CREATE POLICY "authenticated_insert_cexperiencia" ON cexperiencia FOR
INSERT
    TO authenticated
WITH
    CHECK (true);

-- UPDATE: Usuarios autenticados pueden actualizar
CREATE POLICY "authenticated_update_cexperiencia" ON cexperiencia FOR
UPDATE TO authenticated USING (true)
WITH
    CHECK (true);

-- DELETE: Usuarios autenticados pueden eliminar
CREATE POLICY "authenticated_delete_cexperiencia" ON cexperiencia FOR DELETE TO authenticated USING (true);

-- 4. POLÍTICAS PARA cubicacion
-- ======================================

-- SELECT: Usuarios autenticados pueden leer
CREATE POLICY "authenticated_select_cubicacion" ON cubicacion FOR
SELECT TO authenticated USING (true);

-- INSERT: Usuarios autenticados pueden crear
CREATE POLICY "authenticated_insert_cubicacion" ON cubicacion FOR
INSERT
    TO authenticated
WITH
    CHECK (true);

-- UPDATE: Usuarios autenticados pueden actualizar
CREATE POLICY "authenticated_update_cubicacion" ON cubicacion FOR
UPDATE TO authenticated USING (true)
WITH
    CHECK (true);

-- DELETE: Usuarios autenticados pueden eliminar
CREATE POLICY "authenticated_delete_cubicacion" ON cubicacion FOR DELETE TO authenticated USING (true);

-- 5. VERIFICAR QUE LAS POLÍTICAS ESTÁN ACTIVAS
-- ======================================

-- Ejecuta esto para ver las políticas activas:
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE
    tablename IN ('cexperiencia', 'cubicacion')
ORDER BY tablename, policyname;