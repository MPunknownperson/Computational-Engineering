import { useEffect, useState } from 'react';

export interface DeviceEnvironment {
  platform: 'ios' | 'ipados' | 'android' | 'other';
  touch: boolean;
  width: number;
  height: number;
  keyboard: boolean;
}

/**
 * Safari 13 and several embedded WebViews expose `MediaQueryList.addListener`
 * but not `addEventListener`. Binding through this helper keeps the pointer
 * query working there instead of throwing during the first effect.
 */
function bindQuery(query: MediaQueryList, handler: () => void) {
  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', handler);
    return () => query.removeEventListener('change', handler);
  }
  const legacy = query as MediaQueryList & { addListener?: (cb: () => void) => void; removeListener?: (cb: () => void) => void };
  if (typeof legacy.addListener === 'function') {
    legacy.addListener(handler);
    return () => { if (legacy.removeListener) legacy.removeListener(handler); };
  }
  return () => {};
}

export function useDeviceEnvironment(): DeviceEnvironment {
  const [device, setDevice] = useState<DeviceEnvironment>({ platform: 'other', touch: false, width: 0, height: 0, keyboard: false });
  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    const coarse = window.matchMedia('(any-pointer: coarse)');
    const agent = navigator.userAgent;
    const platform: DeviceEnvironment['platform'] = /iPad/.test(agent) || (/Macintosh/.test(agent) && navigator.maxTouchPoints > 1) ? 'ipados' : /iPhone|iPod/.test(agent) ? 'ios' : /Android/i.test(agent) ? 'android' : 'other';
    let frame = 0;
    let fullHeight = window.innerHeight;
    let previousWidth = window.innerWidth;
    const update = () => {
      frame = 0;
      const focused = document.activeElement?.matches('input:not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]') || false;
      const zoomed = (viewport?.scale || 1) > 1.05;
      const height = Math.round(viewport?.height || window.innerHeight);
      const width = window.innerWidth;
      if (!focused || Math.abs(width - previousWidth) > 80) fullHeight = window.innerHeight;
      previousWidth = width;
      const keyboard = !zoomed && focused && fullHeight - height > 120;
      root.dataset.platform = platform;
      root.dataset.touch = String(coarse.matches);
      root.dataset.keyboard = String(keyboard);
      // Pinch zoom must retain normal document scaling, not resize the dialog beneath it.
      if (!zoomed) {
        root.style.setProperty('--visible-height', `${height}px`);
        root.style.setProperty('--viewport-top', `${viewport?.offsetTop || 0}px`);
      }
      setDevice(previous => previous.platform === platform && previous.touch === coarse.matches && previous.width === width && previous.height === height && previous.keyboard === keyboard ? previous : { platform, touch: coarse.matches, width, height, keyboard });
    };
    const schedule = () => {
      if (frame) return;
      frame = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(update) : (setTimeout(update, 16) as unknown as number);
    };
    update();
    window.addEventListener('resize', schedule);
    window.addEventListener('orientationchange', schedule);
    document.addEventListener('focusin', schedule);
    document.addEventListener('focusout', schedule);
    viewport?.addEventListener('resize', schedule);
    viewport?.addEventListener('scroll', schedule);
    const unbindQuery = bindQuery(coarse, schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('orientationchange', schedule);
      document.removeEventListener('focusin', schedule);
      document.removeEventListener('focusout', schedule);
      viewport?.removeEventListener('resize', schedule);
      viewport?.removeEventListener('scroll', schedule);
      unbindQuery();
    };
  }, []);
  return device;
}