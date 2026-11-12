import { useLayoutEffect, useRef } from 'react';

// Champ de montant en CHF : affiche « 1 250 000 » pendant la saisie,
// mais transmet uniquement les chiffres (« 1250000 ») au formulaire.

const group = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export default function MoneyInput({
  value,
  onChange,
  placeholder,
  required,
  id,
  className,
}: {
  /** Montant en chiffres seulement, ex. "950000" */
  value: string;
  onChange: (digits: string) => void;
  placeholder?: string;
  required?: boolean;
  id?: string;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  // Nombre de chiffres situés avant le curseur, pour le replacer après le reformatage
  const caretDigits = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || caretDigits.current === null) return;
    let seen = 0;
    let pos = 0;
    while (pos < el.value.length && seen < caretDigits.current) {
      if (/\d/.test(el.value[pos])) seen++;
      pos++;
    }
    el.setSelectionRange(pos, pos);
    caretDigits.current = null;
  }, [value]);

  return (
    <input
      ref={ref}
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={group(value)}
      onChange={(e) => {
        const raw = e.target.value;
        const caret = e.target.selectionStart ?? raw.length;
        caretDigits.current = raw.slice(0, caret).replace(/\D/g, '').length;
        onChange(raw.replace(/\D/g, '').replace(/^0+(?=\d)/, ''));
      }}
      placeholder={placeholder ? group(placeholder) : undefined}
      required={required}
      className={className}
    />
  );
}
