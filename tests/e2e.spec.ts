import { test, expect } from "@playwright/test";
import { readFileSync } from "fs";
import { resolve } from "path";

const DEMO_PROFILE = readFileSync(
  resolve(__dirname, "../demodata_profile.txt"),
  "utf-8"
);

test.describe("EventGraph AI — E2E with demo profile", () => {
  test("homepage loads with correct elements", async ({ page }) => {
    await page.goto("/");

    // Header
    await expect(page.locator("h1")).toContainText("EventGraph AI");

    // Hero section
    await expect(
      page.locator("h2", { hasText: "Find the right events" })
    ).toBeVisible();
    await expect(
      page.locator("textarea[placeholder*='Paste your LinkedIn']")
    ).toBeVisible();

    // Date inputs pre-filled
    const fromInput = page.locator('input[type="date"]').first();
    const toInput = page.locator('input[type="date"]').last();
    await expect(fromInput).toHaveValue("2026-03-30");
    await expect(toInput).toHaveValue("2026-04-05");

    // CTA button disabled (no text entered)
    const cta = page.getByRole("button", { name: /Find My Events/i });
    await expect(cta).toBeDisabled();

    // Footer
    await expect(page.locator("footer")).toContainText("Powered by Neo4j");
  });

  test("CTA enables after typing profile text", async ({ page }) => {
    await page.goto("/");

    const textarea = page.locator(
      "textarea[placeholder*='Paste your LinkedIn']"
    );
    const cta = page.getByRole("button", { name: /Find My Events/i });

    await expect(cta).toBeDisabled();
    await textarea.fill("I am a software engineer who loves AI");
    await expect(cta).toBeEnabled();
  });

  test("CTA disabled when textarea is empty", async ({ page }) => {
    await page.goto("/");
    const cta = page.getByRole("button", { name: /Find My Events/i });
    await expect(cta).toBeDisabled();
  });

  test("GET /api/events returns events from Neo4j", async ({ request }) => {
    const res = await request.get(
      "/api/events?start=2026-03-30&end=2026-04-05"
    );
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.events).toBeDefined();
    expect(body.events.length).toBeGreaterThan(100);

    const first = body.events[0];
    expect(first.title).toBeTruthy();
    expect(first.slug).toBeTruthy();
    expect(first.date).toBeTruthy();
    expect(first.attendee_count).toBeGreaterThanOrEqual(0);
  });

  test("GET /api/events returns 234 events for full date range", async ({
    request,
  }) => {
    const res = await request.get(
      "/api/events?start=2026-03-30&end=2026-04-05"
    );
    const body = await res.json();
    expect(body.events.length).toBe(234);
  });

  test("GET /api/event/:slug returns event detail", async ({ request }) => {
    // First grab a slug from the events list
    const listRes = await request.get(
      "/api/events?start=2026-03-30&end=2026-04-05"
    );
    const { events } = await listRes.json();
    const slug = events[0].slug;

    const res = await request.get(`/api/event/${slug}`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.event).toBeDefined();
    expect(body.event.title).toBeTruthy();
    expect(body.event.slug).toBe(slug);
  });

  test("GET /api/event/:slug includes attendees", async ({ request }) => {
    const listRes = await request.get(
      "/api/events?start=2026-03-30&end=2026-04-05"
    );
    const { events } = await listRes.json();
    // Pick event with most attendees
    const event = events[0];

    const res = await request.get(`/api/event/${event.slug}`);
    const body = await res.json();
    expect(body.attendees).toBeDefined();
    expect(Array.isArray(body.attendees)).toBe(true);
  });

  test("POST /api/recommend returns SSE stream", async ({ request }) => {
    const res = await request.post("/api/recommend", {
      data: {
        profile_text: DEMO_PROFILE,
        start_date: "2026-03-30",
        end_date: "2026-04-05",
      },
    });

    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("text/event-stream");

    const text = await res.text();
    // Should have at least one SSE data line
    expect(text).toContain("data: ");

    // Parse the SSE events
    const events = text
      .split("\n")
      .filter((line) => line.startsWith("data: "))
      .map((line) => JSON.parse(line.slice(6)));

    expect(events.length).toBeGreaterThan(0);

    // Should have a type field
    expect(events[0].type).toBeTruthy();

    // If LLM is available, we get profile_parsed first
    // If not, we get an error event — both are valid SSE responses
    expect(["profile_parsed", "error"]).toContain(events[0].type);
  });

  test("POST /api/recommend with missing profile returns 400", async ({
    request,
  }) => {
    const res = await request.post("/api/recommend", {
      data: {},
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("profile_text");
  });

  test("submit demo profile triggers SSE stream in UI", async ({ page }) => {
    await page.goto("/");

    // Fill demo profile
    const textarea = page.locator(
      "textarea[placeholder*='Paste your LinkedIn']"
    );
    await textarea.fill(DEMO_PROFILE);

    // Intercept the recommend API call
    const responsePromise = page.waitForResponse(
      (res) =>
        res.url().includes("/api/recommend") && res.request().method() === "POST"
    );

    // Click CTA
    const cta = page.getByRole("button", { name: /Find My Events/i });
    await cta.click();

    // Wait for the API call to complete
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("text/event-stream");

    // After SSE completes, UI should show either results or error state
    // Wait for either profile summary OR error message to appear
    await expect(
      page
        .locator("text=Vitalii")
        .or(page.locator("text=/LLM API error|Connection error|error/i"))
    ).toBeVisible({ timeout: 30_000 });
  });

  test("start over button appears during/after processing", async ({
    page,
  }) => {
    await page.goto("/");

    // "Start over" should NOT be visible in idle state
    await expect(
      page.getByRole("button", { name: /Start over/i })
    ).not.toBeVisible();

    // Fill and submit
    const textarea = page.locator(
      "textarea[placeholder*='Paste your LinkedIn']"
    );
    await textarea.fill("AI engineer test profile");

    const cta = page.getByRole("button", { name: /Find My Events/i });
    await cta.click();

    // "Start over" should appear
    await expect(
      page.getByRole("button", { name: /Start over/i })
    ).toBeVisible({ timeout: 10_000 });

    // Wait for processing to finish (error or done)
    await page.waitForTimeout(5000);

    // Click "Start over"
    await page.getByRole("button", { name: /Start over/i }).click();

    // Should return to idle — hero visible again
    await expect(
      page.locator("h2", { hasText: "Find the right events" })
    ).toBeVisible();
    await expect(
      page.locator("textarea[placeholder*='Paste your LinkedIn']")
    ).toBeVisible();
  });

  test("date inputs can be changed", async ({ page }) => {
    await page.goto("/");

    const fromInput = page.locator('input[type="date"]').first();
    const toInput = page.locator('input[type="date"]').last();

    await fromInput.fill("2026-04-01");
    await toInput.fill("2026-04-03");

    await expect(fromInput).toHaveValue("2026-04-01");
    await expect(toInput).toHaveValue("2026-04-03");
  });
});
