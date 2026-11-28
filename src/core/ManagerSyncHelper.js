/**
 * 《浮世江湖》- 設定總管與區域地圖同步助手 (ManagerSyncHelper)
 * 供物品、武學門派、角色、任務事件四大設定總管共用：
 * 1. 追蹤當前總管是否發生資料變動 (isDirty)
 * 2. 離開總管畫面前（點擊頂部導航按鈕或手動觸發），自動檢查並同步更新所有區域地圖設定
 */
(function (root) {
  let isDirty = false;
  let isSyncing = false;

  function markDirty() {
    isDirty = true;
  }

  function clearDirty() {
    isDirty = false;
  }

  async function syncRegionalMaps(silent = false) {
    if (isSyncing) return null;
    isSyncing = true;
    try {
      const res = await fetch('/api/maps/sync-references', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        isDirty = false;
        if (!silent && typeof root.showToast === 'function') {
          if (data.updatedMaps > 0) {
            root.showToast(`🔄 已檢查 ${data.checkedMaps} 張區域地圖，並自動更新 ${data.updatedMaps} 張地圖設定！`);
          } else {
            root.showToast(`✅ 已檢查 ${data.checkedMaps} 張區域地圖，全部設定均與總管相符！`);
          }
        }
        return data;
      }
    } catch (e) {
      console.warn('區域地圖同步檢查失敗:', e);
    } finally {
      isSyncing = false;
    }
    return null;
  }

  async function navigateWithSync(targetUrl) {
    if (isDirty) {
      await syncRegionalMaps(false);
      await new Promise(r => setTimeout(r, 450));
    } else {
      // 即使未標記 dirty，離開前也執行靜默檢查確保區域地圖與總管 100% 相符
      const data = await syncRegionalMaps(true);
      if (data && data.updatedMaps > 0 && typeof root.showToast === 'function') {
        root.showToast(`🔄 離開前檢查：已自動更新 ${data.updatedMaps} 張區域地圖設定！`);
        await new Promise(r => setTimeout(r, 450));
      }
    }
    root.location.href = targetUrl;
  }

  function attachAutoSyncHooks() {
    // 1. 攔截 header 內所有導航跳轉按鈕 (window.location.href='...')
    document.querySelectorAll('header button[onclick*="location.href"]').forEach(btn => {
      const attr = btn.getAttribute('onclick') || '';
      const match = attr.match(/location\.href\s*=\s*['"]([^'"]+)['"]/);
      if (match && match[1]) {
        const url = match[1];
        btn.removeAttribute('onclick');
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          navigateWithSync(url);
        });
      }
    });

    // 2. 若使用者直接輸入或修改表單/點擊生成或保存按鈕，自動標記變動
    document.addEventListener('input', () => markDirty(), true);
    document.addEventListener('change', () => markDirty(), true);

    // 3. 若未同步即嘗試關閉分頁時提示
    root.addEventListener('beforeunload', (e) => {
      if (isDirty) {
        // 嘗試背景送出同步請求 (keepalive)
        try {
          fetch('/api/maps/sync-references', { method: 'POST', keepalive: true });
        } catch (err) { }
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', attachAutoSyncHooks);
    } else {
      attachAutoSyncHooks();
    }
  }

  root.ManagerSyncHelper = {
    markDirty,
    clearDirty,
    syncRegionalMaps,
    navigateWithSync
  };
})(typeof window !== 'undefined' ? window : this);
