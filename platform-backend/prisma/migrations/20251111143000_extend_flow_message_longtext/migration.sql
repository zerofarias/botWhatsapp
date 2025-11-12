-- Upgrade flow.message to LONGTEXT so Capture/Text nodes can almacenar mensajes largos\nALTER TABLE lows MODIFY COLUMN message LONGTEXT NOT NULL;
