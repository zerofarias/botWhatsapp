-- Limpiar flows antiguos con reactId="undefined"
-- Ejecutar esto EN TU BD antes de testear de nuevo

DELETE FROM flow_connections WHERE from_id IN (SELECT id FROM flows WHERE bot_id = 1);
DELETE FROM flows WHERE bot_id = 1;

-- Verificar que quedó limpio
SELECT COUNT(*) as flows_remaining FROM flows WHERE bot_id = 1;
