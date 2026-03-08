import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
  SidebarSeparator,
  SidebarGroup,
  SidebarGroupLabel,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  BookOpen,
  Network,
  Chrome,
  Key,
  FileText,
  ScrollText,
  Sun,
  Moon,
  LogOut,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Library", href: "/", icon: BookOpen },
  { label: "Knowledge Graph", href: "/knowledge-graph", icon: Network },
  { label: "Extension", href: "/extension", icon: Chrome },
  { label: "API Keys", href: "/api-keys", icon: Key },
];

const secondaryItems = [
  { label: "API Docs", href: "/developers", icon: FileText },
  { label: "Changelog", href: "/changelog", icon: ScrollText },
];

function SidebarNav() {
  const [location, navigate] = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();

  const handleNav = (href: string) => {
    navigate(href);
    if (isMobile) setOpenMobile(false);
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Navigation</SidebarGroupLabel>
      <SidebarMenu>
        {navItems.map((item) => (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              isActive={location === item.href}
              tooltip={item.label}
              onClick={() => handleNav(item.href)}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}

function SidebarSecondaryNav() {
  const [location, navigate] = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();

  const handleNav = (href: string) => {
    navigate(href);
    if (isMobile) setOpenMobile(false);
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Resources</SidebarGroupLabel>
      <SidebarMenu>
        {secondaryItems.map((item) => (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              isActive={location === item.href}
              tooltip={item.label}
              onClick={() => handleNav(item.href)}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}

function SidebarUserFooter() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={toggleTheme}
            tooltip={theme === "light" ? "Dark mode" : "Light mode"}
            data-testid="button-theme-toggle"
          >
            {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            <span>{theme === "light" ? "Dark Mode" : "Light Mode"}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        {user && (
          <>
            <SidebarMenuItem>
              <SidebarMenuButton className="cursor-default hover:bg-transparent active:bg-transparent" tooltip={user.firstName || "User"} data-testid="button-user-menu">
                <Avatar className="h-4 w-4 rounded shrink-0">
                  <AvatarImage src={user.profileImageUrl} />
                  <AvatarFallback className="rounded text-[10px]">{user.firstName?.[0]}</AvatarFallback>
                </Avatar>
                <span className="truncate">{user.firstName || "User"}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => logout()}
                tooltip="Sign out"
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </>
        )}
      </SidebarMenu>
    </SidebarFooter>
  );
}

function AppLayoutInner({ children, headerContent }: { children: React.ReactNode; headerContent?: React.ReactNode }) {
  const [, navigate] = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();

  const handleLogoClick = () => {
    navigate("/");
    if (isMobile) setOpenMobile(false);
  };

  return (
    <>
      <Sidebar collapsible="icon" data-testid="app-sidebar">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="superBrain" onClick={handleLogoClick}>
                <img src="/logo.png" alt="superBrain" className="size-4 rounded-full shrink-0 object-contain" />
                <span className="truncate font-bold">superBrain</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarNav />
          <SidebarSeparator />
          <SidebarSecondaryNav />
        </SidebarContent>
        <SidebarUserFooter />
      </Sidebar>
      <SidebarInset>
        <header className="h-12 border-b border-border/60 bg-background/80 backdrop-blur-md px-4 flex items-center gap-4 shrink-0 sticky top-0 z-30">
          <SidebarTrigger className="-ml-1" data-testid="button-sidebar-trigger" />
          {headerContent && (
            <>
              <div className="h-4 w-px bg-border" />
              {headerContent}
            </>
          )}
        </header>
        <div className="flex-1 overflow-y-auto min-h-0 relative">
          {children}
        </div>
      </SidebarInset>
    </>
  );
}

export default function AppLayout({ children, headerContent }: { children: React.ReactNode; headerContent?: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppLayoutInner headerContent={headerContent}>
        {children}
      </AppLayoutInner>
    </SidebarProvider>
  );
}
