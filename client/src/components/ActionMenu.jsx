import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { MoreVerticalIcon } from './Icons.jsx';
import styles from './ActionMenu.module.css';

/** A small shared menu; the caller supplies only the actions this viewer may use. */
export function ActionMenu({ label, items, disabled = false, buttonRef }) {
  const id = useId();
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const startAtEnd = useRef(false);
  const [open, setOpen] = useState(false);
  const [above, setAbove] = useState(false);

  function close(returnFocus = false) {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }

  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current.getBoundingClientRect();
    const height = panelRef.current.getBoundingClientRect().height;
    // Keep the short menu in view when its trigger is near the bottom of the screen.
    setAbove(window.innerHeight - trigger.bottom < height + 8 && trigger.top > height + 8);
    const choices = panelRef.current.querySelectorAll('[role="menuitem"]');
    choices[startAtEnd.current ? choices.length - 1 : 0]?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function outside(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    function escape(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  function moveFocus(event) {
    const choices = [...panelRef.current.querySelectorAll('[role="menuitem"]')];
    const current = choices.indexOf(document.activeElement);
    let next;
    if (event.key === 'ArrowDown') next = (current + 1) % choices.length;
    if (event.key === 'ArrowUp') next = (current - 1 + choices.length) % choices.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = choices.length - 1;
    if (next !== undefined) {
      event.preventDefault();
      choices[next]?.focus();
    } else if (event.key === 'Tab') {
      // Continue the normal tab order from the trigger after closing the popup.
      close(true);
    }
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button" className={styles.trigger} disabled={disabled}
        ref={(button) => { triggerRef.current = button; if (buttonRef) buttonRef.current = button; }}
        aria-label={label} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined}
        onClick={() => { startAtEnd.current = false; setOpen(!open); }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            startAtEnd.current = event.key === 'ArrowUp';
            setOpen(true);
          }
        }}
      ><MoreVerticalIcon /></button>
      {open && (
        <div id={id} role="menu" aria-label={label} ref={panelRef}
          className={styles.panel + (above ? ' ' + styles.above : '')} onKeyDown={moveFocus}>
          {items.map((item) => {
            const props = {
              role: 'menuitem', tabIndex: -1,
              className: styles.item + (item.danger ? ' ' + styles.danger : ''),
              onClick: () => { close(true); item.onSelect?.(); },
              children: <>{item.icon}<span>{item.label}</span></>,
            };
            return item.to ? <Link key={item.label} {...props} to={item.to} /> : <button key={item.label} {...props} type="button" />;
          })}
        </div>
      )}
    </div>
  );
}
