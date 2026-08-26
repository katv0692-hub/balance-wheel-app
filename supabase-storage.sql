-- Create public storage bucket for Mini App hosting
INSERT INTO storage.buckets (id, name, public)
VALUES ('balance-wheel', 'balance-wheel', true)
ON CONFLICT (id) DO NOTHING;
