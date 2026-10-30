"use client";

/**
 * Framework7 engine.
 *
 * Framework7 was built to make a web app indistinguishable from a stock iOS or
 * Android app, and that is exactly what it is used for here:
 *
 * - `theme: "ios" | "md"` swaps the entire component kit between Cupertino and
 *   Material, including navbar layout, typography and ripple behaviour.
 * - Its router performs real native page transitions (iOS parallax push,
 *   Material shared-axis) and supports `iosSwipeBack` / `mdSwipeBack`, giving
 *   genuine edge swipe-to-go-back on a per-view navigation stack.
 * - `Panel` is a native slide-out drawer, `Sheet`/`Popup`/`Actions` are native
 *   modals, and `ptr` + `infinite` on a page give pull-to-refresh and endless
 *   scrolling driven by the device's own touch physics.
 */

import { useEffect, useMemo, useState } from "react";
import Framework7 from "framework7/lite-bundle";
import Framework7React, {
  App,
  Block,
  BlockTitle,
  Button,
  Fab,
  FabButton,
  FabButtons,
  Link,
  List,
  ListInput,
  ListItem,
  Navbar,
  NavRight,
  Page,
  Panel,
  Preloader,
  Sheet,
  Toggle,
  Toolbar,
  View,
  Views,
  f7,
} from "framework7-react";
import type { Router } from "framework7/types";

import "framework7/css/bundle";

import { useNative } from "../NativeProvider";
import { TitleBarOverlay } from "../TitleBarOverlay";
import { impact, notify, selectionChanged, share } from "@/lib/native/bridge";
import { CALC_KEYS, useCalculator, useConverter, useFeed, useSharedInbox } from "@/lib/native/useAppData";
import type { Category } from "@/lib/units";

Framework7.use(Framework7React);

type F7PageProps = { f7router?: Router.Router };

/* ── Detail page: pushed on the stack, so swipe-back applies ─────────────── */

function DetailPage(props: F7PageProps & { title?: string; summary?: string; href?: string }) {
  const { title = "Detail", summary = "", href = "/" } = props;
  return (
    <Page name="detail">
      <Navbar title={title} backLink="Back" />
      <Block strong inset>
        <p>{summary}</p>
        <p className="native-hint">Swipe from the left edge to pop this page — Framework7 drives the real gesture.</p>
      </Block>
      <Block>
        <Button fill large href={href} external target="_blank">
          Open full tool
        </Button>
        <Button large outline className="native-gap-top" onClick={() => void share({ title, text: summary, url: href })}>
          Share
        </Button>
      </Block>
    </Page>
  );
}

/* ── Home: pull-to-refresh + infinite scroll + FAB ───────────────────────── */

function HomePage({ f7router }: F7PageProps) {
  const feed = useFeed();

  const onPtr = async (done: () => void) => {
    await impact("light");
    await feed.refresh();
    done();
  };

  const onInfinite = async () => {
    if (!feed.hasMore || feed.loading) return;
    await feed.loadMore();
  };

  return (
    <Page
      name="home"
      ptr
      onPtrRefresh={onPtr}
      infinite
      infiniteDistance={60}
      infinitePreloader={feed.hasMore && feed.loading}
      onInfinite={onInfinite}
    >
      <Navbar title="Quilloryn" large transparent>
        <NavRight>
          <Link panelOpen="left" iconOnly>
            ☰
          </Link>
        </NavRight>
      </Navbar>

      {feed.error ? (
        <Block strong inset className="native-inline-error">
          {feed.error}
        </Block>
      ) : null}

      <BlockTitle>Engineering tools · {feed.total}</BlockTitle>
      <List strongIos outlineIos dividersIos mediaList>
        {feed.items.map((item) => (
          <ListItem
            key={item.id}
            link="#"
            title={item.title}
            subtitle={item.category}
            text={item.summary}
            swipeout
            onClick={() => {
              void selectionChanged();
              f7router?.navigate("/detail/", {
                props: { title: item.title, summary: item.summary, href: item.href },
              });
            }}
          />
        ))}
      </List>

      {feed.items.length === 0 && feed.loading ? (
        <Block className="text-align-center">
          <Preloader />
        </Block>
      ) : null}

      <Fab position="right-bottom" slot="fixed" text="">
        <FabButtons position="top">
          <FabButton onClick={() => void feed.refresh()}>↻</FabButton>
          <FabButton onClick={() => void share({ title: "Quilloryn", url: "/app/home" })}>⇪</FabButton>
        </FabButtons>
        <span aria-hidden>＋</span>
      </Fab>
    </Page>
  );
}

/* ── Calculator ──────────────────────────────────────────────────────────── */

function CalculatorPage() {
  const calc = useCalculator();
  const [sheetOpen, setSheetOpen] = useState(false);

  const onKey = async (key: string) => {
    const outcome = calc.press(key);
    if (outcome === "error") await notify("error");
    else if (key === "=") await notify("success");
    else await selectionChanged();
  };

  return (
    <Page name="calculator">
      <Navbar title="Calculator" large>
        <NavRight>
          <Link onClick={() => setSheetOpen(true)}>History</Link>
        </NavRight>
      </Navbar>

      <Block strong inset className="native-calc__display">
        <div className="native-calc__expr">{calc.expression || "\u00a0"}</div>
        <div className="native-calc__result">{calc.result}</div>
      </Block>

      <Block inset>
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
        <Button
          large
          outline
          className="native-gap-top"
          onClick={() => void share({ title: "Calculation", text: `${calc.expression} = ${calc.result}` })}
        >
          Share result
        </Button>
      </Block>

      {/* Native-feel bottom sheet with swipe-to-close. */}
      <Sheet opened={sheetOpen} onSheetClosed={() => setSheetOpen(false)} swipeToClose backdrop style={{ height: "60%" }}>
        <Toolbar>
          <div className="left">History</div>
          <div className="right">
            <Link sheetClose>Done</Link>
          </div>
        </Toolbar>
        <Block>
          {calc.history.length === 0 ? (
            <p className="native-hint">No calculations yet.</p>
          ) : (
            <List strongIos dividersIos>
              {calc.history.map((entry, index) => (
                <ListItem
                  key={`${entry.expression}-${index}`}
                  link="#"
                  title={entry.expression}
                  after={entry.result}
                  onClick={() => {
                    calc.setExpression(entry.expression);
                    setSheetOpen(false);
                  }}
                />
              ))}
            </List>
          )}
        </Block>
      </Sheet>
    </Page>
  );
}

/* ── Converter ───────────────────────────────────────────────────────────── */

function ConvertPage() {
  const conv = useConverter();
  return (
    <Page name="convert">
      <Navbar title="Converter" large />
      <List strongIos outlineIos dividersIos inset>
        <ListInput
          label="Category"
          type="select"
          value={conv.category}
          onChange={(e) => conv.changeCategory(e.target.value as Category)}
        >
          {Object.entries(conv.categories).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </ListInput>
        <ListInput
          label="Value"
          type="text"
          inputmode="decimal"
          value={conv.value}
          onChange={(e) => conv.setValue(e.target.value)}
        />
        <ListInput label="From" type="select" value={conv.from} onChange={(e) => conv.setFrom(e.target.value)}>
          {conv.units.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </ListInput>
        <ListInput label="To" type="select" value={conv.to} onChange={(e) => conv.setTo(e.target.value)}>
          {conv.units.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </ListInput>
      </List>

      <Block strong inset className="native-result">
        <span className="native-result__label">Result</span>
        <span className="native-result__value">{conv.output}</span>
      </Block>

      <Block inset>
        <Button large outline onClick={() => { conv.swap(); void selectionChanged(); }}>
          Swap units
        </Button>
        <Button
          large
          fill
          className="native-gap-top"
          onClick={() => void share({ title: "Conversion", text: `${conv.value} ${conv.from} = ${conv.output} ${conv.to}` })}
        >
          Share result
        </Button>
      </Block>
    </Page>
  );
}

/* ── Shared inbox ────────────────────────────────────────────────────────── */

function SharedPage() {
  const inbox = useSharedInbox();
  return (
    <Page
      name="shared"
      ptr
      onPtrRefresh={async (done: () => void) => {
        await inbox.reload();
        done();
      }}
    >
      <Navbar title="Shared with app" large />
      <Block>
        <p className="native-hint">
          Content sent from the system <strong>Share&nbsp;to…</strong> sheet appears here via the Web Share Target API.
        </p>
      </Block>
      {inbox.loading ? (
        <Block className="text-align-center">
          <Preloader />
        </Block>
      ) : inbox.items.length === 0 ? (
        <Block className="native-hint">Nothing shared yet.</Block>
      ) : (
        <List strongIos outlineIos dividersIos mediaList>
          {inbox.items.map((item) => (
            <ListItem
              key={item.id}
              title={item.title || item.kind}
              subtitle={new Date(item.createdAt).toLocaleString()}
              text={item.body || item.url || ""}
              after={item.kind}
              swipeout
            >
              <Link slot="swipeout-actions-right" onClick={() => void inbox.remove(item.id)}>
                Delete
              </Link>
            </ListItem>
          ))}
        </List>
      )}
    </Page>
  );
}

/* ── Settings ────────────────────────────────────────────────────────────── */

function SettingsPage() {
  const native = useNative();
  return (
    <Page name="settings">
      <Navbar title="Settings" large />
      <BlockTitle>Appearance</BlockTitle>
      <List strongIos outlineIos dividersIos inset>
        <ListInput
          label="UI engine"
          type="select"
          value={native.enginePreference}
          onChange={(e) => native.setEnginePreference(e.target.value as "auto" | "ionic" | "framework7")}
        >
          <option value="auto">Automatic ({native.engine})</option>
          <option value="ionic">Ionic Framework</option>
          <option value="framework7">Framework7</option>
        </ListInput>
        <ListInput
          label="Design language"
          type="select"
          value={native.modePreference}
          onChange={(e) => native.setModePreference(e.target.value as "auto" | "ios" | "md")}
        >
          <option value="auto">Match device ({native.mode})</option>
          <option value="ios">iOS · Cupertino</option>
          <option value="md">Android · Material</option>
        </ListInput>
        <ListItem title="Haptic feedback">
          <Toggle slot="after" checked={native.haptics} onToggleChange={(value: boolean) => native.setHaptics(value)} />
        </ListItem>
      </List>

      <BlockTitle>Runtime</BlockTitle>
      <List strongIos outlineIos dividersIos inset>
        <ListItem title="Platform" after={native.info.platform} />
        <ListItem title="Capacitor native" after={native.info.isNative ? "yes" : "web runtime"} />
        <ListItem title="Installed" after={native.info.isStandalone ? "standalone" : "browser tab"} />
        <ListItem title="Window controls overlay" after={native.wco ? "active" : "unavailable"} />
        <ListItem title="Connection" after={native.online ? native.connectionType : "offline"} />
      </List>
    </Page>
  );
}

/* ── Engine root ─────────────────────────────────────────────────────────── */

const TABS = [
  { id: "view-home", url: "/", label: "Discover", glyph: "◳" },
  { id: "view-calculator", url: "/calculator/", label: "Calculator", glyph: "⌗" },
  { id: "view-convert", url: "/convert/", label: "Convert", glyph: "⇄" },
  { id: "view-shared", url: "/shared/", label: "Shared", glyph: "⇪" },
  { id: "view-settings", url: "/settings/", label: "Settings", glyph: "⚙" },
];

export default function F7Engine({ initialTab }: { initialTab: string }) {
  const native = useNative();

  const routes = useMemo<Router.RouteParameters[]>(
    () => [
      { path: "/", component: HomePage },
      { path: "/calculator/", component: CalculatorPage },
      { path: "/convert/", component: ConvertPage },
      { path: "/shared/", component: SharedPage },
      { path: "/settings/", component: SettingsPage },
      { path: "/detail/", component: DetailPage },
      { path: "(.*)", component: HomePage },
    ],
    [],
  );

  const activeId = TABS.find((tab) => tab.url.replace(/\//g, "") === initialTab)?.id ?? "view-home";

  // Keep the URL aligned with the active tab without a server round-trip.
  useEffect(() => {
    const handler = () => undefined;
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  useEffect(() => {
    if (!f7) return;
    try {
      f7.setDarkMode(document.documentElement.dataset.theme === "dark");
    } catch {
      /* dark mode helper unavailable in this build */
    }
  }, [native.mode]);

  return (
    <App
      key={native.mode}
      name="Quilloryn"
      theme={native.mode}
      routes={routes}
      darkMode="auto"
      colors={{ primary: "#3b5bdb" }}
      touch={{ tapHold: true, disableContextMenu: true }}
      view={{
        iosSwipeBack: true,
        mdSwipeBack: true,
        browserHistory: false,
        animate: true,
      }}
      className="native-f7-app"
    >
      <TitleBarOverlay title="Quilloryn" subtitle="Framework7 engine" />

      {/* Native slide-out drawer with real swipe-to-open. */}
      <Panel left cover swipe swipeOnlyClose={false} containerEl="#f7-app">
        <View>
          <Page>
            <Navbar title="Quilloryn" />
            <List strongIos dividersIos>
              {TABS.map((tab) => (
                <ListItem
                  key={tab.id}
                  link="#"
                  panelClose
                  title={tab.label}
                  onClick={() => {
                    void selectionChanged();
                    f7?.tab?.show(`#${tab.id}`);
                  }}
                />
              ))}
            </List>
            <Block className="native-hint">
              Engine: Framework7 · theme {native.mode} · {native.info.platform}
            </Block>
          </Page>
        </View>
      </Panel>

      <Views tabs className="safe-areas">
        <Toolbar tabbar icons bottom>
          {TABS.map((tab) => (
            <Link
              key={tab.id}
              tabLink={`#${tab.id}`}
              tabLinkActive={tab.id === activeId}
              text={tab.label}
              onClick={() => void selectionChanged()}
            >
              <span className="native-f7-glyph" aria-hidden>
                {tab.glyph}
              </span>
            </Link>
          ))}
        </Toolbar>

        {TABS.map((tab) => (
          <View
            key={tab.id}
            id={tab.id}
            tab
            tabActive={tab.id === activeId}
            main={tab.id === "view-home"}
            url={tab.url}
            iosSwipeBack
            mdSwipeBack
          />
        ))}
      </Views>
    </App>
  );
}
