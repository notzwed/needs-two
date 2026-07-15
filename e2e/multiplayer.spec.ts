import { expect, test } from "@playwright/test";

test("two browsers share an authoritative game and the layout stays responsive", async ({ browser }) => {
  const firstContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const secondContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const first = await firstContext.newPage();
  const second = await secondContext.newPage();

  await first.goto("./");
  await expect(first.getByRole("heading", { name: "Needs Two" })).toBeVisible();
  await first.screenshot({ path: "artifacts/home-desktop.png", fullPage: true });
  await first.getByRole("button", { name: "Play" }).click();
  await first.getByRole("button", { name: "Crea una stanza" }).click();
  const code = (await first.locator(".room-code").textContent())!.trim();
  expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);

  await second.goto("./");
  await second.getByRole("button", { name: "Play" }).click();
  await second.getByRole("button", { name: "Entra con un codice" }).click();
  await second.getByLabel("Codice amico").fill(code.toLowerCase());
  await expect(second.getByLabel("Codice amico")).toHaveValue(code);
  await second.getByRole("button", { name: "Entra", exact: true }).click();

  await expect(first.locator(".puzzle-board")).toBeVisible({ timeout: 5_000 });
  await expect(second.locator(".puzzle-board")).toBeVisible({ timeout: 5_000 });
  await expect(first.locator(".turn-pill")).toBeHidden();
  await expect(first.locator(".turn-label")).toHaveText("Il tuo turno");
  await expect(second.locator(".turn-label")).toHaveText("Turno del tuo amico");
  await expect(first.locator(".friend-turn-mask")).toHaveCSS("opacity", "0");
  await expect(second.locator(".friend-turn-mask")).toHaveCSS("opacity", "1");
  await expect(first.locator(".timer")).toHaveText(/^(7\.0|6\.[0-9])$/);
  await expect(first.locator(".game-timer")).toHaveText(/^(7:00|6:59)$/);
  for (const page of [first, second]) {
    const textOverlaps = await page.evaluate(() => {
      const visible = [...document.querySelectorAll<HTMLElement>(".turn-label, .timer, .game-timer, .friend-turn-mask span, .turn-pill")]
        .filter((element) => Number.parseFloat(getComputedStyle(element).opacity) > 0.1)
        .map((element) => element.getBoundingClientRect());
      return visible.some((box, index) => visible.slice(index + 1).some((other) =>
        box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top,
      ));
    });
    expect(textOverlaps).toBe(false);
  }

  await second.getByRole("button", { name: "Sposta tassello" }).first().click();
  await expect(second.getByText("Aspetta il tuo turno")).toBeVisible();
  await expect(first.getByText("0 mosse")).toBeVisible();

  await first.getByRole("button", { name: "Sposta tassello" }).first().click();
  await expect(first.getByText("1 mosse")).toBeVisible();
  await expect(second.getByText("1 mosse")).toBeVisible();
  await expect(first.locator(".turn-label")).toHaveText("Turno del tuo amico", { timeout: 10_000 });
  await expect(second.locator(".turn-label")).toHaveText("Il tuo turno");
  await expect(first.locator(".friend-turn-mask")).toHaveCSS("opacity", "1");
  await first.screenshot({ path: "artifacts/game-desktop.png", fullPage: true });

  await second.setViewportSize({ width: 390, height: 844 });
  const hasHorizontalOverflow = await second.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasHorizontalOverflow).toBe(false);
  await expect(second.locator(".puzzle-board")).toBeInViewport();
  await second.screenshot({ path: "artifacts/game-mobile.png", fullPage: true });

  const firstTiles = await first.locator(".puzzle-tile").evaluateAll((tiles) =>
    tiles.map((tile) => ({ transform: getComputedStyle(tile).transform, background: getComputedStyle(tile).backgroundImage })),
  );
  expect(new Set(firstTiles.map((tile) => tile.transform)).size).toBe(15);
  expect(firstTiles.every((tile) => tile.background.includes("/puzzles/"))).toBe(true);

  await firstContext.close();
  await secondContext.close();
});
