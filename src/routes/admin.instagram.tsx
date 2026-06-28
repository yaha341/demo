import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components-ui/button";
import { listIgRules, saveIgRule, deleteIgRule, toggleIgRule, listIgTriggers } from "@/lib/instagram.functions";

export const Route = createFileRoute("/admin/instagram")({
  component: InstagramPage,
});

const DEFAULT_COMMENT_REPLY = "Ответила вам в личные сообщения 😊";

type Rule = {
  id: string;
  media_id: string;
  media_url: string;
  media_title: string;
  keywords: string[];
  dm_message: string;
  comment_reply: string;
  is_active: boolean;
};

type RuleForm = Omit<Rule, "id"> & { id?: string };

const EMPTY_FORM: RuleForm = {
  media_id: "",
  media_url: "",
  media_title: "",
  keywords: [],
  dm_message: "",
  comment_reply: DEFAULT_COMMENT_REPLY,
  is_active: true,
};

function InstagramPage() {
  const qc = useQueryClient();
  const rules = useQuery({ queryKey: ["ig_rules"], queryFn: () => listIgRules() });
  const triggers = useQuery({ queryKey: ["ig_triggers"], queryFn: () => listIgTriggers() });

  const [editing, setEditing] = useState<RuleForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"rules" | "log">("rules");
  const [keywordInput, setKeywordInput] = useState("");

  function openNew() {
    setEditing({ ...EMPTY_FORM });
    setKeywordInput("");
  }

  function openEdit(r: Rule) {
    setEditing({ ...r });
    setKeywordInput("");
  }

  function addKeyword() {
    if (!editing || !keywordInput.trim()) return;
    const kw = keywordInput.trim().toLowerCase();
    if (!editing.keywords.includes(kw)) {
      setEditing({ ...editing, keywords: [...editing.keywords, kw] });
    }
    setKeywordInput("");
  }

  function removeKeyword(kw: string) {
    if (!editing) return;
    setEditing({ ...editing, keywords: editing.keywords.filter(k => k !== kw) });
  }

  async function onSave() {
    if (!editing) return;
    if (!editing.media_id.trim()) return alert("Укажите Media ID поста");
    if (editing.keywords.length === 0) return alert("Добавьте хотя бы одно кодовое слово");
    if (!editing.dm_message.trim()) return alert("Введите текст сообщения в Direct");

    setSaving(true);
    try {
      await saveIgRule({ data: editing });
      qc.invalidateQueries({ queryKey: ["ig_rules"] });
      setEditing(null);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Удалить правило?")) return;
    try {
      await deleteIgRule({ data: { id } });
      qc.invalidateQueries({ queryKey: ["ig_rules"] });
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function onToggle(id: string, val: boolean) {
    try {
      await toggleIgRule({ data: { id, is_active: val } });
      qc.invalidateQueries({ queryKey: ["ig_rules"] });
    } catch (e: any) {
      alert(e.message);
    }
  }

  const ruleList = (rules.data ?? []) as Rule[];
  const triggerList = (triggers.data ?? []) as any[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">📸 Instagram Бот</h1>
          <p className="text-sm text-muted-foreground mt-1">Автоответы по кодовым словам в комментариях</p>
        </div>
        <Button onClick={openNew}>+ Добавить правило</Button>
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
        <span>⚠️</span>
        <span>
          Для работы бота необходимо указать <b>INSTAGRAM_ACCESS_TOKEN</b> в настройках Vercel и подключить Webhooks в Meta Developer Console.{" "}
          <a href="https://developers.facebook.com/apps/" target="_blank" rel="noreferrer" className="underline">
            Открыть Meta Developer
          </a>
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "rules" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          onClick={() => setTab("rules")}
        >
          Правила ({ruleList.length})
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "log" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          onClick={() => setTab("log")}
        >
          Лог срабатываний ({triggerList.length})
        </button>
      </div>

      {/* Rules tab */}
      {tab === "rules" && (
        <div className="space-y-3">
          {ruleList.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <div className="text-4xl mb-3">📋</div>
              <p>Правил пока нет. Нажмите «+ Добавить правило».</p>
            </div>
          )}
          {ruleList.map((r) => (
            <div key={r.id} className={`bg-card border rounded-lg p-4 space-y-3 ${!r.is_active ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold truncate">{r.media_title || r.media_id}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${r.is_active ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"}`}>
                      {r.is_active ? "Активно" : "Выключено"}
                    </span>
                  </div>
                  {r.media_url && (
                    <a href={r.media_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline block mt-0.5 truncate">
                      {r.media_url}
                    </a>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    className="text-xs px-2 py-1 rounded border hover:bg-accent"
                    onClick={() => onToggle(r.id, !r.is_active)}
                  >
                    {r.is_active ? "Выкл" : "Вкл"}
                  </button>
                  <button
                    className="text-xs px-2 py-1 rounded border hover:bg-accent"
                    onClick={() => openEdit(r)}
                  >
                    ✏️ Изменить
                  </button>
                  <button
                    className="text-xs px-2 py-1 rounded border border-destructive text-destructive hover:bg-destructive/10"
                    onClick={() => onDelete(r.id)}
                  >
                    🗑
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {r.keywords.map(kw => (
                  <span key={kw} className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">🔑 {kw}</span>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="bg-muted/50 rounded p-3">
                  <div className="text-xs text-muted-foreground mb-1">💬 Ответ в комментарий:</div>
                  <div className="text-sm">{r.comment_reply}</div>
                </div>
                <div className="bg-muted/50 rounded p-3">
                  <div className="text-xs text-muted-foreground mb-1">✉️ Сообщение в Direct:</div>
                  <div className="text-sm whitespace-pre-wrap line-clamp-3">{r.dm_message}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Log tab */}
      {tab === "log" && (
        <div className="space-y-2">
          {triggerList.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <div className="text-4xl mb-3">📭</div>
              <p>Срабатываний пока не было.</p>
            </div>
          )}
          {triggerList.map((t: any) => (
            <div key={t.id} className="bg-card border rounded-lg p-3 text-sm flex items-start gap-3">
              <div className="shrink-0 text-muted-foreground text-xs pt-0.5">
                {new Date(t.triggered_at).toLocaleString("ru")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{t.ig_rules?.media_title || t.media_id}</div>
                <div className="text-muted-foreground">Комментарий: «{t.comment_text}»</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-5">
              <h2 className="text-xl font-semibold">{editing.id ? "Редактировать правило" : "Новое правило"}</h2>

              {/* Media */}
              <div className="space-y-1">
                <label className="text-sm font-medium">Ссылка на пост/Reels</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="https://www.instagram.com/reel/ABC123/"
                  value={editing.media_url}
                  onChange={e => setEditing({ ...editing, media_url: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Media ID поста <span className="text-muted-foreground">(из Instagram Graph API)</span></label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                  placeholder="1234567890123456"
                  value={editing.media_id}
                  onChange={e => setEditing({ ...editing, media_id: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Как узнать Media ID: <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noreferrer" className="underline text-primary">Graph API Explorer</a> → GET /me/media → скопировать id нужного поста
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Название (для отображения в админке)</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Reels про математику 1 класс"
                  value={editing.media_title}
                  onChange={e => setEditing({ ...editing, media_title: e.target.value })}
                />
              </div>

              {/* Keywords */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Кодовые слова</label>
                <div className="flex gap-2">
                  <input
                    className="flex-1 border rounded-lg px-3 py-2 text-sm"
                    placeholder="Введите слово и нажмите Enter"
                    value={keywordInput}
                    onChange={e => setKeywordInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addKeyword())}
                  />
                  <Button size="sm" onClick={addKeyword}>Добавить</Button>
                </div>
                <div className="flex flex-wrap gap-1 min-h-[32px]">
                  {editing.keywords.map(kw => (
                    <span key={kw} className="flex items-center gap-1 text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                      🔑 {kw}
                      <button onClick={() => removeKeyword(kw)} className="hover:text-destructive ml-1">×</button>
                    </span>
                  ))}
                  {editing.keywords.length === 0 && (
                    <span className="text-xs text-muted-foreground italic">Кодовые слова не добавлены</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Регистр не важен. Слово ищется внутри текста комментария.</p>
              </div>

              {/* Comment reply */}
              <div className="space-y-1">
                <label className="text-sm font-medium">Текст ответа в комментарий</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={editing.comment_reply}
                  onChange={e => setEditing({ ...editing, comment_reply: e.target.value })}
                />
              </div>

              {/* DM message */}
              <div className="space-y-1">
                <label className="text-sm font-medium">Текст сообщения в Direct</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 text-sm min-h-[120px] resize-y"
                  placeholder="Привет! Вы оставили кодовое слово под моим видео. Вот ссылка: https://..."
                  value={editing.dm_message}
                  onChange={e => setEditing({ ...editing, dm_message: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Ссылки будут кликабельными в Direct.</p>
              </div>

              {/* Active toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing.is_active}
                  onChange={e => setEditing({ ...editing, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Правило активно</span>
              </label>

              <div className="flex gap-3 pt-2">
                <Button onClick={onSave} disabled={saving} className="flex-1">
                  {saving ? "Сохраняю..." : "💾 Сохранить"}
                </Button>
                <Button variant="outline" onClick={() => setEditing(null)}>Отмена</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
