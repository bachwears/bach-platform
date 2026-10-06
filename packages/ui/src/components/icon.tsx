import type { SVGProps } from "react";
import {
  ArrowLeftRight,
  Banknote,
  Barcode,
  BadgeCheck,
  Boxes,
  CalendarCheck,
  Cake,
  ChartLine,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleDot,
  CircleHelp,
  CircleX,
  ClipboardCheck,
  Coins,
  CreditCard,
  Download,
  ExternalLink,
  FilePen,
  FileSpreadsheet,
  Gift,
  Image,
  ImageUp,
  Layers,
  Link2,
  ListChecks,
  LogOut,
  Megaphone,
  MessageCircle,
  MessageSquareWarning,
  Moon,
  Package,
  PackageCheck,
  PackageOpen,
  PackagePlus,
  PanelsTopLeft,
  Pause,
  PenLine,
  Phone,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Repeat,
  RotateCcw,
  Ruler,
  ScanBarcode,
  Search,
  Shirt,
  SlidersHorizontal,
  Smartphone,
  Store,
  Sun,
  Tags,
  Trash2,
  TriangleAlert,
  Truck,
  Undo2,
  Upload,
  User,
  UserCog,
  Users,
  Wallet,
  WifiOff,
  X,
  type LucideIcon,
} from "lucide-react";

/*
 * BACH icon set — one meaning, one icon, everywhere (storefront, POS, MGMT).
 * Thin line in the storefront's weight (1.25), square-ended, current colour.
 * Two glyphs are BACH's own, drawn for the storefront: the two-line menu and
 * the arch "home". Use <Icon name="orders" /> rather than importing icons, so
 * a concept never ends up with two different pictures.
 */

type Glyph = (p: SVGProps<SVGSVGElement>) => React.ReactElement;

const Menu: Glyph = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
    <path d="M2 9h20M2 15h20" />
  </svg>
);
const Home: Glyph = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
    <path d="M4.5 20V10.5a7.5 6 0 0 1 15 0V20" />
  </svg>
);
/** The BACH bag: the arch handle over a square body (selling, the bag, orders). */
const Bag: Glyph = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
    <path d="M4.5 8.5h15v12h-15z" />
    <path d="M8.5 8.5V7a3.5 3.5 0 0 1 7 0v1.5" />
  </svg>
);

const SET = {
  // ── screens (menus, tabs, page headers) ─────────────────────────────────
  home: { icon: Home, ar: "الرئيسية" },
  sell: { icon: Bag, ar: "بيع" },
  orders: { icon: Receipt, ar: "الطلبات" },
  online: { icon: Package, ar: "طلبات الأونلاين" },
  courier: { icon: Truck, ar: "مصاري الشحن" },
  returns: { icon: RotateCcw, ar: "مرتجع وتبديل" },
  complaints: { icon: MessageSquareWarning, ar: "الشكاوى" },
  customers: { icon: Users, ar: "الزبائن" },
  wallet: { icon: Wallet, ar: "المحفظة" },
  products: { icon: Shirt, ar: "المنتجات" },
  newProduct: { icon: Plus, ar: "منتج جديد" },
  categories: { icon: Tags, ar: "الفئات" },
  categoryImages: { icon: Image, ar: "صور الفئات" },
  collections: { icon: Layers, ar: "الكولكشنات" },
  sizes: { icon: Ruler, ar: "المقاسات" },
  photosUpload: { icon: ImageUp, ar: "رفع الصور" },
  photosMatch: { icon: Link2, ar: "مطابقة الصور" },
  dataHealth: { icon: ListChecks, ar: "صحة البيانات" },
  inventory: { icon: Boxes, ar: "المخزون" },
  purchasing: { icon: PackagePlus, ar: "المشتريات" },
  transfers: { icon: ArrowLeftRight, ar: "التحويل بين الفروع" },
  labels: { icon: Barcode, ar: "الليبلات" },
  stocktake: { icon: ClipboardCheck, ar: "الجرد" },
  invoices: { icon: Receipt, ar: "الفواتير" },
  endOfDay: { icon: CalendarCheck, ar: "آخر النهار" },
  campaigns: { icon: Megaphone, ar: "الحملات والعروض" },
  siteContent: { icon: PanelsTopLeft, ar: "محتوى الموقع" },
  analytics: { icon: ChartLine, ar: "تحليلات الموقع" },
  reports: { icon: FileSpreadsheet, ar: "التقارير" },
  rate: { icon: Coins, ar: "سعر الصرف" },
  payments: { icon: CreditCard, ar: "الدفع" },
  staff: { icon: UserCog, ar: "الموظفين" },
  helpEditor: { icon: FilePen, ar: "تعديل المساعدة" },
  help: { icon: CircleHelp, ar: "المساعدة" },
  branch: { icon: Store, ar: "الفرع" },

  // ── order statuses ──────────────────────────────────────────────────────
  statusPending: { icon: CircleDot, ar: "جديد" },
  statusConfirmed: { icon: CircleCheck, ar: "مؤكّد" },
  statusPicking: { icon: PackageOpen, ar: "قيد التجهيز" },
  statusPacked: { icon: PackageCheck, ar: "جاهز" },
  statusShipped: { icon: Truck, ar: "بالشحن" },
  statusReadyPickup: { icon: Store, ar: "جاهز للاستلام" },
  statusDelivered: { icon: CheckCheck, ar: "وصل / انستلم" },
  statusCompleted: { icon: BadgeCheck, ar: "مكتمل" },
  statusCancelled: { icon: CircleX, ar: "ملغى" },
  statusReturned: { icon: Undo2, ar: "مرتجع" },
  statusExchanged: { icon: Repeat, ar: "مبدّل" },

  // ── actions ─────────────────────────────────────────────────────────────
  add: { icon: Plus, ar: "زيد" },
  edit: { icon: PenLine, ar: "عدّل" },
  remove: { icon: Trash2, ar: "امحي" },
  save: { icon: Check, ar: "احفظ" },
  print: { icon: Printer, ar: "اطبع" },
  scan: { icon: ScanBarcode, ar: "امسح باركود" },
  search: { icon: Search, ar: "دوّر" },
  filter: { icon: SlidersHorizontal, ar: "فلتر" },
  download: { icon: Download, ar: "نزّل" },
  upload: { icon: Upload, ar: "ارفع" },
  refresh: { icon: RefreshCw, ar: "حدّث" },
  open: { icon: ExternalLink, ar: "افتح بالموقع" },
  park: { icon: Pause, ar: "ركّن البيعة" },
  close: { icon: X, ar: "سكّر" },
  menu: { icon: Menu, ar: "القائمة" },
  back: { icon: ChevronRight, ar: "رجوع" },
  next: { icon: ChevronLeft, ar: "التالي" },
  logout: { icon: LogOut, ar: "خروج" },
  themeLight: { icon: Sun, ar: "فاتح" },
  themeDark: { icon: Moon, ar: "غامق" },

  // ── money, people and signals ───────────────────────────────────────────
  cash: { icon: Banknote, ar: "كاش" },
  whish: { icon: Smartphone, ar: "Whish" },
  card: { icon: CreditCard, ar: "بطاقة" },
  points: { icon: Gift, ar: "النقاط" },
  birthday: { icon: Cake, ar: "عيد الميلاد" },
  user: { icon: User, ar: "الحساب" },
  phone: { icon: Phone, ar: "تلفون" },
  whatsapp: { icon: MessageCircle, ar: "واتساب" },
  lowStock: { icon: TriangleAlert, ar: "قرّب يخلص" },
  offline: { icon: WifiOff, ar: "بلا إنترنت" },
} satisfies Record<string, { icon: LucideIcon | Glyph; ar: string }>;

export type IconName = keyof typeof SET;

/** Every icon with its Arabic meaning, for the catalogue page. */
export const ICONS: Array<{ name: IconName; ar: string }> = (Object.keys(SET) as IconName[]).map((name) => ({ name, ar: SET[name].ar }));

export function Icon({
  name,
  size = 20,
  strokeWidth = 1.25,
  className,
  label,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
  /** spoken name; without it the icon is decorative (the text next to it says it) */
  label?: string;
}) {
  const C = SET[name].icon as Glyph;
  return (
    <C
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      strokeLinecap="square"
      strokeLinejoin="miter"
      className={className}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    />
  );
}
