-- Настройки AiPay (PayLab) в app_settings
INSERT INTO public.app_settings (key, value) VALUES
('aipay_enabled', 'false'),
('aipay_api_key', ''),
('aipay_company_id', ''),
('aipay_base_url', 'https://dev.paylab.kz/api/v2'),
('aipay_pos_id', '')
ON CONFLICT (key) DO NOTHING;
