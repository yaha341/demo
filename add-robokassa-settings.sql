-- Добавление дефолтных настроек Robokassa в app_settings
INSERT INTO public.app_settings (key, value) VALUES 
('robokassa_enabled', 'false'),
('robokassa_test_mode', 'false'),
('robokassa_login', ''),
('robokassa_pass1', ''),
('robokassa_pass2', ''),
('robokassa_pass1_test', ''),
('robokassa_pass2_test', '')
ON CONFLICT (key) DO NOTHING;
