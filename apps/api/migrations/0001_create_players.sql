-- The spike's one table. The names are invented. The real data arrives from the
-- pipeline's publish job (ADR 0008 D7), never from this file.
CREATE TABLE players (
    id           TEXT PRIMARY KEY CHECK (id GLOB '[a-z]*' AND length(id) <= 63),
    display_name TEXT NOT NULL,
    position     TEXT NOT NULL
        CHECK (position IN ('GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD')),
    tier         TEXT NOT NULL CHECK (tier IN ('BASE', 'RARE', 'LEGEND', 'ICON')),
    overall      INTEGER NOT NULL CHECK (overall BETWEEN 1 AND 99)
);

INSERT INTO players (id, display_name, position, tier, overall) VALUES
    ('ada-vale', 'Ada Vale', 'FORWARD', 'ICON', 94),
    ('bruno-quill', 'Bruno Quill', 'GOALKEEPER', 'RARE', 81),
    ('cleo-marsh', 'Cleo Marsh', 'MIDFIELDER', 'BASE', 67);
