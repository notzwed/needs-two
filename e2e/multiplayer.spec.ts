import { expect, test } from "@playwright/test";

test("uses the browser language for every screen", async ({ browser }) => {
  const italianContext = await browser.newContext({ locale: "it-IT" });
  const englishContext = await browser.newContext({ locale: "en-US" });
  const italian = await italianContext.newPage();
  const english = await englishContext.newPage();

  await italian.goto("./");
  await english.goto("./");

  await expect(italian.locator("html")).toHaveAttribute("lang", "it");
  await expect(english.locator("html")).toHaveAttribute("lang", "en");
  await expect(italian.getByRole("button", { name: "Gioca" })).toBeVisible();
  await expect(english.getByRole("button", { name: "Play" })).toBeVisible();

  await italian.getByRole("button", { name: "Gioca" }).click();
  await english.getByRole("button", { name: "Play" }).click();
  await expect(italian.getByRole("heading", { name: "Giochiamo insieme" })).toBeVisible();
  await expect(english.getByRole("heading", { name: "Let's play together" })).toBeVisible();
  await expect(italian.getByRole("button", { name: "Crea una stanza" })).toBeVisible();
  await expect(english.getByRole("button", { name: "Create a room" })).toBeVisible();

  await italianContext.close();
  await englishContext.close();
});

test("two browsers share an authoritative game and the layout stays responsive", async ({ browser }) => {
  test.setTimeout(60_000);
  const installSyntheticMicrophone = async (context: Awaited<ReturnType<typeof browser.newContext>>) => {
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: {
          getUserMedia: async () => {
            const canvas = document.createElement("canvas");
            canvas.width = 2;
            canvas.height = 2;
            canvas.getContext("2d")!.fillRect(0, 0, 2, 2);
            return canvas.captureStream(1);
          },
        },
      });
    });
  };

  const firstContext = await browser.newContext({ locale: "it-IT", viewport: { width: 1280, height: 900 }, permissions: ["microphone"] });
  const secondContext = await browser.newContext({ locale: "it-IT", viewport: { width: 1280, height: 900 }, permissions: ["microphone"] });
  await Promise.all([installSyntheticMicrophone(firstContext), installSyntheticMicrophone(secondContext)]);
  const first = await firstContext.newPage();
  const second = await secondContext.newPage();

  await first.goto("./");
  await expect(first.getByRole("heading", { name: "Needs Two" })).toBeAttached();
  const homeLogo = first.locator(".home-logo");
  await expect(homeLogo).toBeVisible();
  await expect(homeLogo).toHaveCSS("animation-name", "logo-drop");
  await expect(homeLogo).toHaveJSProperty("complete", true);
  expect(await homeLogo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  const logoCornerAlpha = await homeLogo.evaluate((image: HTMLImageElement) => {
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);
    return context.getImageData(0, 0, 1, 1).data[3];
  });
  expect(logoCornerAlpha).toBe(0);
  await first.getByRole("button", { name: "Passa alla modalità notte" }).click();
  await expect(first.locator("html")).toHaveAttribute("data-theme", "night");
  await expect(first.locator(".home-screen")).toHaveCSS("background-color", "rgb(23, 25, 22)");
  await first.reload();
  await expect(first.locator("html")).toHaveAttribute("data-theme", "night");
  await first.screenshot({ path: "artifacts/home-desktop.png", fullPage: true });
  await first.getByRole("button", { name: "Gioca" }).click();
  await first.getByRole("button", { name: "Crea una stanza" }).click();
  const code = (await first.locator(".room-code").textContent())!.trim();
  expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);

  await second.goto("./");
  await second.getByRole("button", { name: "Gioca" }).click();
  await second.getByRole("button", { name: "Entra con un codice" }).click();
  await second.getByLabel("Codice amico").fill(code.toLowerCase());
  await expect(second.getByLabel("Codice amico")).toHaveValue(code);
  await second.getByRole("button", { name: "Entra", exact: true }).click();

  await expect(first.locator(".puzzle-board")).toBeVisible({ timeout: 10_000 });
  await expect(second.locator(".puzzle-board")).toBeVisible({ timeout: 10_000 });
  const referenceButton = first.getByRole("button", { name: "Ingrandisci l'immagine di riferimento" });
  await expect(referenceButton).toBeVisible();
  await expect(first.locator(".reference-thumbnail img")).toHaveJSProperty("complete", true);
  expect(await first.locator(".reference-thumbnail img").evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  const thumbnailBox = await referenceButton.boundingBox();
  await referenceButton.click();
  const referenceDialog = first.getByRole("dialog", { name: "Immagine di riferimento ingrandita" });
  await expect(referenceDialog).toBeVisible();
  await expect(referenceDialog.locator("img")).toBeVisible();
  const zoomedBox = await referenceDialog.locator("img").boundingBox();
  expect(zoomedBox!.width).toBeGreaterThan(thumbnailBox!.width * 2);
  await first.keyboard.press("Escape");
  await expect(referenceDialog).toBeHidden();
  const homeButton = first.getByRole("button", { name: "Torna alla home" });
  const audioButton = first.getByRole("button", { name: "Disattiva audio" });
  await expect(homeButton.locator("svg")).toBeVisible();
  await expect(audioButton.locator("svg")).toBeVisible();
  await audioButton.click();
  await expect(first.getByRole("button", { name: "Attiva audio" })).toBeVisible();
  await first.getByRole("button", { name: "Attiva audio" }).click();
  await expect(first.getByRole("button", { name: "Disattiva audio" })).toBeVisible();
  await expect(first.locator(".turn-pill")).toBeHidden();
  await expect(first.locator(".turn-label")).toHaveText("Il tuo turno");
  await expect(second.locator(".turn-label")).toHaveText("Turno del tuo amico");
  await expect(first.locator(".friend-turn-mask")).toHaveCSS("opacity", "0");
  await expect(second.locator(".friend-turn-mask")).toHaveCSS("opacity", "1");
  await expect(first.locator(".timer")).toHaveText(/^(7\.0|6\.[0-9])$/);
  await expect(first.locator(".game-timer")).toHaveText(/^(7:00|6:[0-5][0-9])$/);
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
  await expect(first.getByText("1 mossa")).toBeVisible();
  await expect(second.getByText("1 mossa")).toBeVisible();
  await expect(first.locator(".turn-label")).toHaveText("Turno del tuo amico", { timeout: 15_000 });
  await expect(second.locator(".turn-label")).toHaveText("Il tuo turno");
  await expect(first.locator(".friend-turn-mask")).toHaveCSS("opacity", "1");
  await first.screenshot({ path: "artifacts/game-desktop.png", fullPage: true });

  await first.getByRole("button", { name: "Apri chat" }).click();
  await first.getByPlaceholder("Scrivi un messaggio").fill("Parto dall'angolo in alto");
  await first.getByRole("button", { name: "Invia messaggio" }).click();
  await expect(first.getByText("Parto dall'angolo in alto")).toBeVisible();

  await second.getByRole("button", { name: "Apri chat" }).click();
  await expect(second.getByText("Parto dall'angolo in alto")).toBeVisible({ timeout: 5_000 });
  await first.getByTestId("game-chat").getByRole("button", { name: "Chiudi chat" }).click();
  await second.getByPlaceholder("Scrivi un messaggio").fill("Va bene, continuo io");
  await second.getByRole("button", { name: "Invia messaggio" }).click();
  await expect(first.locator(".chat-badge")).toHaveText("1");
  await first.getByRole("button", { name: "Apri chat" }).click();
  await expect(first.getByText("Va bene, continuo io")).toBeVisible();
  await expect(first.locator(".chat-badge")).toBeHidden();

  await Promise.all([
    first.getByRole("button", { name: "Attiva voce" }).click(),
    second.getByRole("button", { name: "Attiva voce" }).click(),
  ]);
  await expect(first.getByText("Voce connessa")).toBeVisible({ timeout: 15_000 });
  await expect(second.getByText("Voce connessa")).toBeVisible({ timeout: 15_000 });
  await first.getByRole("button", { name: "Disattiva microfono" }).click();
  await expect(first.getByRole("button", { name: "Riattiva microfono" })).toBeVisible();
  await first.getByRole("button", { name: "Lascia voce" }).click();
  await expect(second.getByText("In attesa del tuo amico")).toBeVisible({ timeout: 5_000 });
  await first.getByTestId("game-chat").getByRole("button", { name: "Chiudi chat" }).click();
  await second.getByTestId("game-chat").getByRole("button", { name: "Chiudi chat" }).click();
  await second.setViewportSize({ width: 390, height: 844 });
  const hasHorizontalOverflow = await second.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasHorizontalOverflow).toBe(false);
  await expect(second.locator(".puzzle-board")).toBeInViewport();
  await second.getByRole("button", { name: "Apri chat" }).click();
  await expect(second.getByTestId("game-chat")).toBeInViewport();
  const chatFitsMobile = await second.getByTestId("game-chat").evaluate((panel) => {
    const box = panel.getBoundingClientRect();
    return box.left >= 0 && box.right <= window.innerWidth && box.bottom <= window.innerHeight;
  });
  expect(chatFitsMobile).toBe(true);
  await second.getByTestId("game-chat").getByRole("button", { name: "Chiudi chat" }).click();
  const topbarOverlaps = await second.evaluate(() => {
    const elements = [...document.querySelectorAll<HTMLElement>(".game-topbar > .icon-button, .mini-brand, .game-topbar-actions")]
      .filter((element) => getComputedStyle(element).display !== "none")
      .map((element) => element.getBoundingClientRect());
    return elements.some((box, index) => elements.slice(index + 1).some((other) =>
      box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top,
    ));
  });
  expect(topbarOverlaps).toBe(false);
  await second.screenshot({ path: "artifacts/game-mobile.png", fullPage: true });

  const requestedBackgroundMusic = await first.evaluate(() =>
    performance.getEntriesByType("resource").some((entry) => entry.name.includes("lofi-background.mp3")),
  );
  expect(requestedBackgroundMusic).toBe(false);
  const boardLayout = await first.locator(".puzzle-board").getAttribute("data-layout");
  expect(["square4", "square8", "rectangle"]).toContain(boardLayout);
  const expectedCells = { square4: 16, square8: 64, rectangle: 20 }[boardLayout!]!;
  await expect(first.locator(".puzzle-tile")).toHaveCount(expectedCells - 1);
  const firstTiles = await first.locator(".puzzle-tile").evaluateAll((tiles) =>
    tiles.map((tile) => ({
      position: `${getComputedStyle(tile).left}:${getComputedStyle(tile).top}`,
      background: getComputedStyle(tile).backgroundImage,
    })),
  );
  expect(new Set(firstTiles.map((tile) => tile.position)).size).toBe(expectedCells - 1);
  expect(firstTiles.every((tile) => tile.background.includes("/puzzles/"))).toBe(true);

  await firstContext.close();
  await secondContext.close();
});
