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
  hotels: [
    {
      id: 201,
      hotel_id: 55,
      hotel_name: "Test Hotel Bangkok",
      city: "Bangkok",
      from_date: "2026-08-03",
      to_date: "2026-08-05",
      nights: 2,
      single_room_days: 0,
      double_room_days: 1,
      promotion: "Early Bird 10%",
      discount: 250,
      final_cost: 6000,
      flight_in: "PG 122",
      flight_out: "TK 059",
      flight_info: "Morning arrival",
      early_check_in: true,
      late_check_out: true,
      late_checkout_type: "6PM",
      room_types: [
        {
          room_type_id: 501,
          room_type: "Deluxe Room Incl. ABF",
          adults: 2,
          children: 0,
          extra_adult_bed: false,
          extra_child_bed: false,
          sharing_bed: false,
        },
      ],
      approved: false,
      declined: false,
      email_sent: false,
    },
  ],
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

test("editing a hotel restores all saved booking values", async ({ page }) => {
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
    if (url.pathname === "/api/v1/hotels") {
      await route.fulfill({
        json: [
          {
            id: 55,
            name: "Test Hotel Bangkok",
            room_types: [
              { id: 501, name: "Deluxe Room Incl. ABF" },
            ],
            promotions: [
              { id: 71, name: "Early Bird 10%" },
            ],
          },
        ],
      });
      return;
    }
    await route.fulfill({ json: [] });
  });

  await page.goto("/production/edit_booking.html?id=1", { waitUntil: "domcontentloaded" });
  await page.locator("#btnHotels").click();
  const row = page.locator("#hotelsTableBody tr").first();
  await expect(row).toBeVisible();
  await row.locator(".booking-actions-toggle").click();
  await row.locator(".edit-hotel").click();

  await expect(page.locator("#hotelModal")).toBeVisible();
  await expect(page.locator("#hotelModalLabel")).toHaveText("Edit Hotel Booking");
  await expect(page.locator("#checkInDate")).toHaveValue("2026-08-03");
  await expect(page.locator("#checkOutDate")).toHaveValue("2026-08-05");
  await expect(page.locator("#hotelType")).toHaveValue("55");
  await expect(page.locator("#numberOfNights")).toHaveValue("2");
  await expect(page.locator("#singleRooms")).toHaveValue("0");
  await expect(page.locator("#doubleRooms")).toHaveValue("1");
  await expect(page.locator("#updatedHotelPrice")).toHaveValue("6000");
  await expect(page.locator("#updatedHotelDiscount")).toHaveValue("250");
  await expect(page.locator("#flightIn")).toHaveValue("PG 122");
  await expect(page.locator("#flightOut")).toHaveValue("TK 059");
  await expect(page.locator("#flightInfo")).toHaveValue("Morning arrival");
  await expect(page.locator("#earlyCheckIn")).toBeChecked();
  await expect(page.locator("#lateCheckOut")).toBeChecked();
  await expect(page.locator("#lateCheckOutType")).toHaveValue("18");

  const roomBlock = page.locator("#roomTypesWrapper .room-type-block").first();
  await expect(roomBlock).toBeVisible();
  await expect(roomBlock.locator(".roomtype-dropdown")).toHaveValue("501");
  await expect(roomBlock.locator(".adults")).toHaveValue("2");
  await expect(roomBlock.locator(".children")).toHaveValue("0");
});
