-- 1. Crear nuevo nodo capturador (tipo TEXT con waitForResponse)
-- Este nodo capturará la respuesta en variable "saludo"
INSERT INTO flows (name, type, trigger, message, parent_id, area_id, order_index, metadata, is_active, created_by, bot_id)
VALUES (
  'Capturador',
  'TEXT',
  NULL,
  '',
  NULL,
  NULL,
  0,
  JSON_OBJECT(
    'builder', JSON_OBJECT(
      'reactId', 'capturador-respuesta-node',
      'position', JSON_OBJECT('x', 569, 'y', 500),
      'type', 'TEXT',
      'width', NULL,
      'height', NULL,
      'options', JSON_ARRAY(),
      'conditions', JSON_ARRAY(),
      'messageType', 'TEXT',
      'waitForResponse', true,
      'responseVariableName', 'saludo',
      'responseVariableType', 'string',
      'buttonTitle', NULL,
      'buttonFooter', NULL,
      'listButtonText', NULL,
      'listTitle', NULL,
      'listDescription', NULL
    )
  ),
  true,
  3,
  1
);

-- 2. Remover la conexión antigua: nodo 21 → nodo 22 (CONDITIONAL)
DELETE FROM flow_connections 
WHERE from_id = 21 AND to_id = 22;

-- 3. Crear nueva conexión: nodo 21 → nodo 23 (capturador)
INSERT INTO flow_connections (from_id, to_id, trigger)
VALUES (21, 23, 'f111443b_7e68_4f06_8ded_28141808bf35');

-- 4. Crear nueva conexión: nodo 23 → nodo 22 (CONDITIONAL)
INSERT INTO flow_connections (from_id, to_id, trigger)
VALUES (23, 22, 'respuesta_capturada');
