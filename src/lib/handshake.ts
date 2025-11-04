// src/lib/handshake.ts

export async function waitForWhopHandshake(ms = 1500) {
  return new Promise<boolean>((resolve) => {
    let done = false;
    const timer = setTimeout(() => { 
      if (!done) {
        console.log('[Whop Handshake] Timeout - continuing without ACK');
        resolve(false);
      }
    }, ms);

    function onMsg(e: MessageEvent) {
      if (typeof e.data === 'object' && e.data?.type === 'HANDSHAKE_ACK') {
        done = true; 
        clearTimeout(timer); 
        window.removeEventListener('message', onMsg);
        console.log('[Whop Handshake] ACK received');
        resolve(true);
      }
    }
    
    window.addEventListener('message', onMsg);
    
    try {
      // отправляем, но НЕ зависим от ответа
      window.parent?.postMessage({ type: 'whop:app_ready' }, '*');
      console.log('[Whop Handshake] Sent handshake, waiting for ACK...');
    } catch (error) {
      console.error('[Whop Handshake] Error sending handshake:', error);
    }
  });
}

