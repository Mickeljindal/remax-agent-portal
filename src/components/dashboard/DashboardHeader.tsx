import { useId, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
  LogOut,
  User,
  Shield,
  Bell,
  Moon,
  Sun,
  Menu,
  Percent,
} from "lucide-react";
import { REMAX_HEADER_LOGO_URL } from "@/config/brandLogo";
import NotificationBell from "@/components/dashboard/NotificationBell";

const nav = [
  { label: "Dashboard", href: "#dashboard" },
  { label: "Courses", href: "#courses" },
  { label: "Listings", href: "#listings" },
  { label: "Assets", href: "#assets" },
  { label: "Vendors", href: "#vendors" },
  { label: "Buyer kit", href: "#buyer-kit" },
];

interface DashboardHeaderProps {
  agentName: string;
  fullName: string | null;
  recoNumber: string | null;
  avatarUrl: string | null;
  initials: string;
  isAdmin: boolean;
  onLogout: () => void;
  notificationCount?: number;
  agentId?: string;
  /** When set with onHideCommissionChange, agents can hide co-op % on pre-con cards (e.g. in front of clients). */
  hideCommissionRates?: boolean;
  onHideCommissionChange?: (hide: boolean) => void;
  reminderCount?: number;
  onOpenReminders?: () => void;
}

const DashboardHeader = ({
  agentName,
  fullName,
  recoNumber,
  avatarUrl,
  initials,
  isAdmin,
  onLogout,
  notificationCount = 3,
  agentId,
  hideCommissionRates = false,
  onHideCommissionChange,
  reminderCount = 0,
  onOpenReminders,
}: DashboardHeaderProps) => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const coopHideSwitchId = useId();

  const linkCls =
    "text-sm font-medium text-primary-foreground/90 hover:text-primary-foreground transition-colors whitespace-nowrap";

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <nav className={mobile ? "flex flex-col gap-1" : "hidden lg:flex items-center gap-6"}>
      {nav.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className={mobile ? "py-3 px-2 rounded-lg hover:bg-primary-foreground/10 text-primary-foreground" : linkCls}
          onClick={() => mobile && setOpen(false)}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );

  return (
    <header className="sticky top-0 z-50 bg-[#1a1f36] text-primary-foreground shadow-lg border-b-4 border-[hsl(4_80%_56%)]">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <a href="#top" className="shrink-0 flex items-center gap-2">
              <img
                src={REMAX_HEADER_LOGO_URL}
                alt="RE MAX Excellence Real Estate Brokerage"
                className="h-11 w-auto max-h-[48px] max-w-[min(100%,320px)] sm:h-12 sm:max-h-[52px] md:h-14 md:max-h-[56px] object-contain object-left"
                decoding="async"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </a>
            <div className="hidden sm:block border-l border-primary-foreground/20 pl-3 min-w-0">
              <p className="font-display text-sm font-bold truncate">Agent Portal</p>
              <p className="text-[11px] text-primary-foreground/65 truncate">REMAX Excellence Canada</p>
            </div>
          </div>

          <NavLinks />

          <div className="flex items-center gap-1 sm:gap-2">
            {/* In-app notifications bell (real-time) */}
            {agentId && <NotificationBell agentId={agentId} />}

            <Button
              variant="ghost"
              size="icon"
              className="relative text-primary-foreground hover:bg-primary-foreground/10"
              aria-label="Reminders"
              onClick={() => (onOpenReminders ? onOpenReminders() : undefined)}
            >
              <Bell className="h-5 w-5" />
              {(onOpenReminders ? reminderCount : notificationCount) > 0 && (
                <Badge className="absolute -top-0.5 -right-0.5 h-5 min-w-[1.25rem] px-1 flex items-center justify-center text-[10px] bg-destructive text-destructive-foreground border-0">
                  {(onOpenReminders ? reminderCount : notificationCount) > 9
                    ? "9+"
                    : onOpenReminders
                      ? reminderCount
                      : notificationCount}
                </Badge>
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="relative text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-full border border-primary-foreground/25 bg-primary-foreground/5 py-1 pl-1 pr-2 sm:pr-3 hover:bg-primary-foreground/10 transition-colors max-w-[220px]"
                >
                  <Avatar className="h-8 w-8 border border-primary-foreground/30">
                    <AvatarImage src={avatarUrl || undefined} alt={agentName} />
                    <AvatarFallback className="bg-accent text-accent-foreground text-xs font-bold">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="text-left min-w-0 hidden sm:block">
                    <p className="text-xs font-semibold truncate leading-tight">{fullName || agentName}</p>
                    <p className="text-[10px] text-primary-foreground/65 truncate">RECO# {recoNumber || "—"}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="text-sm font-medium">{fullName || agentName}</p>
                  <p className="text-xs text-muted-foreground">RECO# {recoNumber}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <User className="mr-2 h-4 w-4" /> Profile
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate("/admin")}>
                    <Shield className="mr-2 h-4 w-4" /> Admin
                  </DropdownMenuItem>
                )}
                {onHideCommissionChange && (
                  <DropdownMenuItem
                    className="flex cursor-default items-center justify-between gap-3 rounded-sm px-2 py-2 focus:bg-accent"
                    onSelect={(e) => e.preventDefault()}
                  >
                    <label
                      htmlFor={coopHideSwitchId}
                      className="flex flex-1 cursor-pointer items-center gap-2 text-sm leading-snug"
                    >
                      <Percent className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span>Hide co-op % on listings</span>
                    </label>
                    <Switch
                      id={coopHideSwitchId}
                      checked={hideCommissionRates}
                      onCheckedChange={onHideCommissionChange}
                      aria-label="Hide co-op percentage on listings"
                      className="shrink-0"
                    />
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="text-destructive lg:hidden">
                  <LogOut className="mr-2 h-4 w-4" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => setOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="hidden lg:inline-flex border-0 bg-white text-[#1a1f36] shadow-sm hover:bg-white/90 hover:text-[#1a1f36] [&_svg]:text-[#1a1f36]"
              onClick={onLogout}
            >
              <LogOut className="h-4 w-4 mr-1 shrink-0" /> Log out
            </Button>
          </div>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="bg-[#1a1f36] text-primary-foreground border-border w-[280px]">
          <SheetHeader>
            <SheetTitle className="text-primary-foreground font-display">Navigate</SheetTitle>
          </SheetHeader>
          <NavLinks mobile />
        </SheetContent>
      </Sheet>
    </header>
  );
};

export default DashboardHeader;
