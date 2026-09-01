"use client";

/**
 * Device adapter layer (§7 / §14.2). Store hardware, decided 2026-09:
 *
 *  - Receipt: C200I thermal receipt printer — 80mm roll, Ethernet + USB, 24V.
 *  - Labels:  Gprinter GP-2120TUA — 2-inch thermal label printer, USB, 12V (TSPL family).
 *  - Cash drawer: RJ11 into the C200I's drawer port; the vendor driver's
 *    "open drawer on print" setting fires the kick pulse with every receipt.
 *  - Scanners: keyboard-emulating USB/BT — no adapter needed by design.
 *
 * v1 strategy: everything prints through the OS driver via the browser
 * (window.print + per-surface @page CSS). The receipt view pins 80mm, the
 * MGMT label screen pins the label stock size. This needs zero extra
 * software beyond the vendor drivers and works from any device that can
 * reach the app. Raw command paths (ESC/POS over TCP:9100 on the C200I's
 * Ethernet port, TSPL over USB) need a local bridge on the store LAN —
 * that is what the `escpos-network` stub below is reserved for.
 */

export interface ReceiptPrinterAdapter {
  kind: "browser-print" | "escpos-network";
  /** Print the currently rendered receipt view. */
  printReceipt(): void;
  /** Whether the drawer kick is handled by this adapter or the driver. */
  drawerHandledByDriver: boolean;
}

export const browserPrintAdapter: ReceiptPrinterAdapter = {
  kind: "browser-print",
  printReceipt: () => window.print(),
  // Configure "cash drawer opens with print" in the C200I driver preferences.
  drawerHandledByDriver: true,
};

/**
 * Reserved: direct ESC/POS to the C200I over its Ethernet port (TCP 9100)
 * via a local bridge, enabling silent printing and programmatic drawer
 * kicks without the print dialog. Not wired in v1.
 */
export function escposNetworkAdapter(): ReceiptPrinterAdapter {
  throw new Error("escpos-network adapter needs the in-store bridge — not available yet");
}

export const receiptPrinter: ReceiptPrinterAdapter = browserPrintAdapter;
