-- Three invented players for local runs and tests only.
-- NEVER run this file on a remote database: the ratings are hand-written, not
-- made by the ratings formula (ADR 0003, ADR 0008 D7).
INSERT INTO players (id, display_name, position, tier, overall) VALUES
    ('ada-vale', 'Ada Vale', 'FORWARD', 'ICON', 94),
    ('bruno-quill', 'Bruno Quill', 'GOALKEEPER', 'RARE', 81),
    ('cleo-marsh', 'Cleo Marsh', 'MIDFIELDER', 'BASE', 67);
