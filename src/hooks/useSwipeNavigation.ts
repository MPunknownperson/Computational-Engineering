import { useRef } from 'react';
import type { TouchEvent } from 'react';
import { adjacentTab, swipeStep } from '../lib/gestures';

interface Gesture { id: number; x: number; y: number; time: number }

export function useSwipeNavigation(enabled: boolean, index: number, count: number, onChange: (index: number) => void) {
  const gesture = useRef<Gesture | null>(null);
  const cancel = () => { gesture.current = null; };
  return {
    onTouchStart(event: TouchEvent<HTMLElement>) {
      cancel();
      const target = event.target;
      if (!enabled || event.touches.length !== 1 || (window.visualViewport?.scale || 1) > 1.05) return;
      if (target instanceof Element && target.closest('input, select, textarea, button, a, label, summary, [contenteditable], [role="slider"], .table-scroll, .method-options, [data-no-swipe]')) return;
      if (window.getSelection()?.isCollapsed === false) return;
      const touch = event.touches[0];
      // Leave browser back/forward gestures and notched screen edges alone.
      if (touch.clientX < 28 || touch.clientX > window.innerWidth - 28) return;
      gesture.current = { id: touch.identifier, x: touch.clientX, y: touch.clientY, time: performance.now() };
    },
    onTouchMove(event: TouchEvent<HTMLElement>) {
      if (!gesture.current) return;
      if (event.touches.length !== 1) { cancel(); return; }
      const touch = event.touches[0];
      const dx = touch.clientX - gesture.current.x;
      const dy = touch.clientY - gesture.current.y;
      if (Math.abs(dy) > 18 && Math.abs(dy) > Math.abs(dx)) cancel();
    },
    onTouchEnd(event: TouchEvent<HTMLElement>) {
      const start = gesture.current;
      cancel();
      if (!enabled || !start || event.touches.length || (window.visualViewport?.scale || 1) > 1.05) return;
      if (window.getSelection()?.isCollapsed === false) return;
      const touch = Array.from(event.changedTouches).find(item => item.identifier === start.id);
      if (!touch) return;
      const step = swipeStep(touch.clientX - start.x, touch.clientY - start.y, performance.now() - start.time, window.innerWidth);
      const next = adjacentTab(index, step, count);
      if (step && next !== index) onChange(next);
    },
    onTouchCancel: cancel,
  };
}