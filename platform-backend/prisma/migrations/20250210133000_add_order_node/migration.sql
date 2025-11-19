-- Add ORDER to NodeType enum
ALTER TABLE `nodes`
  MODIFY `type` ENUM(
    'START',
    'TEXT',
    'CONDITIONAL',
    'DELAY',
    'REDIRECT_BOT',
    'REDIRECT_AGENT',
    'AI',
    'SET_VARIABLE',
    'END',
    'END_CLOSED',
    'ORDER',
    'SCHEDULE',
    'DATA_LOG'
  ) NOT NULL DEFAULT 'TEXT';
