import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

export default function Dialog({ title, children, onClose, className = '', icon, footer }: { title: string; children: ReactNode; onClose: () => void; className?: string; icon?: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const close = useRef(onClose);
  const drag = useRef<{ y: number; time: number } | null>(null);
  const dragDistance = useRef(0);
  const backdropStart = useRef(false);
  close.current = onClose;
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    const body = document.body;
    const original = { overflow: body.style.overflow, position: body.style.position, top: body.style.top, left: body.style.left, width: body.style.width };
    Object.assign(body.style, { overflow: 'hidden', position: 'fixed', top: `-${scrollY}px`, left: `-${scrollX}px`, width: '100%' });
    dialog?.showModal();
    return () => {
      dialog?.close();
      Object.assign(body.style, original);
      const behavior = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo(scrollX, scrollY);
      document.documentElement.style.scrollBehavior = behavior;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  return createPortal(<dialog ref={ref} className={`app-dialog ${className}`} aria-labelledby={id}
    onCancel={event => { event.preventDefault(); close.current(); }}
    onPointerDown={event => { backdropStart.current = event.target === event.currentTarget; }}
    onClick={event => { if (backdropStart.current && event.target === event.currentTarget) onClose(); }}>
    <div className="dialog-inner">
      <button type="button" tabIndex={-1} className="dialog-drag-handle" aria-label="Close dialog or swipe down" onClick={() => { if (dragDistance.current < 6) onClose(); }}
        onPointerDown={event => {
          if (event.pointerType === 'mouse') return;
          drag.current = { y: event.clientY, time: performance.now() }; dragDistance.current = 0;
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={event => {
          if (!drag.current) return;
          dragDistance.current = Math.max(0, event.clientY - drag.current.y);
          ref.current?.style.setProperty('--sheet-offset', `${Math.min(100, dragDistance.current * .6)}px`);
        }}
        onPointerUp={() => {
          if (!drag.current) return;
          const shouldClose = dragDistance.current > 100 || (dragDistance.current > 55 && performance.now() - drag.current.time < 350);
          drag.current = null; ref.current?.style.removeProperty('--sheet-offset');
          if (shouldClose) onClose();
        }}
        onPointerCancel={() => { drag.current = null; dragDistance.current = 10; ref.current?.style.removeProperty('--sheet-offset'); }}><span /></button>
      <div className="dialog-header"><h2 id={id}>{icon}{title}</h2><button type="button" className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={20} /></button></div>
      <div className="dialog-body">{children}</div>
      {footer && <div className="dialog-footer">{footer}</div>}
    </div>
  </dialog>, document.body);
}