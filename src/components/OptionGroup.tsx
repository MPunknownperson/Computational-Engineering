import { useEffect, useId, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export default function OptionGroup({ title, description, icon, status, children, invalid = false, tone = 'blue' }: { title: string; description: string; icon: ReactNode; status?: string; children: ReactNode; invalid?: boolean; tone?: 'blue' | 'purple' | 'pink' }) {
  const [open, setOpen] = useState(invalid);
  const id = useId();
  useEffect(() => { if (invalid) setOpen(true); }, [invalid]);
  return <section className={`option-group ${open ? 'is-open' : ''} tone-${tone}`}>
    <button type="button" className="option-heading" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={id}>
      <span className="option-icon">{icon}</span><span className="option-copy"><strong>{title}</strong><small>{description}</small></span>
      {status && <span className="option-status">{status}</span>}<ChevronDown size={16} className="option-chevron" />
    </button>
    <div id={id} hidden={!open} className="option-content">{children}</div>
  </section>;
}