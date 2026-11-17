-- JS Date preserves milliseconds. Store the ordering timestamp at identical
-- precision so a cursor cannot skip rows sharing the same microsecond timestamp.
ALTER TABLE articles ALTER COLUMN first_seen_at TYPE timestamptz(3);
