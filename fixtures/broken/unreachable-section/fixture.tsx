import { useEffect } from "react";
import type { Fixture } from "../../host/src/fixture.js";
import { good } from "../../host/src/good.js";

function Scene(): JSX.Element | null {
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = "[data-bevl-scroller] { height: 300vh !important; }";
    document.head.append(style);
    return () => style.remove();
  }, []);
  const Base = good.Scene;
  return Base ? <Base /> : null;
}

export const fixture: Fixture = { ...good, Scene };
