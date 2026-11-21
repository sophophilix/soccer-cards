-- The players table. It holds no rows: the real data arrives from the
-- pipeline's publish job (ADR 0008 D7), never from this file.
CREATE TABLE players (
    id           TEXT PRIMARY KEY CHECK (
        id GLOB '[a-z]*' AND id NOT GLOB '*[^a-z0-9-]*' AND length(id) <= 63
        AND length(CAST(id AS BLOB)) = length(id)
    ),
    display_name TEXT NOT NULL,
    position     TEXT NOT NULL
        CHECK (position IN ('GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD')),
    tier         TEXT NOT NULL CHECK (tier IN ('BASE', 'RARE', 'LEGEND', 'ICON')),
    overall      INTEGER NOT NULL CHECK (overall BETWEEN 1 AND 99)
);
