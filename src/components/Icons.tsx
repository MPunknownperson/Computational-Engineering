// Radix Loom icon layer — consistent symbols for the site's tools and navigation.
// We keep a single <Icon name=… /> API so pages stay terse, and add a subtle
// draw-in on mount plus hover-friendly sizing.
import {
  Sigma,
  ArrowLeftRight,
  Globe,
  CircleDollarSign,
  Braces,
  BarChart3,
  Sparkles,
  ArrowRight,
  Check,
  ChevronDown,
  Plus,
  RefreshCw,
  Copy,
  Trash2,
  Zap,
  ShieldCheck,
  Layers,
  LayoutGrid,
  Target,
  Gem,
  Clock,
  FlaskConical,
  Keyboard,
  Star,
  Calculator,
  Ruler,
  Thermometer,
  Gauge,
  HardDrive,
  Activity,
  Boxes,
  Infinity as InfinityIcon,
  TrendingUp,
  Wallet,
  Waves,
  Menu,
  X,
  Search,
  type LucideIcon,
} from "lucide-react";
import type { SVGProps } from "react";

export type IconName =
  | "sigma" | "swap" | "globe" | "coin" | "function" | "chart"
  | "sparkle" | "arrow-right" | "check" | "chevron" | "plus"
  | "refresh" | "copy" | "trash" | "bolt" | "shield" | "layers"
  | "grid" | "target" | "prism" | "clock" | "flask" | "keyboard" | "star"
  | "calculator" | "ruler" | "thermometer" | "gauge" | "drive"
  | "activity" | "boxes" | "infinity" | "trend" | "wallet" | "waves" | "menu" | "close" | "search";

const MAP: Record<IconName, LucideIcon> = {
  sigma: Sigma,
  swap: ArrowLeftRight,
  globe: Globe,
  coin: CircleDollarSign,
  function: Braces,
  chart: BarChart3,
  sparkle: Sparkles,
  "arrow-right": ArrowRight,
  check: Check,
  chevron: ChevronDown,
  plus: Plus,
  refresh: RefreshCw,
  copy: Copy,
  trash: Trash2,
  bolt: Zap,
  shield: ShieldCheck,
  layers: Layers,
  grid: LayoutGrid,
  target: Target,
  prism: Gem,
  clock: Clock,
  flask: FlaskConical,
  keyboard: Keyboard,
  star: Star,
  calculator: Calculator,
  ruler: Ruler,
  thermometer: Thermometer,
  gauge: Gauge,
  drive: HardDrive,
  activity: Activity,
  boxes: Boxes,
  infinity: InfinityIcon,
  trend: TrendingUp,
  wallet: Wallet,
  waves: Waves,
  menu: Menu,
  close: X,
  search: Search,
};

export function Icon({
  name,
  size = 20,
  strokeWidth = 1.9,
  className = "",
  ...rest
}: { name: IconName; size?: number; strokeWidth?: number } & SVGProps<SVGSVGElement>) {
  const Cmp = MAP[name];
  return (
    <Cmp
      size={size}
      strokeWidth={strokeWidth}
      className={`shrink-0 ${className}`}
      aria-hidden
      {...rest}
    />
  );
}
