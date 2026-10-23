"use client";

/**
 * Ionic Framework engine.
 *
 * Ionic ships two complete design languages — `ios` (Cupertino) and `md`
 * (Material Design) — and swaps every component's markup, spacing, ripple /
 * highlight behaviour and transition curve accordingly. We resolve the mode
 * from the real OS, so the same code renders a Cupertino app on an iPhone and
 * a Material app on Android.
 *
 * Native behaviours wired up here:
 * - `IonNav` stack with `swipeGesture` → swipe-to-go-back (iOS edge swipe).
 * - `IonRefresher` → pull-to-refresh with the platform's own spinner.
 * - `IonInfiniteScroll` → endless paging against the server feed.
 * - `IonFab` / `IonFabList` → Material FAB + speed dial.
 * - `IonMenu` → slide-out drawer, `IonModal` → sheet with detents.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  IonApp,
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonFabList,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonInput,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonList,
  IonListHeader,
  IonMenu,
  IonMenuButton,
  IonMenuToggle,
  IonModal,
  IonNav,
  IonNavLink,
  IonNote,
  IonRefresher,
  IonRefresherContent,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonSplitPane,
  IonTitle,
  IonToggle,
  IonToolbar,
  setupIonicReact,
  useIonActionSheet,
  type InfiniteScrollCustomEvent,
  type RefresherCustomEvent,
} from "@ionic/react";
import {
  addOutline,
  arrowBackOutline,
  calculatorOutline,
  cloudDoneOutline,
  cloudOfflineOutline,
  copyOutline,
  informationCircleOutline,
  menuOutline,
  openOutline,
  shareSocialOutline,
  settingsOutline,
  swapHorizontalOutline,
  trashOutline,
  fileTrayFullOutline,
} from "ionicons/icons";

import "@ionic/react/css/core.css";
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";
import "@ionic/react/css/padding.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/text-alignment.css";
import "@ionic/react/css/display.css";
import "@ionic/react/css/palettes/dark.class.css";

import { useNative } from "../NativeProvider";
import { TitleBarOverlay } from "../TitleBarOverlay";
import { impact, notify, selectionChanged, share } from "@/lib/native/bridge";
import { CALC_KEYS, useCalculator, useConverter, useFeed, useSharedInbox, type FeedItem } from "@/lib/native/useAppData";
import type { Category } from "@/lib/units";

type TabKey = "home" | "calculator" | "convert" | "shared";

const TABS: Array<{ key: TabKey; label: string; icon: string }> = [
  { key: "home", label: "Discover", icon: fileTrayFullOutline },
  { key: "calculator", label: "Calculator", icon: calculatorOutline },
  { key: "convert", label: "Convert", icon: swapHorizontalOutline },
  { key: "shared", label: "Shared", icon: shareSocialOutline },
];

/* ── Detail page (pushed onto the nav stack → swipe-back works here) ─────── */

function DetailPage({ item }: { item: FeedItem }) {
  return (
    <>
      <IonHeader translucent>
        <IonToolbar>
          <IonButtons slot="start">
            <IonNavLink routerDirection="back">
              <IonButton>
                <IonIcon slot="start" icon={arrowBackOutline} />
                Back
              </IonButton>
            </IonNavLink>
          </IonButtons>
          <IonTitle>{item.title}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        <h2>{item.title}</h2>
        <IonNote>{item.category}</IonNote>
        <p>{item.summary}</p>
        <p className="native-hint">Swipe from the left edge to go back, exactly like a native stack.</p>
        <IonButton expand="block" href={item.href} target="_blank" rel="noreferrer">
          <IonIcon slot="start" icon={openOutline} />
          Open full tool
        </IonButton>
        <IonButton
          expand="block"
          fill="outline"
          onClick={() => void share({ title: item.title, text: item.summary, url: item.href })}
        >
          <IonIcon slot="start" icon={shareSocialOutline} />
          Share
        </IonButton>
      </IonContent>
    </>
  );
}

/* ── Screens ─────────────────────────────────────────────────────────────── */

function HomeScreen() {
  const feed = useFeed();
  const [presentActionSheet] = useIonActionSheet();

  const onRefresh = async (event: RefresherCustomEvent) => {
    await impact("light");
    await feed.refresh();
    await event.detail.complete();
  };

  const onInfinite = async (event: InfiniteScrollCustomEvent) => {
    await feed.loadMore();
    await event.target.complete();
  };

  return (
    <>
      <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
        <IonRefresherContent pullingText="Pull to refresh" refreshingSpinner="crescent" />
      </IonRefresher>

      {feed.error ? (
        <div className="native-inline-error">
          <IonIcon icon={cloudOfflineOutline} /> {feed.error}
        </div>
      ) : null}

      <IonList inset>
        <IonListHeader>
          <IonLabel>Engineering tools</IonLabel>
          <IonBadge color="medium">{feed.total}</IonBadge>
        </IonListHeader>
        {feed.items.map((item) => (
          <IonItemSliding key={item.id}>
            <IonNavLink routerDirection="forward" component={() => <DetailPage item={item} />}>
              <IonItem button detail onClick={() => void selectionChanged()}>
                <IonLabel>
                  <h3>{item.title}</h3>
                  <p>{item.summary}</p>
                </IonLabel>
              </IonItem>
            </IonNavLink>
            <IonItemOptions side="end">
              <IonItemOption
                onClick={() => void share({ title: item.title, text: item.summary, url: item.href })}
              >
                <IonIcon slot="icon-only" icon={shareSocialOutline} />
              </IonItemOption>
            </IonItemOptions>
          </IonItemSliding>
        ))}
      </IonList>

      {feed.items.length === 0 && feed.loading ? (
        <div className="native-center">
          <IonSpinner name="crescent" />
        </div>
      ) : null}

      <IonInfiniteScroll onIonInfinite={onInfinite} disabled={!feed.hasMore}>
        <IonInfiniteScrollContent loadingSpinner="crescent" loadingText="Loading more…" />
      </IonInfiniteScroll>

      <IonFab slot="fixed" vertical="bottom" horizontal="end">
        <IonFabButton onClick={() => void impact("medium")}>
          <IonIcon icon={addOutline} />
        </IonFabButton>
        <IonFabList side="top">
          <IonFabButton
            onClick={() =>
              presentActionSheet({
                header: "Quick actions",
                buttons: [
                  { text: "Share this app", icon: shareSocialOutline, handler: () => void share({ title: "Radix Loom", url: "/app/home" }) },
                  { text: "Refresh feed", handler: () => void feed.refresh() },
                  { text: "Cancel", role: "cancel" },
                ],
              })
            }
          >
            <IonIcon icon={informationCircleOutline} />
          </IonFabButton>
          <IonFabButton onClick={() => void feed.refresh()}>
            <IonIcon icon={cloudDoneOutline} />
          </IonFabButton>
        </IonFabList>
      </IonFab>
    </>
  );
}

function CalculatorScreen() {
  const calc = useCalculator();
  const [showHistory, setShowHistory] = useState(false);

  const onKey = async (key: string) => {
    const outcome = calc.press(key);
    if (outcome === "error") await notify("error");
    else if (key === "=") await notify("success");
    else await selectionChanged();
  };

  return (
    <div className="native-calc">
      <div className="native-calc__display">
        <div className="native-calc__expr">{calc.expression || "\u00a0"}</div>
        <div className="native-calc__result">{calc.result}</div>
      </div>
      <div className="native-calc__actions">
        <IonButton size="small" fill="clear" onClick={() => setShowHistory(true)}>
          History ({calc.history.length})
        </IonButton>
        <IonButton
          size="small"
          fill="clear"
          onClick={() => void share({ title: "Calculation", text: `${calc.expression} = ${calc.result}` })}
        >
          <IonIcon slot="start" icon={shareSocialOutline} />
          Share
        </IonButton>
      </div>
      <div className="native-calc__pad">
        {CALC_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            className="native-key"
            data-variant={key === "=" ? "accent" : "0123456789.".includes(key) ? "digit" : "op"}
            onClick={() => void onKey(key)}
          >
            {key === "DEL" ? "⌫" : key}
          </button>
        ))}
      </div>

      {/* Sheet modal with iOS-style detents. */}
      <IonModal
        isOpen={showHistory}
        onDidDismiss={() => setShowHistory(false)}
        breakpoints={[0, 0.5, 0.92]}
        initialBreakpoint={0.5}
        handleBehavior="cycle"
      >
        <IonHeader>
          <IonToolbar>
            <IonTitle>History</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowHistory(false)}>Done</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          {calc.history.length === 0 ? (
            <p className="native-hint">No calculations yet.</p>
          ) : (
            <IonList>
              {calc.history.map((entry, index) => (
                <IonItem key={`${entry.expression}-${index}`} button onClick={() => calc.setExpression(entry.expression)}>
                  <IonLabel>
                    <h3>{entry.expression}</h3>
                    <p>= {entry.result}</p>
                  </IonLabel>
                </IonItem>
              ))}
            </IonList>
          )}
          <IonButton expand="block" fill="outline" color="danger" onClick={calc.clearHistory}>
            <IonIcon slot="start" icon={trashOutline} />
            Clear history
          </IonButton>
        </IonContent>
      </IonModal>
    </div>
  );
}

function ConvertScreen() {
  const conv = useConverter();
  return (
    <div className="native-pad">
      <IonList inset>
        <IonItem>
          <IonSelect
            label="Category"
            value={conv.category}
            onIonChange={(e) => conv.changeCategory(e.detail.value as Category)}
            interface="action-sheet"
          >
            {Object.entries(conv.categories).map(([key, label]) => (
              <IonSelectOption key={key} value={key}>
                {label}
              </IonSelectOption>
            ))}
          </IonSelect>
        </IonItem>
        <IonItem>
          <IonInput
            label="Value"
            inputMode="decimal"
            value={conv.value}
            onIonInput={(e) => conv.setValue(String(e.detail.value ?? ""))}
          />
        </IonItem>
        <IonItem>
          <IonSelect label="From" value={conv.from} onIonChange={(e) => conv.setFrom(String(e.detail.value))} interface="action-sheet">
            {conv.units.map(([key, label]) => (
              <IonSelectOption key={key} value={key}>
                {label}
              </IonSelectOption>
            ))}
          </IonSelect>
        </IonItem>
        <IonItem>
          <IonSelect label="To" value={conv.to} onIonChange={(e) => conv.setTo(String(e.detail.value))} interface="action-sheet">
            {conv.units.map(([key, label]) => (
              <IonSelectOption key={key} value={key}>
                {label}
              </IonSelectOption>
            ))}
          </IonSelect>
        </IonItem>
      </IonList>

      <div className="native-result">
        <span className="native-result__label">Result</span>
        <span className="native-result__value">{conv.output}</span>
      </div>

      <IonButton expand="block" fill="outline" onClick={() => { conv.swap(); void selectionChanged(); }}>
        <IonIcon slot="start" icon={swapHorizontalOutline} />
        Swap units
      </IonButton>
      <IonButton
        expand="block"
        onClick={() => void share({ title: "Conversion", text: `${conv.value} ${conv.from} = ${conv.output} ${conv.to}` })}
      >
        <IonIcon slot="start" icon={shareSocialOutline} />
        Share result
      </IonButton>
    </div>
  );
}

function SharedScreen() {
  const inbox = useSharedInbox();
  return (
    <>
      <IonRefresher
        slot="fixed"
        onIonRefresh={async (event: RefresherCustomEvent) => {
          await inbox.reload();
          await event.detail.complete();
        }}
      >
        <IonRefresherContent />
      </IonRefresher>

      <div className="native-pad">
        <p className="native-hint">
          Anything sent to Radix Loom from the system <strong>Share&nbsp;to…</strong> sheet lands here. The app registers
          itself as a share target through the Web Share Target API.
        </p>
      </div>

      {inbox.loading ? (
        <div className="native-center">
          <IonSpinner name="crescent" />
        </div>
      ) : inbox.items.length === 0 ? (
        <div className="native-center native-hint">Nothing shared yet.</div>
      ) : (
        <IonList inset>
          {inbox.items.map((item) => (
            <IonItemSliding key={item.id}>
              <IonItem>
                <IonLabel>
                  <h3>{item.title || item.kind}</h3>
                  <p>{item.body || item.url}</p>
                  <IonNote>{new Date(item.createdAt).toLocaleString()}</IonNote>
                </IonLabel>
                <IonBadge slot="end">{item.kind}</IonBadge>
              </IonItem>
              <IonItemOptions side="end">
                <IonItemOption color="danger" onClick={() => void inbox.remove(item.id)}>
                  <IonIcon slot="icon-only" icon={trashOutline} />
                </IonItemOption>
              </IonItemOptions>
            </IonItemSliding>
          ))}
        </IonList>
      )}
    </>
  );
}

function SettingsScreen() {
  const native = useNative();
  return (
    <div className="native-pad">
      <IonList inset>
        <IonListHeader>
          <IonLabel>Appearance</IonLabel>
        </IonListHeader>
        <IonItem>
          <IonSelect
            label="UI engine"
            value={native.enginePreference}
            onIonChange={(e) => native.setEnginePreference(e.detail.value)}
            interface="action-sheet"
          >
            <IonSelectOption value="auto">Automatic ({native.engine})</IonSelectOption>
            <IonSelectOption value="ionic">Ionic Framework</IonSelectOption>
            <IonSelectOption value="framework7">Framework7</IonSelectOption>
          </IonSelect>
        </IonItem>
        <IonItem>
          <IonSelect
            label="Design language"
            value={native.modePreference}
            onIonChange={(e) => native.setModePreference(e.detail.value)}
            interface="action-sheet"
          >
            <IonSelectOption value="auto">Match device ({native.mode})</IonSelectOption>
            <IonSelectOption value="ios">iOS · Cupertino</IonSelectOption>
            <IonSelectOption value="md">Android · Material</IonSelectOption>
          </IonSelect>
        </IonItem>
        <IonItem>
          <IonToggle checked={native.haptics} onIonChange={(e) => native.setHaptics(e.detail.checked)}>
            Haptic feedback
          </IonToggle>
        </IonItem>
      </IonList>

      <IonList inset>
        <IonListHeader>
          <IonLabel>Runtime</IonLabel>
        </IonListHeader>
        <IonItem>
          <IonLabel>Platform</IonLabel>
          <IonNote slot="end">{native.info.platform}</IonNote>
        </IonItem>
        <IonItem>
          <IonLabel>Capacitor native</IonLabel>
          <IonNote slot="end">{native.info.isNative ? "yes" : "web runtime"}</IonNote>
        </IonItem>
        <IonItem>
          <IonLabel>Installed</IonLabel>
          <IonNote slot="end">{native.info.isStandalone ? "standalone" : "browser tab"}</IonNote>
        </IonItem>
        <IonItem>
          <IonLabel>Window controls overlay</IonLabel>
          <IonNote slot="end">{native.wco ? "active" : "unavailable"}</IonNote>
        </IonItem>
        <IonItem>
          <IonLabel>Connection</IonLabel>
          <IonNote slot="end">{native.online ? native.connectionType : "offline"}</IonNote>
        </IonItem>
      </IonList>
    </div>
  );
}

/* ── Tab root ────────────────────────────────────────────────────────────── */

const TITLES: Record<TabKey | "settings", string> = {
  home: "Radix Loom",
  calculator: "Calculator",
  convert: "Converter",
  shared: "Shared with app",
  settings: "Settings",
};

function TabsRoot({ initialTab }: { initialTab: TabKey | "settings" }) {
  const native = useNative();
  const [tab, setTab] = useState<TabKey | "settings">(initialTab);

  // Keep the address bar honest without triggering a server navigation.
  useEffect(() => {
    const path = `/app/${tab}`;
    if (window.location.pathname !== path) window.history.replaceState(null, "", path);
  }, [tab]);

  const changeTab = useCallback((next: TabKey | "settings") => {
    setTab(next);
    void selectionChanged();
  }, []);

  return (
    <>
      <IonHeader translucent={native.mode === "ios"}>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton autoHide={false}>
              <IonIcon icon={menuOutline} />
            </IonMenuButton>
          </IonButtons>
          <IonTitle>{TITLES[tab]}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => changeTab("settings")} aria-label="Settings">
              <IonIcon slot="icon-only" icon={settingsOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen scrollEvents>
        {native.mode === "ios" ? (
          <IonHeader collapse="condense">
            <IonToolbar>
              <IonTitle size="large">{TITLES[tab]}</IonTitle>
            </IonToolbar>
          </IonHeader>
        ) : null}

        {tab === "home" ? <HomeScreen /> : null}
        {tab === "calculator" ? <CalculatorScreen /> : null}
        {tab === "convert" ? <ConvertScreen /> : null}
        {tab === "shared" ? <SharedScreen /> : null}
        {tab === "settings" ? <SettingsScreen /> : null}
      </IonContent>

      <IonFooter translucent={native.mode === "ios"}>
        <nav className="native-tabbar" data-mode={native.mode} aria-label="App sections">
          {TABS.map((entry) => (
            <button
              key={entry.key}
              type="button"
              className="native-tabbar__item"
              data-active={tab === entry.key}
              aria-current={tab === entry.key ? "page" : undefined}
              onClick={() => changeTab(entry.key)}
            >
              <span className="native-tabbar__indicator" aria-hidden />
              <IonIcon icon={entry.icon} />
              <span className="native-tabbar__label">{entry.label}</span>
            </button>
          ))}
        </nav>
      </IonFooter>
    </>
  );
}

/* ── Engine root ─────────────────────────────────────────────────────────── */

export default function IonicEngine({ initialTab }: { initialTab: TabKey | "settings" }) {
  const native = useNative();
  const configured = useRef<string>("");

  // Ionic reads its design language from global config, so re-apply whenever
  // the resolved mode changes and remount the tree with a matching key.
  if (configured.current !== native.mode) {
    setupIonicReact({
      mode: native.mode,
      animated: true,
      swipeBackEnabled: native.mode === "ios",
      rippleEffect: native.mode === "md",
    });
    configured.current = native.mode;
  }

  useEffect(() => {
    document.documentElement.classList.toggle("ion-palette-dark", document.documentElement.dataset.theme === "dark");
  }, []);

  return (
    <IonApp key={native.mode} className="native-ionic-app">
      <TitleBarOverlay title="Radix Loom" subtitle="Ionic engine" />
      <IonSplitPane contentId="native-main" when="(min-width: 1024px)">
        <IonMenu contentId="native-main" menuId="native-menu" type={native.mode === "ios" ? "overlay" : "overlay"}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Radix Loom</IonTitle>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <IonList>
              {[...TABS, { key: "settings" as const, label: "Settings", icon: settingsOutline }].map((entry) => (
                <IonMenuToggle key={entry.key} autoHide={false}>
                  <IonItem button detail={false} onClick={() => window.dispatchEvent(new CustomEvent("native:tab", { detail: entry.key }))}>
                    <IonIcon slot="start" icon={entry.icon} />
                    <IonLabel>{entry.label}</IonLabel>
                  </IonItem>
                </IonMenuToggle>
              ))}
            </IonList>
            <div className="native-pad native-hint">
              <IonIcon icon={copyOutline} /> Engine: Ionic · mode {native.mode} · {native.info.platform}
            </div>
          </IonContent>
        </IonMenu>

        {/* IonNav gives a real page stack: native push/pop transitions plus the
            iOS edge swipe-to-go-back gesture, with no router dependency. */}
        <IonNav
          id="native-main"
          className="native-nav"
          swipeGesture={native.mode === "ios"}
          root={() => <TabsRootBridge initialTab={initialTab} />}
        />
      </IonSplitPane>
    </IonApp>
  );
}

/** Bridges menu clicks (fired as DOM events) into the tab state. */
function TabsRootBridge({ initialTab }: { initialTab: TabKey | "settings" }) {
  const [tab, setTab] = useState<TabKey | "settings">(initialTab);
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<TabKey | "settings">).detail;
      if (detail) setTab(detail);
    };
    window.addEventListener("native:tab", handler);
    return () => window.removeEventListener("native:tab", handler);
  }, []);
  return <TabsRoot key={tab} initialTab={tab} />;
}
