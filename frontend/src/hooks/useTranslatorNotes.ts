import { useState } from "react";

/**
 * Per-session toggle for KJV translator annotations.
 * Not persisted — resets on page reload, as requested.
 */
export function useTranslatorNotes(initial = false) {
  const [notesOn, setNotesOn] = useState(initial);
  return {
    notesOn,
    toggle: () => setNotesOn((v) => !v),
    setNotesOn,
  };
}
