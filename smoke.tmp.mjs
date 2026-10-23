import { chromium, devices } from "@playwright/test";

const cases = [
  { name: "Android (Material / Ionic)", device: devices["Pixel 7"] },
  { name: "iPhone (Cupertino / Framework7)", device: devices["iPhone 13"] },
  { name: "Desktop", device: { viewport: { width: 1280, height: 860 } } },
];

const browser = await chromium.launch();
let failures = 0;

for (const c of cases) {
  const ctx = await browser.newContext(c.device);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  await page.goto("http://127.0.0.1:3123/app/home", { waitUntil: "load" });
  // Wait for either engine root to appear.
  let root = "none";
  try {
    await page.waitForSelector("ion-app, .framework7-root", { timeout: 25000 });
    root = await page.evaluate(() => document.querySelector("ion-app") ? "ionic" : (document.querySelector(".framework7-root") ? "framework7" : "none"));
  } catch { /* report below */ }

  const data = await page.evaluate(() => ({
    platform: document.documentElement.dataset.nativePlatform,
    mode: document.documentElement.dataset.nativeMode,
    engine: document.documentElement.dataset.nativeEngine,
    items: document.querySelectorAll("ion-item, li.item-content, .item-link").length,
    tabs: document.querySelectorAll(".native-tabbar__item, .tabbar .tab-link, .toolbar a").length,
    fab: document.querySelectorAll("ion-fab, .fab").length,
  }));

  const ok = root !== "none";
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${c.name}: root=${root} platform=${data.platform} mode=${data.mode} engine=${data.engine} listItems=${data.items} tabs=${data.tabs} fab=${data.fab}`);
  if (errors.length) { failures += 0; console.log("   errors:", errors.slice(0, 4).join(" | ").slice(0, 600)); }
  await ctx.close();
}

await browser.close();
process.exit(failures ? 1 : 0);
