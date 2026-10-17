/* Browser code is embedded with toString so escape sequences have one owner. */
export function initAdminDashboard({ clients, adminApi, publicUrl }) {
  let statusFilter = 'all';
  let deletingIds = [];
  let deleteBusy = false;
  let createBusy = false;
  let bonusBusy = false;
  let reloadAfterExport = false;
  const selected = new Set();
  const byId = (id) => document.getElementById(id);
  const rows = () => Array.from(document.querySelectorAll('.client-row'));
  const fmt = (n) => new Intl.NumberFormat('ru-RU').format(n);
  const depleted = (c) => c.status === 'depleted' || (c.tokenLimit > 0 && c.usedTokens >= c.tokenLimit);

  function invitation(client) {
    const limit = client.tokenLimit === 0 ? 'Без лимита' : fmt(client.tokenLimit) + ' токенов';
    return ['Здравствуйте!', '', 'Ваш персональный доступ к AI готов.', 'Пакет: ' + limit, '', 'Ключ и инструкция по подключению в личном кабинете:', client.portalUrl, '', 'Приятной работы!'].join('\n');
  }
  async function copyOrSelect(text, area = null) {
    if (await copyText(text)) return true;
    if (!area) {
      area = byId('manualCopyText');
      area.value = text;
      byId('manualCopyDialog').showModal();
    }
    area.focus();
    area.select();
    return false;
  }
  function updateSelection() {
    const visible = rows().filter((row) => !row.hidden);
    let visibleSelected = 0;
    rows().forEach((row) => {
      const checked = selected.has(row.dataset.id);
      row.querySelector('.row-select').checked = checked;
      row.classList.toggle('is-selected', checked);
      if (checked && !row.hidden) visibleSelected++;
    });
    byId('selectAllClients').checked = visible.length > 0 && visibleSelected === visible.length;
    byId('selectAllClients').indeterminate = visibleSelected > 0 && visibleSelected < visible.length;
    byId('selectAllClients').disabled = !visible.length;
    byId('selectedCount').textContent = 'Выбрано ' + selected.size;
    byId('bulkActions').hidden = !selected.size;
  }
  function clearSelection() { selected.clear(); updateSelection(); }
  byId('clearSelection').addEventListener('click', clearSelection);
  byId('selectAllClients').addEventListener('change', (event) => {
    rows().filter((row) => !row.hidden).forEach((row) => {
      if (event.target.checked) selected.add(row.dataset.id);
      else selected.delete(row.dataset.id);
    });
    updateSelection();
  });
  byId('portalsTableBody').addEventListener('change', (event) => {
    if (!event.target.matches('.row-select')) return;
    const id = event.target.closest('tr').dataset.id;
    if (event.target.checked) selected.add(id);
    else selected.delete(id);
    updateSelection();
  });
  function updateSummary() {
    const limited = clients.filter((c) => c.tokenLimit > 0);
    const unlimited = clients.length - limited.length;
    const limit = limited.reduce((sum, c) => sum + c.tokenLimit, 0);
    const used = clients.reduce((sum, c) => sum + c.usedTokens, 0);
    const remaining = limited.reduce((sum, c) => sum + Math.max(0, c.tokenLimit - c.usedTokens), 0);
    const values = [clients.length, clients.filter((c) => !depleted(c)).length, used, remaining];
    document.querySelectorAll('.metric-number').forEach((node, i) => { node.textContent = formatNum(values[i]); });
    const feet = document.querySelectorAll('.metric-foot');
    feet[2].textContent = unlimited ? 'Есть ключи без лимита: ' + unlimited : (limit ? Math.min(100, Math.round(used / limit * 100)) : 0) + '% от общей квоты';
    feet[3].textContent = unlimited ? 'Для ключей с лимитом' : 'Из ' + formatNum(limit) + ' выделенных';
    document.querySelector('#clientsTitle .count').textContent = clients.length;
  }
  function filterClients(resetSelection = true) {
    if (resetSelection) selected.clear();
    const query = document.getElementById('clientSearch').value.trim().toLocaleLowerCase('ru');
    let count = 0;
    document.querySelectorAll('.client-row').forEach((row) => {
      row.hidden = !(row.dataset.name.includes(query) && (statusFilter === 'all' || row.dataset.status === statusFilter));
      if (row.hidden) selected.delete(row.dataset.id);
      if (!row.hidden) count++;
    });
    document.getElementById('resultCount').textContent = 'Показано ' + count + ' из ' + clients.length;
    document.getElementById('emptyRow').hidden = count > 0;
    byId('emptyTitle').textContent = clients.length ? 'Клиенты не найдены' : 'Клиентов пока нет';
    byId('emptyDescription').textContent = clients.length ? 'Попробуйте другое имя или измените фильтр статуса.' : 'Создайте ключ для клиента.';
    byId('emptyCreate').hidden = clients.length > 0;
    updateSelection();
  }
  document.getElementById('clientSearch').addEventListener('input', () => filterClients());
  document.querySelectorAll('[data-filter]').forEach((button) => button.addEventListener('click', () => {
    statusFilter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    filterClients();
  }));
  document.getElementById('refreshDashboard').addEventListener('click', () => window.location.reload());
  function updatePresets() {
    const value = document.getElementById('tokenLimit').value;
    document.querySelectorAll('[data-limit]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.limit === value)));
  }
  document.querySelectorAll('[data-limit]').forEach((button) => button.addEventListener('click', () => {
    document.getElementById('tokenLimit').value = button.dataset.limit;
    updatePresets();
  }));
  document.getElementById('tokenLimit').addEventListener('input', updatePresets);
  document.getElementById('allModelsCheck').addEventListener('change', (event) => {
    document.getElementById('modelsSelectorBox').hidden = event.target.checked;
  });
  function generateRandomName() {
    const ruAdj = ["Квантовый","Неоновый","Северный","Янтарный","Лазурный","Быстрый","Звёздный","Астральный","Кибер","Изумрудный","Тихий","Солнечный","Лунный","Серебряный","Золотой","Магнитный","Космический","Атласный","Рассветный","Глубокий","Орбитальный","Цифровой","Кристальный","Пламенный","Векторный","Штормовой","Таинственный","Полярный","Яркий","Гармоничный"];
    const ruNoun = ["Спутник","Вектор","Орион","Пульсар","Феникс","Шторм","Атлас","Сокол","Луч","Горизонт","Импульс","Маяк","Компас","Призма","Зенит","Поток","Ковчег","Вихрь","Спектр","Страж","Рубеж","Радар","Квазар","Сигнал","Пилот","Генезис","Синтез","Контур","Метеор","Фокус"];
    const enAdj = ["Quantum","Neon","Northern","Amber","Azure","Swift","Stellar","Astral","Cyber","Emerald","Silent","Solar","Lunar","Silver","Golden","Magnetic","Cosmic","Velvet","Dawn","Deep","Orbital","Digital","Crystal","Blazing","Vector","Storm","Mystic","Polar","Vibrant","Harmonic"];
    const enNoun = ["Satellite","Vector","Orion","Pulsar","Phoenix","Storm","Atlas","Falcon","Beam","Horizon","Pulse","Beacon","Compass","Prism","Zenith","Stream","Vessel","Vortex","Spectrum","Sentinel","Apex","Radar","Quasar","Signal","Pilot","Genesis","Synergy","Circuit","Meteor","Focus"];
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    return Math.random() < 0.5 ? (pick(enAdj) + " " + pick(enNoun)) : (pick(ruAdj) + " " + pick(ruNoun));
  }
  document.getElementById('generateNameBtn').addEventListener('click', () => {
    document.getElementById('clientName').value = generateRandomName();
  });
  document.getElementById('createKeyForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (createBusy) return;
    const error = document.getElementById('createError');
    error.hidden = true;
    let clientName = document.getElementById('clientName').value.trim();
    if (!clientName) {
      clientName = generateRandomName();
      document.getElementById('clientName').value = clientName;
    }
    const allowedModels = document.getElementById('allModelsCheck').checked ? null : Array.from(document.querySelectorAll('.model-checkbox:checked'), (input) => input.value);
    if (allowedModels && !allowedModels.length) {
      error.textContent = 'Выберите хотя бы одну модель или включите доступ ко всем.';
      error.hidden = false;
      return;
    }
    const button = document.getElementById('submitBtn');
    const requested = Number(byId('batchCount').value);
    createBusy = true;
    byId('newKeyDialog').querySelectorAll('button').forEach((item) => { item.disabled = true; });
    button.disabled = true;
    button.querySelector('span').textContent = 'Создаём доступ…';
    try {
      const response = await fetch(adminApi + '/keys/batch-create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientName, tokenLimit: Number(document.getElementById('tokenLimit').value), batchCount: Number(document.getElementById('batchCount').value), allowedModels }) });
      const result = await response.json();
      const created = response.ok ? result.portals : result.createdSoFar;
      if (!created?.length) throw new Error(result.error || 'Не удалось создать доступ.');
      byId('newKeyDialog').close();
      reloadAfterExport = true;
      const items = created.map((c) => ({ ...c, usedTokens: c.cachedUsedTokens, portalUrl: publicUrl + '/p/' + encodeURIComponent(c.portalToken) }));
      const warning = response.ok ? '' : 'Создано ' + created.length + ' из ' + requested + '. Ошибок: ' + (result.failedCount || 1) + '. Не создано: ' + (requested - created.length) + '. ' + (result.error || 'Выпуск остановлен.');
      const count = created.length;
      const noun = count % 100 >= 11 && count % 100 <= 14 ? 'ключей' : count % 10 === 1 ? 'ключ' : count % 10 >= 2 && count % 10 <= 4 ? 'ключа' : 'ключей';
      showFunpay(items, 'Создано ' + count + ' ' + noun, warning);
    } catch (err) { error.textContent = err.message || 'Не удалось связаться с сервером.'; error.hidden = false; }
    finally {
      createBusy = false;
      byId('newKeyDialog').querySelectorAll('button').forEach((item) => { item.disabled = false; });
      button.querySelector('span').textContent = 'Создать доступ';
    }
  });
  byId('newKeyDialog').addEventListener('cancel', (event) => { if (createBusy) event.preventDefault(); });
  document.getElementById('portalsTableBody').addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const client = clients.find((item) => String(item.id) === button.closest('tr').dataset.id);
    if (!client) return;
    if (button.dataset.action === 'link') copyOrSelect(client.portalUrl);
    if (button.dataset.action === 'telegram') {
      copyOrSelect(invitation(client));
    }
    if (button.dataset.action === 'bonus') {
      if (client.tokenLimit === 0) { notify('Безлимитному ключу бонус не требуется.', true); return; }
      activeBonusClient = client;
      const fmt = (n) => new Intl.NumberFormat('ru-RU').format(n);
      const remaining = Math.max(0, (client.tokenLimit || 0) - (client.usedTokens || 0));
      document.getElementById('bonusClientName').textContent = client.clientName;
      document.getElementById('bonusCurrentLimit').textContent = client.tokenLimit === 0 ? 'Без лимита' : fmt(client.tokenLimit);
      document.getElementById('bonusRemaining').textContent = client.tokenLimit === 0 ? '∞' : fmt(remaining);
      document.getElementById('bonusPercentInput').value = 10;
      document.getElementById('bonusError').hidden = true;
      document.getElementById('bonusSuccess').hidden = true;
      document.getElementById('submitBonusBtn').hidden = false;
      recalculateBonus(true);
      document.getElementById('bonusDialog').showModal();
    }
    if (button.dataset.action === 'delete') {
      openDelete([client.id]);
    }
  });

  function showFunpay(items, title = 'Автовыдача FunPay', warning = '') {
    const active = items.filter((c) => !depleted(c));
    const skipped = items.length - active.length;
    byId('funpayTitle').textContent = title;
    byId('funpayTextarea').value = active.map((c) => invitation(c).replace(/\r\n|\r|\n/g, '\\n')).join('\n');
    byId('funpayCount').textContent = 'Готово товаров: ' + active.length + '. Исключено исчерпанных: ' + skipped + '.';
    byId('batchResult').textContent = warning;
    byId('batchResult').hidden = !warning;
    byId('funpayCopyHint').hidden = true;
    byId('copyFunpayBtn').disabled = !active.length;
    byId('selectFunpayText').disabled = !active.length;
    byId('funpayDialog').showModal();
    byId('copyFunpayBtn').focus();
    byId('funpayTextarea').scrollLeft = 0;
    byId('funpayTextarea').scrollTop = 0;
  }
  function exportSelected() {
    const items = clients.filter((c) => selected.has(String(c.id)));
    if (!items.length) {
      notify('Выберите ключи галочками в таблице.', true);
      byId('selectAllClients').focus();
      return;
    }
    showFunpay(items);
  }
  byId('exportSelected').addEventListener('click', exportSelected);
  byId('openFunpay').addEventListener('click', exportSelected);
  byId('selectFunpayText').addEventListener('click', () => {
    byId('funpayTextarea').focus();
    byId('funpayTextarea').select();
  });
  byId('copyFunpayBtn').addEventListener('click', async () => {
    const area = byId('funpayTextarea');
    if (!area.value) return;
    byId('funpayCopyHint').hidden = await copyOrSelect(area.value, area);
  });
  byId('funpayDialog').addEventListener('close', () => {
    if (reloadAfterExport) window.location.reload();
  });
  let activeBonusClient = null;
  function recalculateBonus(fromPercent = true) {
    if (!activeBonusClient) return;
    const currentLimit = activeBonusClient.tokenLimit || 0;
    const amountInput = document.getElementById('bonusAmountInput');
    const percentInput = document.getElementById('bonusPercentInput');
    let addTokens = 0;
    if (fromPercent) {
      const pct = parseFloat(percentInput.value) || 0;
      addTokens = Math.round((currentLimit * pct) / 100);
      amountInput.value = addTokens;
    } else {
      addTokens = parseInt(amountInput.value, 10) || 0;
      if (currentLimit > 0) percentInput.value = Math.round((addTokens / currentLimit) * 100);
    }
    const newLimit = currentLimit + addTokens;
    const fmt = (n) => new Intl.NumberFormat('ru-RU').format(n);
    document.getElementById('bonusPreview').innerHTML = 'Новый лимит: <strong>' + fmt(currentLimit) + '</strong> &rarr; <strong>' + fmt(newLimit) + '</strong> (+' + fmt(addTokens) + ' токенов)';
    document.querySelectorAll('.bonus-preset').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.pct === percentInput.value));
    });
  }
  document.getElementById('bonusPercentInput').addEventListener('input', () => recalculateBonus(true));
  document.getElementById('bonusAmountInput').addEventListener('input', () => recalculateBonus(false));
  document.querySelectorAll('.bonus-preset').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById('bonusPercentInput').value = btn.dataset.pct;
      recalculateBonus(true);
    });
  });
  document.getElementById('bonusForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activeBonusClient || bonusBusy || byId('submitBonusBtn').hidden) return;
    const addTokens = Number(document.getElementById('bonusAmountInput').value);
    if (!Number.isSafeInteger(addTokens) || addTokens <= 0) return;
    bonusBusy = true;
    byId('bonusDialog').querySelectorAll('button').forEach((item) => { item.disabled = true; });
    const btn = document.getElementById('submitBonusBtn');
    btn.disabled = true;
    btn.querySelector('span').textContent = 'Начисляем…';
    const errBox = document.getElementById('bonusError');
    const okBox = document.getElementById('bonusSuccess');
    errBox.hidden = true;
    okBox.hidden = true;
    try {
      const res = await fetch(adminApi + '/keys/' + encodeURIComponent(activeBonusClient.id) + '/add-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addTokens })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка при начислении токенов');
      const fmt = (n) => new Intl.NumberFormat('ru-RU').format(n);
      activeBonusClient.tokenLimit = data.newLimit;
      activeBonusClient.usedTokens = data.usedTokens;
      activeBonusClient.status = data.status;
      updateClientRow(activeBonusClient);
      byId('bonusCurrentLimit').textContent = fmt(data.newLimit);
      byId('bonusRemaining').textContent = fmt(Math.max(0, data.newLimit - data.usedTokens));
      recalculateBonus();
      updateSummary();
      filterClients(false);
      const clientMsg = ['Спасибо за ваш отзыв!', '', 'Вам начислено +' + fmt(data.addedTokens) + ' бонусных токенов.', 'Новый лимит вашего пакета: ' + fmt(data.newLimit) + ' токенов.', '', 'Проверить баланс: ' + data.portalUrl, 'Приятной работы!'].join('\n');
      okBox.innerHTML = 'Токены начислены! Новый лимит: <strong>' + fmt(data.newLimit) + '</strong>.<br><button type="button" class="btn btn-primary" style="margin-top:8px" id="copyBonusResponseBtn">Скопировать ответ покупателю</button>';
      okBox.hidden = false;
      btn.hidden = true;
      document.getElementById('copyBonusResponseBtn').addEventListener('click', () => {
        copyOrSelect(clientMsg);
      });
    } catch (err) {
      errBox.textContent = err.message || 'Ошибка соединения';
      errBox.hidden = false;
    } finally {
      bonusBusy = false;
      byId('bonusDialog').querySelectorAll('button').forEach((item) => { item.disabled = false; });
      btn.querySelector('span').textContent = 'Начислить токены';
    }
  });
  byId('bonusDialog').addEventListener('cancel', (event) => { if (bonusBusy) event.preventDefault(); });
  function updateClientRow(client) {
    const row = rows().find((item) => item.dataset.id === String(client.id));
    const isDepleted = depleted(client);
    const percent = client.tokenLimit ? Math.min(100, Math.round(client.usedTokens / client.tokenLimit * 100)) : 0;
    row.dataset.status = isDepleted ? 'depleted' : 'active';
    row.querySelector('.usage-value').innerHTML = formatNum(client.usedTokens) + ' <span>/ ' + (client.tokenLimit ? formatNum(client.tokenLimit) : '∞') + '</span>';
    const meter = row.querySelector('.mini-meter');
    meter.classList.toggle('is-depleted', isDepleted);
    meter.classList.toggle('is-warning', !isDepleted && percent >= 80);
    meter.setAttribute('aria-valuenow', percent);
    meter.setAttribute('aria-valuetext', percent + '% использовано');
    meter.querySelector('span').style.width = percent + '%';
    const badge = row.querySelector('.badge');
    badge.classList.toggle('is-depleted', isDepleted);
    badge.innerHTML = '<span class="dot"></span>' + (isDepleted ? 'Исчерпан' : 'Активен');
  }
  function openDelete(ids) {
    deletingIds = ids;
    byId('deleteTitle').textContent = 'Удалить доступ: ' + ids.length + '?';
    const client = ids.length === 1 ? clients.find((c) => c.id === ids[0]) : null;
    byId('deleteName').textContent = client ? 'Клиент: ' + client.clientName : 'Будут удалены ключи: ' + ids.length + '. Личные кабинеты станут недоступны.';
    byId('deleteError').hidden = true;
    byId('confirmDelete').textContent = 'Удалить: ' + ids.length;
    byId('deleteDialog').showModal();
  }
  byId('deleteSelected').addEventListener('click', () => openDelete(clients.filter((c) => selected.has(String(c.id))).map((c) => c.id)));
  byId('deleteDialog').addEventListener('cancel', (event) => { if (deleteBusy) event.preventDefault(); });
  document.getElementById('confirmDelete').addEventListener('click', async (event) => {
    if (!deletingIds.length || deleteBusy) return;
    const button = event.currentTarget;
    deleteBusy = true;
    byId('deleteDialog').querySelectorAll('button').forEach((item) => { item.disabled = true; });
    byId('deleteError').hidden = true;
    button.textContent = 'Удаляем…';
    try {
      const response = await fetch(adminApi + '/keys/batch-delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: deletingIds }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Не удалось удалить ключи. Попробуйте ещё раз.');
      const deleted = new Set(result.deletedIds.map(String));
      rows().filter((row) => deleted.has(row.dataset.id)).forEach((row) => row.remove());
      clients = clients.filter((client) => !deleted.has(String(client.id)));
      deletingIds = result.failed.map((item) => item.id);
      selected.clear();
      deletingIds.forEach((id) => selected.add(String(id)));
      updateSummary();
      filterClients(false);
      if (deletingIds.length) {
        byId('deleteTitle').textContent = 'Не удалось удалить: ' + deletingIds.length;
        byId('deleteName').textContent = 'Удалено: ' + result.deletedIds.length + '. Осталось: ' + deletingIds.length + '. Повтор затронет только оставшиеся ключи.';
        byId('deleteError').textContent = result.failed.map((item) => {
          const client = clients.find((c) => c.id === item.id);
          return (client?.clientName || 'Ключ ' + item.id) + ': ' + item.error;
        }).join('\n');
        byId('deleteError').hidden = false;
      } else {
        byId('deleteDialog').close();
        notify('Удалено ключей: ' + result.deletedIds.length);
      }
    } catch (err) {
      const error = document.getElementById('deleteError');
      error.textContent = err.message;
      error.hidden = false;
    } finally {
      deleteBusy = false;
      byId('deleteDialog').querySelectorAll('button').forEach((item) => { item.disabled = false; });
      button.textContent = 'Повторить удаление: ' + deletingIds.length;
    }
  });
  updateSelection();
}
