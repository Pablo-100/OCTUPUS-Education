import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/_core/hooks/useTranslation";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Menu, X, Moon, Sun, Linkedin, Mail, MessageCircle, Github } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import type { Language } from "@/lib/i18n";
import FloatingAgentChat from "@/components/FloatingAgentChat";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [, navigate] = useLocation();

  const navItems = [
    { label: t("nav.home"), href: "/" },
    { label: t("nav.chapters"), href: "/chapters" },
    { label: t("nav.commands"), href: "/commands" },
    { label: t("nav.terminal"), href: "/terminal" },
    { label: t("nav.labs"), href: "/labs" },
    { label: t("nav.exams"), href: "/exams" },
    { label: t("nav.troubleshooting"), href: "/troubleshooting" },
  ];

  const protectedPaths = new Set([
    "/chapters",
    "/commands",
    "/terminal",
    "/labs",
    "/exams",
    "/troubleshooting",
    "/profile",
  ]);

  const handleNavClick = (href: string) => {
    if (!user && protectedPaths.has(href)) {
      navigate("/login");
      setMobileMenuOpen(false);
      return;
    }
    navigate(href);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/80 bg-background/90 sticky top-0 z-50 shadow-[0_8px_24px_rgba(60,30,85,0.18)] backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => navigate("/")}
            >
              <img
                src="/logo.jpg"
                alt="OCTUPUS Education"
                className="w-10 h-10 rounded-lg object-cover border border-border"
              />
              <div className="hidden sm:block">
                <h1 className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-[#00BFFF] via-[#7B24A6] to-[#BF9B30] tracking-tight">
                  {t("app.title")}
                </h1>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  OCTUPUS Education
                </p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map(item => (
                <button
                  key={item.href}
                  onClick={() => handleNavClick(item.href)}
                  className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                >
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {/* Language Switcher */}
              <div className="hidden sm:flex items-center gap-1 border border-border rounded-lg p-1 bg-card/80">
                {(["en", "fr"] as Language[]).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                      language === lang
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="rounded-lg"
              >
                {theme === "dark" ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </Button>

              {/* Mobile Menu Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden rounded-lg"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </Button>

              {/* User Menu */}
              {user && (
                <div className="hidden sm:flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/profile")}
                    className="text-sm"
                  >
                    {user.name || "Profile"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={logout}
                    className="text-sm"
                  >
                    {t("nav.logout")}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <nav className="lg:hidden mt-4 pt-4 border-t border-border flex flex-col gap-2">
              {navItems.map(item => (
                <button
                  key={item.href}
                  onClick={() => handleNavClick(item.href)}
                  className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors text-left"
                >
                  {item.label}
                </button>
              ))}
              {user && (
                <>
                  <button
                    onClick={() => {
                      navigate("/profile");
                      setMobileMenuOpen(false);
                    }}
                    className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors text-left"
                  >
                    {t("nav.profile")}
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors text-left"
                  >
                    {t("nav.logout")}
                  </button>
                </>
              )}
            </nav>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border bg-gradient-to-r from-[#3C1E55] via-[#4B0082] to-[#3C1E55] mt-16 text-[#FDF4E3]">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div>
              <h3 className="font-bold text-[#FDF4E3] mb-4">
                {t("app.title")}
              </h3>
              <p className="text-sm text-[#e7d8f6]">
                {t("app.subtitle")}
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold text-[#FDF4E3] mb-4">
                Quick Links
              </h4>
              <ul className="space-y-2 text-sm">
                {navItems.slice(0, 4).map(item => (
                  <li key={item.href}>
                    <button
                      onClick={() => navigate(item.href)}
                      className="text-[#e7d8f6] hover:text-[#00BFFF] transition-colors"
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="font-semibold text-[#FDF4E3] mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="#"
                    className="text-[#e7d8f6] hover:text-[#00BFFF] transition-colors"
                  >
                    {t("footer.privacy")}
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-[#e7d8f6] hover:text-[#00BFFF] transition-colors"
                  >
                    {t("footer.terms")}
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-[#e7d8f6] hover:text-[#00BFFF] transition-colors"
                  >
                    {t("footer.contact")}
                  </a>
                </li>
              </ul>
            </div>

            {/* Social */}
            <div>
              <h4 className="font-semibold text-[#FDF4E3] mb-4">Connect</h4>
              <ul className="flex items-center gap-3 text-[#e7d8f6]">
                <li>
                  <a
                    href="https://www.linkedin.com/in/mustapha-amin-tbini/"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="LinkedIn"
                    title="LinkedIn"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#7B24A6]/60 hover:text-[#00BFFF] hover:border-[#00BFFF] transition-colors"
                  >
                    <Linkedin className="h-4 w-4" />
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:mustaphaamintbini@gmail.com"
                    aria-label="Email"
                    title="Email"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#7B24A6]/60 hover:text-[#00BFFF] hover:border-[#00BFFF] transition-colors"
                  >
                    <Mail className="h-4 w-4" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://wa.me/21646345226"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="WhatsApp"
                    title="WhatsApp"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#7B24A6]/60 hover:text-[#00BFFF] hover:border-[#00BFFF] transition-colors"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/Pablo-100"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="GitHub"
                    title="GitHub"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#7B24A6]/60 hover:text-[#00BFFF] hover:border-[#00BFFF] transition-colors"
                  >
                    <Github className="h-4 w-4" />
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className="border-t border-[#7B24A6]/60 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-[#d9c4ef] text-center md:text-left">
              {t("footer.copyright")}
            </p>
            <div className="text-center">
              <p className="text-sm font-semibold text-[#FDF4E3]">
                {t("footer.developer")}
              </p>
            </div>
          </div>
        </div>
      </footer>

      <FloatingAgentChat />
    </div>
  );
}
