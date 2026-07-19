import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components-ui/button";
import { Input } from "@/components-ui/input";
import { Label } from "@/components-ui/label";
import { Checkbox } from "@/components-ui/checkbox";
import { getSettings, saveSetting } from "@/lib/settings.functions";
import { resetAllData } from "@/lib/reset.functions";

const ROLES = [
  { id: "1040879530", label: "Владелец" },
  { id: "7256670713", label: "Разработчик" },
];

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: ["settings"], queryFn: () => getSettings() });
  const [adminChatId, setAdminChatId] = useState("");
  const [adminContactLink, setAdminContactLink] = useState("");
  const [rkLogin, setRkLogin] = useState("");
  const [rkPass1, setRkPass1] = useState("");
  const [rkPass2, setRkPass2] = useState("");
  const [rkPass1Test, setRkPass1Test] = useState("");
  const [rkPass2Test, setRkPass2Test] = useState("");
  const [rkTestMode, setRkTestMode] = useState(false);
  const [rkEnabled, setRkEnabled] = useState(false);
  const [aipayEnabled, setAipayEnabled] = useState(false);
  const [aipayApiKey, setAipayApiKey] = useState("");
  const [aipayCompanyId, setAipayCompanyId] = useState("");
  const [aipayBaseUrl, setAipayBaseUrl] = useState("https://dev.paylab.kz/api/v2");
  const [aipayPosId, setAipayPosId] = useState("");
  const [fkEnabled, setFkEnabled] = useState(false);
  const [fkMerchantId, setFkMerchantId] = useState("");
  const [fkSecret1, setFkSecret1] = useState("");
  const [fkSecret2, setFkSecret2] = useState("");
  const [fkCurrency, setFkCurrency] = useState("KZT");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setAdminChatId(settings.data?.admin_chat_id ?? "");
    setAdminContactLink(settings.data?.admin_contact_link ?? "");
    setRkLogin(settings.data?.robokassa_login ?? "");
    setRkPass1(settings.data?.robokassa_pass1 ?? "");
    setRkPass2(settings.data?.robokassa_pass2 ?? "");
    setRkPass1Test(settings.data?.robokassa_pass1_test ?? "");
    setRkPass2Test(settings.data?.robokassa_pass2_test ?? "");
    setRkTestMode(settings.data?.robokassa_test_mode === "true");
    setRkEnabled(settings.data?.robokassa_enabled === "true");
    setAipayEnabled(settings.data?.aipay_enabled === "true");
    setAipayApiKey(settings.data?.aipay_api_key ?? "");
    setAipayCompanyId(settings.data?.aipay_company_id ?? "");
    setAipayBaseUrl(settings.data?.aipay_base_url || "https://dev.paylab.kz/api/v2");
    setAipayPosId(settings.data?.aipay_pos_id ?? "");
    setFkEnabled(settings.data?.freekassa_enabled === "true");
    setFkMerchantId(settings.data?.freekassa_merchant_id ?? "");
    setFkSecret1(settings.data?.freekassa_secret1 ?? "");
    setFkSecret2(settings.data?.freekassa_secret2 ?? "");
    setFkCurrency(settings.data?.freekassa_currency || "KZT");
  }, [settings.data]);

  async function onSave() {
    await saveSetting({ data: { key: "admin_chat_id", value: adminChatId.trim() } });
    await saveSetting({ data: { key: "admin_contact_link", value: adminContactLink.trim() } });
    await saveSetting({ data: { key: "robokassa_login", value: rkLogin.trim() } });
    await saveSetting({ data: { key: "robokassa_pass1", value: rkPass1.trim() } });
    await saveSetting({ data: { key: "robokassa_pass2", value: rkPass2.trim() } });
    await saveSetting({ data: { key: "robokassa_pass1_test", value: rkPass1Test.trim() } });
    await saveSetting({ data: { key: "robokassa_pass2_test", value: rkPass2Test.trim() } });
    await saveSetting({ data: { key: "robokassa_test_mode", value: rkTestMode ? "true" : "false" } });
    await saveSetting({ data: { key: "robokassa_enabled", value: rkEnabled ? "true" : "false" } });
    await saveSetting({ data: { key: "aipay_enabled", value: aipayEnabled ? "true" : "false" } });
    await saveSetting({ data: { key: "aipay_api_key", value: aipayApiKey.trim() } });
    await saveSetting({ data: { key: "aipay_company_id", value: aipayCompanyId.trim() } });
    await saveSetting({ data: { key: "aipay_base_url", value: aipayBaseUrl.trim() || "https://dev.paylab.kz/api/v2" } });
    await saveSetting({ data: { key: "aipay_pos_id", value: aipayPosId.trim() } });
    await saveSetting({ data: { key: "freekassa_enabled", value: fkEnabled ? "true" : "false" } });
    await saveSetting({ data: { key: "freekassa_merchant_id", value: fkMerchantId.trim() } });
    await saveSetting({ data: { key: "freekassa_secret1", value: fkSecret1.trim() } });
    await saveSetting({ data: { key: "freekassa_secret2", value: fkSecret2.trim() } });
    await saveSetting({ data: { key: "freekassa_currency", value: fkCurrency.trim().toUpperCase() || "KZT" } });
    qc.invalidateQueries({ queryKey: ["settings"] });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  async function onReset() {
    const ok = window.confirm(
      "Сбросить ВСЕ данные? Будут удалены все товары, категории, заказы и загруженные файлы. Действие необратимо.",
    );
    if (!ok) return;
    const ok2 = window.confirm("Точно? Это нельзя отменить.");
    if (!ok2) return;
    setResetting(true);
    try {
      await resetAllData();
      await qc.invalidateQueries();
      setResetDone(true);
      setTimeout(() => setResetDone(false), 3000);
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-semibold">Настройки</h1>
      <div className="bg-card border rounded-lg p-4 space-y-3">
        <div className="space-y-2">
          <Label>Получатели уведомлений о заказах (Telegram ID)</Label>
          <div className="flex flex-col gap-3 py-2">
            {ROLES.map((role) => {
              const ids = adminChatId.split(",").map((s) => s.trim()).filter(Boolean);
              const checked = ids.includes(role.id);
              return (
                <label key={role.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(c) => {
                      let newIds = [...ids];
                      if (c) {
                        if (!newIds.includes(role.id)) newIds.push(role.id);
                      } else {
                        newIds = newIds.filter((i) => i !== role.id);
                      }
                      setAdminChatId(newIds.join(", "));
                    }}
                  />
                  <span>
                    {role.label} <span className="text-muted-foreground">({role.id})</span>
                  </span>
                </label>
              );
            })}
          </div>
          <Input
            value={adminChatId}
            onChange={(e) => setAdminChatId(e.target.value)}
            placeholder="например, 123456789, 987654321"
          />
          <p className="text-xs text-muted-foreground">
            Выберите роли из списка или впишите ID вручную (через запятую). Уведомления будут приходить всем указанным получателям.
          </p>
        </div>
        <div className="space-y-2 pt-2 border-t border-border/50">
          <Label>Ваш контакт для связи (кнопка в боте)</Label>
          <Input
            value={adminContactLink}
            onChange={(e) => setAdminContactLink(e.target.value)}
            placeholder="например, @my_username или ссылка на WhatsApp"
          />
          <p className="text-xs text-muted-foreground">
            Эта ссылка или текст будет показываться пользователям при нажатии на кнопку «💬 Связаться с автором».
          </p>
        </div>
        <div className="flex items-center gap-2 pt-2">
          <Button onClick={onSave}>Сохранить</Button>
          {saved && <span className="text-sm text-green-600">Сохранено ✓</span>}
        </div>
      </div>

      <div className="bg-card border rounded-lg p-4 space-y-4">
        <h2 className="text-lg font-semibold">AiPay (Kaspi по телефону)</h2>
        <div className="rounded-md bg-muted/50 p-3 text-sm space-y-2">
          <p className="font-medium">Webhook (notif_url) в кабинете AiPay:</p>
          <code className="block break-all text-xs">
            {typeof window !== "undefined"
              ? `${window.location.origin}/api/public/aipay/webhook`
              : "https://demo-lilac-mu.vercel.app/api/public/aipay/webhook"}
          </code>
          <p className="text-muted-foreground text-xs">
            Терминал POS должен быть в статусе <b>active</b> (вход в Kaspi Business по OTP).
            Company ID — внутренний UUID из API (не external_id). Приоритет: AiPay → Robokassa → скриншот.
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox checked={aipayEnabled} onCheckedChange={(c) => setAipayEnabled(!!c)} />
          <span>Включить оплату через AiPay</span>
        </label>

        {aipayEnabled && (
          <div className="space-y-4 pt-2 border-t border-border/50">
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input type="password" value={aipayApiKey} onChange={(e) => setAipayApiKey(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Company ID (внутренний UUID)</Label>
              <Input
                value={aipayCompanyId}
                onChange={(e) => setAipayCompanyId(e.target.value)}
                placeholder="6c6e3053-...."
              />
            </div>
            <div className="space-y-2">
              <Label>Base URL</Label>
              <Input value={aipayBaseUrl} onChange={(e) => setAipayBaseUrl(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>POS ID (опционально)</Label>
              <Input
                value={aipayPosId}
                onChange={(e) => setAipayPosId(e.target.value)}
                placeholder="если пусто — автовыбор активного терминала"
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Button onClick={onSave}>Сохранить AiPay</Button>
          {saved && <span className="text-sm text-green-600">Сохранено ✓</span>}
        </div>
      </div>

      <div className="bg-card border rounded-lg p-4 space-y-4">
        <h2 className="text-lg font-semibold">FreeKassa</h2>
        <div className="rounded-md bg-muted/50 p-3 text-sm space-y-2">
          <p className="font-medium">URL для кабинета FreeKassa:</p>
          <p className="text-xs text-muted-foreground">URL оповещения:</p>
          <code className="block break-all text-xs">
            {typeof window !== "undefined"
              ? `${window.location.origin}/api/public/freekassa/result`
              : "https://demo-lilac-mu.vercel.app/api/public/freekassa/result"}
          </code>
          <p className="text-xs text-muted-foreground">Success / Fail:</p>
          <code className="block break-all text-xs">
            {typeof window !== "undefined" ? `${window.location.origin}/` : "https://demo-lilac-mu.vercel.app/"}
          </code>
          <p className="text-muted-foreground text-xs">
            Метод оповещения: POST (GET тоже поддерживается). Приоритет: AiPay → FreeKassa → Robokassa → скриншот.
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox checked={fkEnabled} onCheckedChange={(c) => setFkEnabled(!!c)} />
          <span>Включить оплату через FreeKassa</span>
        </label>

        {fkEnabled && (
          <div className="space-y-4 pt-2 border-t border-border/50">
            <div className="space-y-2">
              <Label>ID магазина (Merchant ID)</Label>
              <Input value={fkMerchantId} onChange={(e) => setFkMerchantId(e.target.value)} placeholder="4813" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Секретное слово 1</Label>
                <Input type="password" value={fkSecret1} onChange={(e) => setFkSecret1(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Секретное слово 2</Label>
                <Input type="password" value={fkSecret2} onChange={(e) => setFkSecret2(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Валюта магазина (RUB / USD / EUR / UAH / KZT)</Label>
              <Input value={fkCurrency} onChange={(e) => setFkCurrency(e.target.value)} placeholder="KZT" />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Button onClick={onSave}>Сохранить FreeKassa</Button>
          {saved && <span className="text-sm text-green-600">Сохранено ✓</span>}
        </div>
      </div>

      <div className="bg-card border rounded-lg p-4 space-y-4">
        <h2 className="text-lg font-semibold">Настройки эквайринга Robokassa</h2>

        <div className="rounded-md bg-muted/50 p-3 text-sm space-y-2">
          <p className="font-medium">ResultURL для кабинета Robokassa:</p>
          <code className="block break-all text-xs">
            {typeof window !== "undefined"
              ? `${window.location.origin}/api/public/robokassa/result`
              : "https://demo-lilac-mu.vercel.app/api/public/robokassa/result"}
          </code>
          <p className="text-muted-foreground text-xs">
            В технастройках магазина: метод ResultURL = POST, алгоритм хеша = MD5.
            Для теста включите тестовый режим в кабинете и укажите отдельные тестовые пароли #1 и #2.
          </p>
        </div>
        
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox checked={rkEnabled} onCheckedChange={(c) => setRkEnabled(!!c)} />
          <span>Включить оплату через Robokassa (автовыдача)</span>
        </label>
        
        {rkEnabled && (
          <div className="space-y-4 pt-2 border-t border-border/50">
            <div className="space-y-2">
              <Label>Идентификатор магазина (MerchantLogin)</Label>
              <Input value={rkLogin} onChange={(e) => setRkLogin(e.target.value)} placeholder="my_shop_id" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Пароль #1 (Боевой)</Label>
                <Input type="password" value={rkPass1} onChange={(e) => setRkPass1(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Пароль #2 (Боевой)</Label>
                <Input type="password" value={rkPass2} onChange={(e) => setRkPass2(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label>Пароль #1 (Тестовый)</Label>
                <Input type="password" value={rkPass1Test} onChange={(e) => setRkPass1Test(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Пароль #2 (Тестовый)</Label>
                <Input type="password" value={rkPass2Test} onChange={(e) => setRkPass2Test(e.target.value)} />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer pt-2">
              <Checkbox checked={rkTestMode} onCheckedChange={(c) => setRkTestMode(!!c)} />
              <span>Тестовый режим (IsTest=1) — используйте тестовые пароли</span>
            </label>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Button onClick={onSave}>Сохранить Robokassa</Button>
          {saved && <span className="text-sm text-green-600">Сохранено ✓</span>}
        </div>
      </div>

      <div className="bg-card border rounded-lg p-4 space-y-1 text-sm">
        <h2 className="font-medium mb-2">Доступ в админ-панель</h2>
        <p>Логин и пароль: <code>admin</code> / <code>admin</code></p>
        <p className="text-muted-foreground">
          Для смены — обратитесь к разработчику или измените секреты <code>ADMIN_USERNAME</code> и
          <code> ADMIN_PASSWORD</code> в настройках проекта.
        </p>
      </div>

      <div className="bg-card border border-destructive/40 rounded-lg p-4 space-y-3">
        <h2 className="font-medium text-destructive">Опасная зона</h2>
        <p className="text-sm text-muted-foreground">
          Полный сброс: удалит все товары, категории, изображения, файлы товаров, заказы,
          корзины пользователей и скриншоты оплаты. Счётчики обнулятся. Настройки и реквизиты
          оплаты сохранятся.
        </p>
        <div className="flex items-center gap-2">
          <Button variant="destructive" onClick={onReset} disabled={resetting}>
            {resetting ? "Сбрасываю..." : "Сбросить все данные"}
          </Button>
          {resetDone && <span className="text-sm text-green-600">Готово ✓</span>}
        </div>
      </div>
    </div>
  );
}