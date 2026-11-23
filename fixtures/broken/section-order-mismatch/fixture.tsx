import { useEffect } from "react";
import type { Fixture } from "../../host/src/fixture.js";
import { good } from "../../host/src/good.js";

function Scene(): JSX.Element | null {
  useEffect(() => {
    const hero = document.getElementById("section-hero");
    hero?.parentElement?.append(hero);
  }, []);
  const Base = good.Scene;
  return Base ? <Base /> : null;
}

export const fixture: Fixture = { ...good, Scene };
