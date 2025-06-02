'use client';

import { RefObject, useEffect } from 'react';

type RefType = RefObject<HTMLElement>;

export function useClickAway(refs: RefType | RefType[], callback: () => void) {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const refsArray = Array.isArray(refs) ? refs : [refs];
      const clickedInside = refsArray.some(
        (ref) => ref.current && ref.current.contains(event.target as Node)
      );

      if (!clickedInside) {
        callback();
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [refs, callback]);
}
