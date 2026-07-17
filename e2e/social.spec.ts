import { expect, test, type Page } from "@playwright/test";

test.use({ locale: "it-IT" });

async function register(page: Page, suffix: string) {
  await page.goto("./");
  await page.locator(".home-account-button").click();
  await page.locator(".auth-switch").click();
  const email = "needs.two.e2e+" + suffix + Date.now() + "@gmail.com";
  const nickname = ("Pair" + suffix + Date.now().toString(36)).slice(0, 16);
  await page.getByLabel("Nickname", { exact: true }).fill(nickname);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("PuzzlePass42");
  await page.getByLabel("Conferma password").fill("PuzzlePass42");
  await page.locator(".avatar-option").nth(Number(suffix) % 10).click();
  await page.locator(".color-swatch").nth(Number(suffix) % 7).click();
  await page.getByRole("button", { name: "Registrati" }).click();
  await expect(page.locator(".profile-menu-trigger")).toBeVisible({ timeout: 15_000 });
  return { nickname, email, password: "PuzzlePass42" };
}

test("guest can use friend and Solo, while random pairing explains the profile requirement", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Trova un giocatore" }).click();
  await expect(page.locator(".guest-restriction")).toContainText("Crea un profilo");
  await page.getByRole("button", { name: "Chiudi" }).click();
  await page.getByRole("button", { name: "Solo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Scegli il tuo puzzle" })).toBeVisible();
  await expect(page.locator(".guest-solo-notice")).toBeVisible();
  await expect(page.locator(".difficulty-picker button")).toHaveCount(4);
  await expect(page.locator(".solo-image-option")).toHaveCount(13);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.locator(".solo-setup-card")).toBeInViewport();
});

test("registration persists, profile customization and all badge states are usable", async ({ page }) => {
  test.setTimeout(60_000);
  const account = await register(page, "3");
  const nickname = account.nickname;
  await expect(page.locator(".profile-menu-trigger")).toContainText(nickname);
  await page.locator(".profile-menu-trigger").click();
  await page.locator(".profile-menu-popover").getByRole("button", { name: "Profilo", exact: true }).click();
  await expect(page.locator(".profile-hero")).toContainText(nickname);
  await expect(page.locator(".stat-card")).toHaveCount(8);
  await page.getByRole("button", { name: "Personalizza" }).click();
  await expect(page.locator(".avatar-grid .avatar-option")).toHaveCount(12);
  await page.locator(".avatar-grid .avatar-option").nth(5).click();
  await page.locator(".profile-editor input[type=file]").setInputFiles("client/public/branding/mascot-blue.png");
  await expect(page.locator(".profile-editor-preview img")).toHaveAttribute("src", /needs-two-avatars/, { timeout: 15_000 });
  await page.locator(".profile-swatches .color-swatch").nth(2).click();
  await page.getByLabel("Font nickname").selectOption("fredoka");
  await page.getByRole("button", { name: "Salva", exact: true }).click();
  await expect(page.getByText("Profilo aggiornato!")).toBeVisible();
  await page.getByRole("button", { name: "Medaglie" }).click();
  await expect(page.locator(".badge-slot")).toHaveCount(12);
  await page.locator(".badge-info-button").first().click();
  await expect(page.locator(".badge-details")).toContainText("Progresso");
  await page.getByRole("button", { name: "Chiudi" }).click();
  await page.reload();
  await expect(page.locator(".profile-menu-trigger")).toContainText(nickname);
  await page.locator(".profile-menu-trigger").click();
  await page.locator(".profile-menu-popover").getByRole("button", { name: "Profilo", exact: true }).click();
  await expect(page.locator(".profile-hero")).toContainText(nickname);
  await page.setViewportSize({ width: 768, height: 1024 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.locator(".profile-page-top .icon-button").click();
  await page.locator(".profile-menu-trigger").click();
  await page.locator(".profile-menu-popover").getByRole("button", { name: "Esci" }).click();
  await expect(page.locator(".home-account-button")).toBeVisible();
  await page.locator(".home-account-button").click();
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  await page.locator(".auth-submit").click();
  await expect(page.locator(".profile-menu-trigger")).toContainText(nickname, { timeout: 15_000 });
});

test("two registered users are matched into one authoritative room and see the cooperative intro", async ({ browser }) => {
  test.setTimeout(90_000);
  const firstContext = await browser.newContext({ locale: "it-IT" });
  const secondContext = await browser.newContext({ locale: "it-IT" });
  const first = await firstContext.newPage();
  const second = await secondContext.newPage();
  const [firstAccount, secondAccount] = await Promise.all([register(first, "5"), register(second, "6")]);
  const firstName = firstAccount.nickname;
  const secondName = secondAccount.nickname;
  await Promise.all([
    first.getByRole("button", { name: "Trova un giocatore" }).click(),
    second.getByRole("button", { name: "Trova un giocatore" }).click(),
  ]);
  await expect(first.locator(".player-intro-screen")).toBeVisible({ timeout: 25_000 });
  await expect(second.locator(".player-intro-screen")).toBeVisible({ timeout: 25_000 });
  await expect(first.locator(".player-intro-screen")).toContainText(firstName);
  await expect(first.locator(".player-intro-screen")).toContainText(secondName);
  await expect(first.locator(".intro-player-card")).toHaveCount(2);
  await expect(first.locator(".puzzle-board")).toBeVisible({ timeout: 15_000 });
  await expect(second.locator(".puzzle-board")).toBeVisible({ timeout: 15_000 });
  const firstCode = (await first.locator(".game-meta span").last().textContent())?.match(/[A-HJ-NP-Z2-9]{6}/)?.[0];
  const secondCode = (await second.locator(".game-meta span").last().textContent())?.match(/[A-HJ-NP-Z2-9]{6}/)?.[0];
  expect(firstCode).toBeTruthy();
  expect(firstCode).toBe(secondCode);
  await expect(first.locator(".turn-label")).not.toHaveText(await second.locator(".turn-label").textContent() ?? "");
  await firstContext.close();
  await secondContext.close();
});

function solveEightPuzzle(start: number[]) {
  const goal = "0,1,2,3,4,5,6,7,-1";
  const heuristic = (board: number[]) => board.reduce((sum, tile, position) => {
    if (tile < 0) return sum;
    return sum + Math.abs(Math.floor(position / 3) - Math.floor(tile / 3)) + Math.abs(position % 3 - tile % 3);
  }, 0);
  const queue: Array<{ board: number[]; path: number[]; cost: number; score: number }> = [
    { board: start, path: [], cost: 0, score: heuristic(start) },
  ];
  const best = new Map<string, number>([[start.join(","), 0]]);
  while (queue.length) {
    queue.sort((a, b) => a.score - b.score);
    const current = queue.shift()!;
    if (current.board.join(",") === goal) return current.path;
    const empty = current.board.indexOf(-1);
    const neighbors = [empty - 3, empty + 3, empty - 1, empty + 1].filter((position) =>
      position >= 0 && position < 9 && Math.abs(Math.floor(position / 3) - Math.floor(empty / 3)) + Math.abs(position % 3 - empty % 3) === 1);
    for (const position of neighbors) {
      const board = [...current.board];
      const tile = board[position];
      board[empty] = tile;
      board[position] = -1;
      const cost = current.cost + 1;
      const key = board.join(",");
      if ((best.get(key) ?? Infinity) <= cost) continue;
      best.set(key, cost);
      queue.push({ board, path: [...current.path, tile], cost, score: cost + heuristic(board) });
    }
  }
  throw new Error("No solution found");
}

test("Solo Easy completes through legal UI moves and awards REP, stats, and First Piece once", async ({ page }) => {
  test.setTimeout(120_000);
  const account = await register(page, "7");
  await page.getByRole("button", { name: "Solo", exact: true }).click();
  await page.locator(".difficulty-picker button").first().click();
  await page.locator(".solo-start-button").click();
  const tiles = page.locator(".solo-puzzle-board .puzzle-tile");
  await expect(tiles).toHaveCount(8);
  const state = await tiles.evaluateAll((elements) => {
    const board = Array(9).fill(-1);
    elements.forEach((element, tileId) => {
      const style = getComputedStyle(element as HTMLElement);
      const column = Math.round(Number.parseFloat(style.getPropertyValue("--left")) / (100 / 3));
      const row = Math.round(Number.parseFloat(style.getPropertyValue("--top")) / (100 / 3));
      board[row * 3 + column] = tileId;
    });
    return board;
  });
  const solution = solveEightPuzzle(state);
  expect(solution.length).toBeGreaterThan(0);
  for (const tileId of solution) {
    await tiles.nth(tileId).click();
    await page.waitForTimeout(520);
  }
  await expect(page.locator(".solo-complete-backdrop")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".rep-gain-summary")).toContainText("REP", { timeout: 15_000 });
  const earned = Number((await page.locator(".rep-gain-summary header strong").textContent())?.match(/\d+/)?.[0]);
  expect(earned).toBeGreaterThan(0);
  await page.locator(".completion-actions .button-secondary").click();
  await expect(page.locator(".reputation-pill")).toContainText("REP");
  await page.locator(".profile-menu-trigger").click();
  await page.locator(".profile-menu-popover").getByRole("button", { name: "Profilo", exact: true }).click();
  await expect(page.locator(".stat-card").nth(1)).toContainText("1");
  await page.getByRole("button", { name: "Medaglie" }).click();
  await expect(page.locator(".badge-slot").first()).toHaveClass(/is-unlocked/);
  await expect(page.locator(".profile-hero")).toContainText(account.nickname);
});
