-- Настройки FreeKassa в app_settings
INSERT INTO public.app_settings (key, value) VALUES
('freekassa_enabled', 'false'),
('freekassa_merchant_id', ''),
('freekassa_secret1', ''),
('freekassa_secret2', ''),
('freekassa_currency', 'KZT')
ON CONFLICT (key) DO NOTHING;
