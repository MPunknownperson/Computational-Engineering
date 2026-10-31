/**
 * Ambient declarations for `@rive-app/react-canvas`.
 *
 * Cloudflare Pages/Workers installs dependencies with `bun install`, whose
 * hoisting layout meant `tsc` could not always resolve the bundled `.d.ts`
 * files shipped inside the Rive package ("Cannot find module
 * '@rive-app/react-canvas' or its corresponding type declarations"). The
 * runtime package is still a real dependency — this file only guarantees the
 * compiler always has a type contract for the small surface we use, so the
 * production build is deterministic on every package manager.
 */
declare module "@rive-app/react-canvas" {
  import type { ComponentType, CSSProperties } from "react";

  export enum Fit {
    Cover = "cover",
    Contain = "contain",
    Fill = "fill",
    FitWidth = "fitWidth",
    FitHeight = "fitHeight",
    None = "none",
    ScaleDown = "scaleDown",
    Layout = "layout",
  }

  export enum Alignment {
    Center = "center",
    TopLeft = "topLeft",
    TopCenter = "topCenter",
    TopRight = "topRight",
    CenterLeft = "centerLeft",
    CenterRight = "centerRight",
    BottomLeft = "bottomLeft",
    BottomCenter = "bottomCenter",
    BottomRight = "bottomRight",
  }

  export enum StateMachineInputType {
    Number = 56,
    Trigger = 58,
    Boolean = 59,
  }

  export interface LayoutParameters {
    fit?: Fit;
    alignment?: Alignment;
    minX?: number;
    minY?: number;
    maxX?: number;
    maxY?: number;
    layoutScaleFactor?: number;
  }

  export class Layout {
    constructor(parameters?: LayoutParameters);
    readonly fit: Fit;
    readonly alignment: Alignment;
  }

  export interface StateMachineInput {
    readonly name: string;
    readonly type: number;
    value: number | boolean;
    fire(): void;
  }

  export interface Rive {
    play(animationNames?: string | string[], autoplay?: boolean): void;
    pause(animationNames?: string | string[]): void;
    stop(animationNames?: string | string[]): void;
    reset(options?: Record<string, unknown>): void;
    cleanup(): void;
    resizeDrawingSurfaceToCanvas(devicePixelRatio?: number): void;
    readonly animationNames: string[];
    readonly stateMachineNames: string[];
    stateMachineInputs(name: string): StateMachineInput[] | undefined;
    readonly layout: Layout;
  }

  export interface UseRiveParameters {
    src?: string;
    buffer?: ArrayBuffer;
    artboard?: string;
    animations?: string | string[];
    stateMachines?: string | string[];
    layout?: Layout;
    autoplay?: boolean;
    automaticallyHandleEvents?: boolean;
    useOffscreenRenderer?: boolean;
    shouldDisableRiveListeners?: boolean;
    onLoad?: (event?: unknown) => void;
    onLoadError?: (event?: unknown) => void;
    onPlay?: (event?: unknown) => void;
    onPause?: (event?: unknown) => void;
    onStop?: (event?: unknown) => void;
    onLoop?: (event?: unknown) => void;
    onStateChange?: (event?: unknown) => void;
    onRiveEvent?: (event?: unknown) => void;
  }

  export interface UseRiveOptions {
    useDevicePixelRatio?: boolean;
    customDevicePixelRatio?: number;
    fitCanvasToArtboardHeight?: boolean;
    useOffscreenRenderer?: boolean;
    shouldResizeCanvasToContainer?: boolean;
  }

  export interface RiveComponentProps {
    className?: string;
    style?: CSSProperties;
    children?: React.ReactNode;
    [key: string]: unknown;
  }

  export type RiveComponent = ComponentType<RiveComponentProps>;

  export function useRive(
    parameters?: UseRiveParameters,
    options?: Partial<UseRiveOptions>,
  ): {
    rive: Rive | null;
    RiveComponent: RiveComponent;
    canvas: HTMLCanvasElement | null;
    container: HTMLElement | null;
    setCanvasRef: (canvas: HTMLCanvasElement | null) => void;
    setContainerRef: (container: HTMLElement | null) => void;
  };

  export function useStateMachineInput(
    rive: Rive | null,
    stateMachineName?: string,
    inputName?: string,
    initialValue?: number | boolean,
  ): StateMachineInput | null;

  const RiveDefaultComponent: ComponentType<UseRiveParameters & RiveComponentProps>;
  export default RiveDefaultComponent;
}
