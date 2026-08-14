const { test, expect } = require("@playwright/test");

const booking = {
  id: 1,
  agent_name: "Test Agent",
  total_cost: 12500,
  final_cost: 12500,
  discount: 0,
  client_name: "Test Client",
  client_phone: "0800000000",
  client_email: "client@example.com",
  number_of_adults: 2,
  number_of_kids: 0,
  client_booking: "TEST-001",
  booking_date: "2026-08-01",
  start_date: "2026-08-03",
  remarks: "",
  status: "InProgress",
  assistance_fee_amount: 0,
  transfers: [
    {
      id: 101,
      transfer_id: 11,
      date: "2026-08-03",
      city: "Bangkok",
      transfer_description: "Airport transfer",
      type_of_transfer: "TRF In",
      tot: "SIC",
      from_location: "Airport",
      to_location: "Hotel",
      remarks: "",
      final_cost: 2500,
      approved: false,
      declined: false,
      email_sent: false,
    },
  ],
  hotels: [],
  excursions: [],
  tours: [],
  flights: [],
  others: [],
};

test("booking action menu is aligned, colored, and usable", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("token", "test-token");
    localStorage.setItem("role", "superadmin");
    localStorage.setItem("username", "superadmin");
  });

  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/v1/bookings/1") {
      await route.fulfill({ json: booking });
      return;
    }
    await route.fulfill({ json: [] });
  });

  await page.goto("/production/edit_booking.html?id=1", { waitUntil: "domcontentloaded" });
  await page.locator("#btnTransfers").click();
  const row = page.locator("#transferTableBody tr").first();
  await expect(row).toBeVisible();

  const toggle = row.locator(".booking-actions-toggle");
  await expect(toggle).toBeVisible();
  await toggle.click();

  const menu = row.locator(".booking-actions-menu");
  await expect(menu).toBeVisible();
  await expect(menu.locator(".tooltip-text")).toHaveText([
    "Edit",
    "Delete",
    "Mark as Confirmed",
    "Decline",
    "Email Supplier",
  ]);
  for (const label of [
    "Edit",
    "Delete",
    "Mark as Confirmed",
    "Decline",
    "Email Supplier",
  ]) {
    await expect(menu.getByText(label, { exact: true })).toBeVisible();
  }

  for (const action of ["edit", "delete", "confirm", "decline", "email"]) {
    const item = menu.locator(`.booking-action-${action}`);
    await expect(item).toHaveCount(1);
    const buttonColor = await item.locator("button").evaluate(
      (button) => getComputedStyle(button).backgroundColor
    );
    expect(buttonColor).not.toBe("rgba(0, 0, 0, 0)");
  }

  const itemBoxes = await menu.locator(".tooltip-btn").evaluateAll((items) =>
    items.map((item) => item.getBoundingClientRect().height)
  );
  expect(new Set(itemBoxes.map(Math.round)).size).toBe(1);

  const menuBox = await menu.boundingBox();
  const actionCellBox = await row.locator("td").last().boundingBox();
  const toggleBox = await toggle.boundingBox();
  expect(menuBox).not.toBeNull();
  expect(actionCellBox).not.toBeNull();
  expect(toggleBox).not.toBeNull();
  expect(menuBox.x).toBeGreaterThanOrEqual(8);
  expect(menuBox.y).toBeGreaterThanOrEqual(8);
  expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(1272);
  expect(menuBox.y + menuBox.height).toBeLessThanOrEqual(712);
  expect(
    Math.abs(actionCellBox.x + actionCellBox.width / 2 - (toggleBox.x + toggleBox.width / 2))
  ).toBeLessThan(3);

  await page.screenshot({
    path: "test-results/screenshots/booking-actions-menu.png",
    fullPage: false,
  });
});
