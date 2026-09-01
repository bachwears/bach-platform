# BACH POS Hardware Setup (§14.2 — decided 2026-09)

## Devices

| Device | Model | Interface | Power | Role |
|---|---|---|---|---|
| Receipt printer | **C200I** (thermal, 80mm) | Ethernet + USB | 24V / 1.25A | Cashier receipts |
| Label printer | **Gprinter GP-2120TUA** (thermal, 2-inch) | USB | 12V / 2A | Barcode tags (MGMT → الليبلات) |
| Cash drawer | RJ11 kick, plugs into the C200I drawer port | — | via printer | Opens on receipt print |
| Barcode scanners | Any keyboard-emulating USB/BT | USB/BT | — | Work everywhere, no setup |

## One-time setup (per till PC)

1. **Install drivers** — both printers ship QR codes on the case that link to the vendor drivers
   (also on the Gprinter/Zhuhai Howbest sites). Install the C200I receipt driver and the
   GP-2120TUA label driver.
2. **C200I (receipts)**
   - Driver preferences → paper width **80mm**; enable **partial cut** after job if offered.
   - Driver preferences → **"Open cash drawer before/with printing"** → enable. This fires the
     RJ11 kick pulse on every receipt — the POS relies on this (v1 has no direct drawer command).
   - Set as the **default printer** on the till PC.
   - The POS receipt view already pins `@page: 80mm` — in the print dialog choose the C200I once
     and tick "remember".
3. **GP-2120TUA (labels)**
   - In the driver, define the loaded label stock (40×30mm is the default in the MGMT screen;
     50×30 and 57×40 presets exist too) with **gap detection** on.
   - Print from **MGMT → الليبلات**: each label renders as its own page at exactly the stock
     size — in the print dialog pick the GP-2120TUA and set margins to none / scale 100%.
4. **Silent printing (optional, recommended for the till)** — run the POS in Chrome kiosk mode:
   `chrome --kiosk --kiosk-printing https://pos.bachwears.com` — receipts then print with no
   dialog to the default printer (the C200I).

## Label stock guidance

The GP-2120TUA head is 2 inches (~57mm printable). Stock the store buys should be
**40×30mm** (default), 50×30mm, or 57×40mm rolls with a 2–3mm gap. The MGMT screen's
stock selector must match the loaded roll.

## Future (not v1)

- **Silent/receipt-server path**: the C200I's Ethernet port accepts raw ESC/POS on TCP 9100.
  A small bridge on the store LAN would enable dialog-free printing and programmatic drawer
  kicks from any device (see `apps/pos/lib/hardware.ts`, `escpos-network` stub).
- Direct TSPL to the label printer for batch label jobs without the print dialog.
