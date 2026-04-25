import { useCallback, useEffect, useRef, type RefObject } from "react";

interface ScrollOptions {
  offsetTop?: number;
}

function scrollElementIntoView(el: HTMLElement, offsetTop: number) {
  const rect = el.getBoundingClientRect();
  if (rect.top >= offsetTop - 20 && rect.top < window.innerHeight * 0.7) return;
  const y = window.scrollY + rect.top - offsetTop;
  window.scrollTo({ top: y, behavior: "smooth" });
}

/**
 * Pattern A — single detail panel above a list.
 * Pass a ref to the panel and a key that changes when a new item is selected.
 */
export function useScrollIntoViewOnChange(
  ref: RefObject<HTMLElement | null>,
  depKey: string | number | null | undefined,
  options: ScrollOptions = {},
) {
  const { offsetTop = 80 } = options;
  useEffect(() => {
    if (depKey == null || !ref.current) return;
    scrollElementIntoView(ref.current, offsetTop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depKey]);
}

/**
 * Pattern B — inline expansion in a list.
 * Returns a ref-callback factory. Call `register(id)` in the card's `ref` prop.
 * When `expandedKey` changes to a registered id, that card scrolls into view.
 */
export function useScrollToExpanded(
  expandedKey: string | number | null | undefined,
  options: ScrollOptions = {},
) {
  const { offsetTop = 80 } = options;
  const mapRef = useRef<Map<string | number, HTMLElement>>(new Map());

  useEffect(() => {
    if (expandedKey == null) return;
    const el = mapRef.current.get(expandedKey);
    if (!el) return;
    scrollElementIntoView(el, offsetTop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedKey]);

  const register = useCallback(
    (id: string | number) => (el: HTMLElement | null) => {
      if (el) {
        mapRef.current.set(id, el);
      } else {
        mapRef.current.delete(id);
      }
    },
    [],
  );

  return register;
}
