# Quotation and Booking QA Guide

This guide describes the intended workflow for the Quotation and Booking modules. UI button labels stay in English; the explanations below are in Thai for the operations team.

## 1. Status Flow

```
Pending -> InProgress -> Confirmed
   |          ^
   |          | (a confirmed supplier service is declined)
   +-> Cancelled
```

| Status | Meaning | Where it appears | Who changes it |
| --- | --- | --- | --- |
| `Pending` | Quotation has been saved but has not been converted to a booking. | Quotation list only. | Agent or Admin saves a quotation. |
| `InProgress` | Quotation was converted to a booking and supplier confirmations are still being collected. | Quotation list and Booking list. | Agent or Admin uses `Convert to Booking`. |
| `Confirmed` | All required supplier services have been confirmed and the booking was finalized. | Quotation list and Booking list. | Admin only. |
| `Cancelled` | Quotation or booking was voided. | Visible only when the cancelled status filter is selected. | Agent or Admin, subject to ownership rules. |

Important rules:

1. `Save Quotation` never changes a quotation directly into a booking.
2. `Convert to Booking` is available only while the quotation is `Pending`.
3. `BOOKING CONFIRMED` is available only when every saved **Hotel**, **Transfer**, and **Excursion** row is confirmed. At least one of those services must exist.
4. Flights, Tours, Special Packages, and Others do not currently block final booking confirmation. This follows the current supplier-confirmation rule; they should still be checked operationally.
5. Declining an already confirmed Hotel, Transfer, or Excursion changes the booking back to `InProgress`.
6. A normal save cannot overwrite a workflow status sent from the screen.

## 2. Quotation Page - What Each Button Does

### Main buttons

| Button | What it does | Status effect | Role |
| --- | --- | --- | --- |
| `Cancel` | Leaves the editor and returns to the quotation list. Unsaved form changes are discarded. | None. | Agent, Admin |
| `Save Quotation` | Validates required fields, prices, and service data; then creates or updates the quotation. | Keeps `Pending` for a normal quotation. | Agent, Admin |
| `Convert to Booking` | Converts the saved pending quotation into a booking. | `Pending` -> `InProgress`. | Agent, Admin |

### Service tabs

| Tab | Purpose | Main controls |
| --- | --- | --- |
| `Flights` | Flight itinerary data only. | Add, edit, delete a flight. |
| `Transfers` | Supplier transfer services. | Add, edit, delete; Admin later confirms from Booking. |
| `Hotels` | Hotel stays, rooms, extra beds, early check-in and late check-out. | Add, edit, delete; hotel price is recalculated from selected dates, room types and options. |
| `Excursions` | Excursion supplier services. | Add, edit, delete; Admin later confirms from Booking. |
| `Tours` | Package tour and related accommodation plan. | Add, edit, delete; date range is based on the tour duration. |
| `Special Packages` | Package items supplied by a special promotion. | Admin can edit all details; Agent restrictions apply to protected package data. |
| `Others` | Manual additional charges or services. | Add, edit, delete. |

### Common row icons

| Icon / tooltip | Meaning |
| --- | --- |
| Pencil / `Edit` | Opens the saved item for changes. Saving recalculates its price where pricing rules apply. |
| Bin / `Delete` | Removes that service from the current quotation after confirmation. |
| `Get Price` | Requests a new price using the current form values. It does not save the row by itself. |
| `Add ...` | Opens a form for a new service. Save the service form, then save the quotation. |

## 3. Booking Page - What Each Button Does

| Button | What it does | Role |
| --- | --- | --- |
| `Save Booking` | Saves edits to booking data and service rows. New or edited supplier rows remain unconfirmed. | Admin |
| Three-dot `Actions` menu | Keeps row actions compact. Open it to access the row-specific actions below. | Admin |
| Pencil / `Edit` | Changes the selected hotel, transfer, excursion, or other service. Edited supplier services must be confirmed again if required. | Admin |
| Bin / `Delete` | Removes the selected service after confirmation. | Admin |
| Green check / `Mark as Confirmed` | Records that a supplier confirmed that exact Hotel, Transfer, or Excursion service. The row becomes green. No page refresh is required. | Admin |
| Red cross / `Decline` | Records that the supplier service is not confirmed. A confirmed booking returns to `InProgress`. | Admin |
| Envelope / `Email Supplier` | Sends the service request to its supplier. A resend warning appears if it was already sent. | Admin |
| `Bulk Email` | Opens a supplier-email selection window for the current tab. Hotel stays for the same hotel are grouped into one supplier email rather than one email per night. | Admin |
| `BOOKING CONFIRMED` | Finalizes a booking after all Hotel, Transfer and Excursion services are confirmed. | Admin |
| `Summary` / `Summary PDF` | Opens the printable A4 booking summary PDF in a new tab. It does not change booking data. | Admin |
| `Cancel` | Leaves the editor and returns to the booking list; it does not cancel the booking. | Admin |

## 4. List Page Actions

### Quotation List

| Action | Meaning |
| --- | --- |
| Eye / view or pencil / edit | Opens the quotation record. |
| Cancel / void icon | Cancels the pending quotation or voids an existing booking, according to its current status. |
| PDF/save icon | Generates the quotation PDF. |
| Envelope | Sends the quotation to the client. A resend warning is shown when the email was already sent. |
| Bell (Admin) | Opens hotel stay notification tools. |
| Proforma icon | Available to Admin/Superadmin after the booking is `Confirmed`; opens the actual Proforma Invoice PDF. |

### Booking List

| Action | Meaning |
| --- | --- |
| Eye / `View` | Opens the booking in read-only mode. |
| Pencil / `Edit` | Opens the booking operations page. |
| Save PDF | Opens the booking PDF; it does not save, convert, or confirm anything. |
| Envelope / `View Itinerary & Email` | Opens the itinerary and email window. |
| Paper plane / `Bulk Email All Suppliers` | Sends the selected booking requests to suppliers; it warns before resending. |
| Proforma icon | Available only when the booking is `Confirmed`; opens the Proforma PDF. It is not the same as `Save PDF`. |
| Bell / `Notify Agent` | Sends the predefined booking-confirmed notification. It is disabled until the booking is `Confirmed`. |

`Payment` is a separate menu page. It records received amount, payment date and payment reference; it never changes the booking status. `Tax Invoices` is also a separate menu page and is available only after the booking is confirmed and fully paid.

## 5. Permission Summary

| Task | Agent | Admin / Superadmin |
| --- | --- | --- |
| Create and save own quotation | Yes | Yes |
| Convert own pending quotation to booking | Yes | Yes |
| Edit booking operations data | No | Yes |
| Confirm or decline supplier rows | No | Yes |
| Send supplier email | No | Yes |
| Mark booking confirmed | No | Yes |
| Record payment or issue tax invoice | No | Yes |

## 6. Automated Checks Already Run

The following non-destructive checks passed on 20 July 2026:

| Area | Result |
| --- | --- |
| Status calculation and booking deadlines | Passed |
| Pending-to-booking conversion wiring | Passed |
| Booking confirmation/decline controls and no-refresh status update | Passed |
| Role restrictions for workflow endpoints | Passed |
| Hotel email grouping by hotel stay | Passed |
| Proforma/tax invoice pricing and payment eligibility rules | Passed |
| JavaScript syntax and whitespace validation | Passed |

Result: **24 automated checks passed; 0 failed.**

## 7. Required UI Acceptance Test

Automated logic checks cannot replace a real browser test against a safe test account and test booking. Run this sequence using test data, not a real customer booking:

1. Agent creates a quotation with one hotel, one transfer and one excursion; save it and verify `Pending`.
2. Agent edits the quotation, saves it, converts it, and verifies `InProgress` appears at the top of both lists.
3. Admin opens the booking and verifies that all saved rows and calculated prices match the quotation.
4. Admin sends one supplier email, checks the resend warning, and verifies hotel nights for the same hotel are grouped.
5. Admin confirms Hotel, Transfer and Excursion rows one at a time; verify the row turns green and the page stays open.
6. Verify `BOOKING CONFIRMED` becomes enabled only after the three supplier service types are confirmed.
7. Admin finalizes the booking; verify `Confirmed` in both lists and the Notify Agent action.
8. Record a test payment. Verify Proforma availability after confirmation and Tax Invoice availability only after full payment.
9. Reopen every saved form and verify dates, prices, rooms, extra beds, early check-in, late check-out and promotions persist.
10. Repeat the main flow as an Agent and verify restricted Booking actions cannot be used.

## 8. Current Test Limitation

The old Playwright browser suite is not safe to run on the current Railway database without preparation: it hard-codes an old local address and old credentials, and its CRUD tests create/change real records. Before UI acceptance testing, configure a dedicated Admin and Agent test account plus a disposable test quotation/booking. The suite should then be updated to use environment variables instead of embedded addresses and passwords.
