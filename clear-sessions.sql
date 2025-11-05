-- Clear stuck queuer sessions
DELETE FROM queuer_sessions WHERE status = 'active';
