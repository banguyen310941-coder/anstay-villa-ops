(() => {
  let pendingInstall = null;
  let installed = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const status = text => { const el = document.getElementById('installStatus'); if (el) el.textContent = text; };
  const update = () => {
    const button = document.getElementById('installApp');
    if (button) { button.hidden = installed || !pendingInstall; button.disabled = false; }
    if (installed) status('Bạn đang mở ANSTAY ở chế độ ứng dụng.');
  };
  addEventListener('beforeinstallprompt', event => { event.preventDefault(); pendingInstall = event; update(); });
  addEventListener('appinstalled', () => { pendingInstall = null; installed = true; update(); status('Đã cài ANSTAY. Mở biểu tượng trên màn hình chính để đăng nhập.'); });
  document.addEventListener('DOMContentLoaded', () => {
    update();
    document.getElementById('installApp')?.addEventListener('click', async event => {
      if (!pendingInstall) return;
      const prompt = pendingInstall; pendingInstall = null; event.currentTarget.disabled = true;
      try { await prompt.prompt(); const choice = await prompt.userChoice; status(choice.outcome === 'accepted' ? 'Đã chấp nhận cài đặt. Chờ trình duyệt hoàn tất.' : 'Bạn chưa cài app. Có thể cài lại từ menu trình duyệt.'); }
      catch { status('Chưa mở được cửa sổ cài đặt. Hãy làm theo hướng dẫn bên dưới.'); }
      finally { update(); }
    });
    document.getElementById('copyLink')?.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(location.origin + '/huong-dan.html'); status('Đã sao chép liên kết hướng dẫn. Bạn có thể gửi cho nhân viên.'); }
      catch { status('Hãy sao chép địa chỉ trang này trên thanh địa chỉ để chia sẻ.'); }
    });
    document.getElementById('printGuide')?.addEventListener('click', () => { document.querySelectorAll('details').forEach(el => el.open = true); print(); });
    const ua = navigator.userAgent;
    const device = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ? 'ios' : /Android/.test(ua) ? 'android' : 'desktop';
    const panel = document.getElementById(device); if (panel) { panel.open = true; panel.classList.add('recommended'); }
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js', {updateViaCache:'none'}).catch(() => status('Chưa chuẩn bị được chế độ cài app. Kiểm tra mạng rồi tải lại trang.'));
  });
})();
