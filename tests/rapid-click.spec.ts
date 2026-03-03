import { test, expect } from "@playwright/test";

test("rapid clicking on carousel does not re-trigger preloader", async ({
  page,
}) => {
  // Listen for uncaught errors (a crash would remount the page & reset loading state)
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/");

  // Wait for preloader to fully disappear —
  // FiveLightsOut (z-[200]) and Preloader stairs (z-100) must both be gone.
  // The children div drops the "invisible" class once showPreloader flips false.
  await page.waitForFunction(
    () => !document.querySelector(".invisible"),
    { timeout: 150_000 }, // models are ~450 MB from local dev server
  );

  // Give the intro animation time to finish so carousel is interactive
  await page.waitForTimeout(5000);

  // Click the center of the viewport rapidly (where carousel cards sit)
  const vp = page.viewportSize()!;
  const cx = vp.width / 2;
  const cy = vp.height / 2;

  for (let i = 0; i < 10; i++) {
    await page.mouse.click(cx, cy, { delay: 0 });
    await page.waitForTimeout(30);
  }

  // Let any transitions settle
  await page.waitForTimeout(3000);

  // ── Assertions ────────────────────────────────────────────────────
  // 1. No preloader overlay should be back in the DOM
  const lightsOverlay = await page.locator(".fixed.inset-0").evaluateAll(
    (els) =>
      els.filter((el) => {
        const z = getComputedStyle(el).zIndex;
        return Number(z) >= 100;
      }).length,
  );
  expect(lightsOverlay).toBe(0);

  // 2. Main content must not be invisible
  const hasInvisible = await page.evaluate(() =>
    Boolean(document.querySelector(".invisible")),
  );
  expect(hasInvisible).toBe(false);

  // 3. No uncaught JS errors (ignore WebGL — headless Chrome has no GPU)
  const meaningful = errors.filter((e) => !e.includes("WebGL"));
  expect(meaningful).toEqual([]);
});
