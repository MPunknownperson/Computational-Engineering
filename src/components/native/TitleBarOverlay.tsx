"use client";

import { useNative } from "./NativeProvider";

/**
 * Window Controls Overlay title bar.
 *
 * On an installed desktop PWA the browser title bar is removed (declared via
 * `display_override: ["window-controls-overlay"]`) and the app paints its own
 * strip across the top. `-webkit-app-region: drag` makes that strip behave
 * like a real window caption: drag to move, double-click to maximise. The
 * `env(titlebar-area-*)` values keep our content clear of the OS buttons.
 */
export function TitleBarOverlay({ title, subtitle }: { title: string; subtitle?: string }) {
  const { wco, info, online } = useNative();
  if (!wco) return null;

  return (
    <div className="native-titlebar" role="presentation">
      <div className="native-titlebar__drag">
        <span className="native-titlebar__mark" aria-hidden>
          ◆
        </span>
        <span className="native-titlebar__title">{title}</span>
        {subtitle ? <span className="native-titlebar__subtitle">{subtitle}</span> : null}
        <span className="native-titlebar__spacer" />
        <span className="native-titlebar__state" data-online={online ? "yes" : "no"}>
          {online ? "Connected" : "No connection"}
        </span>
        <span className="native-titlebar__platform">{info.platform}</span>
      </div>
    </div>
  );
}
