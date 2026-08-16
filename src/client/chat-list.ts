// chat-list.ts — main page with list of all chats

interface ChatPreview {
  id: string;
  title: string;
  lastMessage: string | null;
  lastRole: string | null;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
}

(async () => {
  // Семейный доступ: открытие по ссылке-приглашению /join/<token> выдаёт креды и ведёт в дневник
  const joinMatch = location.pathname.match(/^\/join\/([a-f0-9]+)$/i);
  if (joinMatch) {
    try {
      const res = await fetch('/api/join/' + joinMatch[1]);
      if (res.ok) {
        const data = (await res.json()) as { chatId: string; clientId: string; clientSecret: string };
        localStorage.setItem(`pui2_clientId_${data.chatId}`, data.clientId);
        localStorage.setItem(`pui2_secret_${data.chatId}`, data.clientSecret);
        location.href = `/chat/${data.chatId}`;
        return;
      }
      document.body.innerHTML = '<div style="font-family:system-ui;padding:40px 20px;text-align:center;color:#7a7268">Ссылка-приглашение недействительна или уже использована.<br><a href="/" style="color:#e8622a">Вернуться к дневникам</a></div>';
      return;
    } catch { /* падаем в список */ }
  }

  const chats: ChatPreview[] = await fetch('/api/chats').then((r) => r.json());

  document.body.innerHTML = `
    <style>
      body { font-family: 'Inter', system-ui, sans-serif; background: #f8f5f0; color: #211d18; margin: 0; -webkit-font-smoothing: antialiased; }
      header { max-width: 560px; margin: 0 auto; padding: 28px 20px 16px; border-bottom: 1px solid #e3ddd3; display: flex; align-items: baseline; justify-content: space-between; }
      header h1 { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 500; font-size: 22px; margin: 0; }
      #new-chat { background: none; border: none; border-bottom: 1px solid #e8622a; color: #e8622a; cursor: pointer; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; padding: 4px 0; font-family: inherit; }
      #chat-list { max-width: 560px; margin: 0 auto; padding: 12px 20px; }
      .chat-card { display: block; padding: 16px 4px; margin-bottom: 4px; border-bottom: 1px solid #e3ddd3; text-decoration: none; color: #211d18; transition: background .2s; border-radius: 2px; position: relative; padding-right: 44px; }
      .chat-card:hover { background: #f2ede4; }
      .chat-del { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: 1px solid #e3ddd3; color: #a39a8d; cursor: pointer; width: 26px; height: 26px; border-radius: 2px; font-size: 11px; line-height: 1; transition: all .2s; }
      .chat-del:hover { color: #c0392b; border-color: #c0392b; }
      .chat-ren { position: absolute; right: 44px; top: 50%; transform: translateY(-50%); background: none; border: 1px solid #e3ddd3; color: #a39a8d; cursor: pointer; width: 26px; height: 26px; border-radius: 2px; font-size: 11px; line-height: 1; transition: all .2s; }
      .chat-ren:hover { color: #e8622a; border-color: #e8622a; }
      .chat-title { font-weight: 500; margin-bottom: 3px; font-size: 15px; }
      .chat-preview { font-size: 13px; color: #7a7268; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .chat-meta { display: flex; gap: 16px; margin-top: 6px; font-size: 11px; color: #a39a8d; letter-spacing: 0.04em; }
      .empty { text-align: center; padding: 60px 20px; color: #a39a8d; font-family: 'Cormorant Garamond', Georgia, serif; font-style: italic; font-size: 15px; }
    </style>
    <header>
      <h1>Baby Diary</h1>
      <button id="new-chat">Новая запись</button>
    </header>
    <div id="chat-list"></div>
  `;

  const list = document.getElementById('chat-list')!;

  if (chats.length === 0) {
    list.innerHTML = '<div class="empty">Нет записей. Создайте первый дневник.</div>';
  } else {
    for (const c of chats) {
      const card = document.createElement('a');
      card.className = 'chat-card';
      card.href = `/chat/${c.id}`;
      const hasCreds = !!(localStorage.getItem(`pui2_clientId_${c.id}`) && localStorage.getItem(`pui2_secret_${c.id}`));
      card.innerHTML = `
        <div class="chat-title">${esc(c.title)}</div>
        <div class="chat-preview">${esc(c.lastMessage ?? 'Пустой дневник')}</div>
        <div class="chat-meta">
          <span>${c.messageCount} сообщений</span>
          <span>${ago(c.updatedAt)}</span>
        </div>
        ${hasCreds ? `<button class="chat-del" title="Удалить дневник">✕</button><button class="chat-ren" title="Переименовать">✎</button>` : ''}
      `;
      if (hasCreds) {
        card.querySelector('.chat-del')!.addEventListener('click', async (e) => {
          e.preventDefault(); e.stopPropagation();
          if (!confirm(`Удалить дневник «${c.title}»? Это действие необратимо.`)) return;
          await fetch(`/api/chats/${c.id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId: localStorage.getItem(`pui2_clientId_${c.id}`), clientSecret: localStorage.getItem(`pui2_secret_${c.id}`) }),
          });
          card.remove();
        });
        card.querySelector('.chat-ren')!.addEventListener('click', async (e) => {
          e.preventDefault(); e.stopPropagation();
          const title = prompt('Название дневника (имя ребёнка):', c.title);
          if (title === null || !title.trim()) return;
          const res = await fetch(`/api/chats/${c.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId: localStorage.getItem(`pui2_clientId_${c.id}`), clientSecret: localStorage.getItem(`pui2_secret_${c.id}`), title: title.trim() }),
          });
          if (res.ok) { card.querySelector('.chat-title')!.textContent = title.trim(); c.title = title.trim(); }
        });
      }
      list.appendChild(card);
    }
  }

  document.getElementById('new-chat')!.onclick = async () => {
    // Быстрый старт: имя малыша = название дневника (1 вопрос вместо пустого «Baby Diary»)
    const name = prompt('Как зовут малыша? (можно пропустить)', '');
    const res = await fetch('/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: name ? name.trim() : '' }),
    });
    const data = (await res.json()) as { id: string; clientId: string; clientSecret: string };
    localStorage.setItem(`pui2_clientId_${data.id}`, data.clientId);
    localStorage.setItem(`pui2_secret_${data.id}`, data.clientSecret);
    location.href = `/chat/${data.id}`;
  };

  function esc(s: string): string {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function ago(ts: number): string {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return 'только что';
    if (s < 3600) return `${Math.floor(s / 60)} мин.`;
    if (s < 86400) return `${Math.floor(s / 3600)} ч.`;
    return `${Math.floor(s / 86400)} дн.`;
  }
})();
