import { DoodleyContext } from "@doodley/core";
import { useContext } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion.js";
import type { A11yConfig } from "../types.js";

interface Props {
  config: A11yConfig;
}

const STYLES = {
  skipLink: {
    position: "absolute",
    left: "-9999px",
    top: "auto",
    width: 1,
    height: 1,
    overflow: "hidden",
    zIndex: 100,
  } as React.CSSProperties,
  skipLinkFocused: {
    position: "fixed",
    left: 16,
    top: 16,
    width: "auto",
    height: "auto",
    overflow: "visible",
    padding: "8px 16px",
    background: "#fff",
    color: "#000",
    fontWeight: 700,
    zIndex: 100,
    outline: "3px solid #0066ff",
  } as React.CSSProperties,
  nav: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    display: "flex",
    gap: 8,
    padding: "12px 24px",
    background: "rgba(0,0,0,0.5)",
    backdropFilter: "blur(8px)",
  } as React.CSSProperties,
  link: {
    color: "#fff",
    textDecoration: "none",
    padding: "4px 12px",
    borderRadius: 4,
    fontSize: 14,
    fontWeight: 600,
  } as React.CSSProperties,
};

export function DoodleyA11y({ config }: Props): JSX.Element | null {
  const ctx = useContext(DoodleyContext);
  const reducedMotion = useReducedMotion();
  const sections = config.sections;
  const skipLabel = config.skipLinkLabel ?? "Skip to content";

  function handleNavClick(e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) {
    e.preventDefault();
    const target = document.getElementById(`section-${sectionId}`);
    if (!target) return;
    // With reduced motion just jump, otherwise scroll the container
    if (reducedMotion) {
      target.scrollIntoView();
    } else {
      target.scrollIntoView({ behavior: "smooth" });
    }
    // Update scroll progress via the scrollable container
    const scroller = document.querySelector<HTMLElement>("[data-doodley-scroller]");
    if (scroller) {
      const max = scroller.scrollHeight - scroller.clientHeight;
      const index = sections.findIndex((s) => s.id === sectionId);
      const frac = sections.length > 1 ? index / (sections.length - 1) : 0;
      scroller.scrollTop = frac * max;
    }
    // Move focus to the section anchor
    target.setAttribute("tabindex", "-1");
    target.focus();
  }

  if (!ctx) return null;

  return (
    <>
      {/* Skip link — only visible on focus */}
      <a
        href="#main-content"
        style={STYLES.skipLink}
        onFocus={(e) => Object.assign(e.currentTarget.style, STYLES.skipLinkFocused)}
        onBlur={(e) => Object.assign(e.currentTarget.style, STYLES.skipLink)}
      >
        {skipLabel}
      </a>

      {/* Main navigation */}
      <nav aria-label="Site sections">
        <ul style={{ ...STYLES.nav, listStyle: "none", margin: 0, padding: "12px 24px" }}>
          {sections.map((s) => (
            <li key={s.id}>
              <a
                href={`#section-${s.id}`}
                style={STYLES.link}
                onClick={(e) => handleNavClick(e, s.id)}
              >
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Hidden landmark for skip link target */}
      <main id="main-content" aria-label="Main content" tabIndex={-1} />
    </>
  );
}
