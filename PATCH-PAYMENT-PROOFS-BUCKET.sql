-- Если чеки не сохраняются: убедитесь, что bucket payment-proofs существует.
-- Выполните в Supabase → SQL Editor.

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES (
  'payment-proofs',
  'payment-proofs',
  false,
  20971520
) ON CONFLICT (id) DO UPDATE
SET file_size_limit = EXCLUDED.file_size_limit;

DROP POLICY IF EXISTS "Service Role All payment-proofs" ON storage.objects;
CREATE POLICY "Service Role All payment-proofs"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'payment-proofs')
WITH CHECK (bucket_id = 'payment-proofs');
