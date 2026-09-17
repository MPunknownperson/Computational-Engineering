import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

export default function Dialog({ title, children, onClose, className = '', icon, footer }: { title: string; children: ReactNode; onClose: () => void; className?: string; icon?: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { dialog?.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return createPortal(<dialog ref={ref} className={`app-dialog ${className}`} aria-labelledby={id} onCancel={event => {event.preventDefault();close.current();}} onClick={event => {if (event.target === event.currentTarget) onClose();}}><div className="dialog-inner"><div className="dialog-header"><h2 id={id}>{icon}{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={20}/></button></div><div className="dialog-body">{children}</div>{footer && <div className="dialog-footer">{footer}</div>}</div></dialog>,document.body);
}