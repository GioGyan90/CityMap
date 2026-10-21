import './styles.css';
async function boot() {
  try {
    await import('./scene');
    await import('./environment');
    await import('./city');
    await import('./labels');
    await import('./camera');
    await import('./animation');
    document.getElementById('loading')?.remove();
  } catch (error) {
    console.error(error);
    const loading = document.getElementById('loading')!;
    loading.textContent = '地图加载失败，请刷新重试，并确认浏览器已启用 WebGL / 硬件加速。';
  }
}
void boot();
