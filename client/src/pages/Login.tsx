import { useTranslation } from "@/_core/hooks/useTranslation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import {
  Github,
  Mail,
  ShieldAlert,
  Terminal as TerminalIcon,
} from "lucide-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Login() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleLocalAuth = async (action: "login" | "register") => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/oauth/local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, action }),
      });
      if (response.ok) {
        window.location.href = "/chapters";
      } else {
        alert("Authentication failed. Please check your credentials.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred during authentication.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] w-full flex bg-background rounded-2xl overflow-hidden border shadow-sm">
      {/* Left Pane - Branding & Visuals */}
      <div className="hidden lg:flex w-1/2 bg-slate-950 flex-col justify-between p-12 relative overflow-hidden">
        {/* Abstract Background pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-cyan-600 via-transparent to-transparent"></div>
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-violet-600 via-transparent to-transparent"></div>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <img
            src="/logo.jpg"
            alt="OCTUPUS Education"
            className="w-12 h-12 rounded-xl object-cover border border-white/10 shadow-lg"
          />
          <span className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-violet-500 tracking-tight">
            OCTUPUS Education
          </span>
        </div>

        <div className="relative z-10 max-w-lg space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            Master Linux Administration
          </h1>
          <p className="text-lg text-slate-300 font-medium">
            Join thousands of professionals securing their future with our
            complete RHCSA 9 certification platform. Interactive terminals,
            simulated exams, and 18 hands-on labs await.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-8">
            <div className="flex items-center gap-3 bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
              <ShieldAlert className="w-8 h-8 text-blue-400" />
              <div className="flex flex-col">
                <span className="text-white font-semibold">125+ Commands</span>
                <span className="text-slate-400 text-sm">
                  Interactive Sandbox
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
              <TerminalIcon className="w-8 h-8 text-emerald-400" />
              <div className="flex flex-col">
                <span className="text-white font-semibold">5 Mock Exams</span>
                <span className="text-slate-400 text-sm">
                  Realistic Scenarios
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex justify-between items-center text-sm text-slate-500">
          <span>&copy; {new Date().getFullYear()} OCTUPUS Education</span>
          <span>Developed by: TBINI Mustapha Amin - OCTUPUS</span>
        </div>
      </div>

      {/* Right Pane - Auth Forms */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12 relative">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-muted-foreground mt-2">
              Sign in to continue your learning journey
            </p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="register">Create Account</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleLocalAuth("login");
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="student@octopus.edu"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="border-slate-300 dark:border-slate-700 focus-visible:ring-cyan-500"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="password">Password</Label>
                    <span className="text-xs text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 cursor-pointer transition-colors">
                      Forgot password?
                    </span>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="border-slate-300 dark:border-slate-700 focus-visible:ring-cyan-500"
                  />
                </div>
                <Button
                  className="w-full h-11 bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 text-white font-semibold transition-all duration-300 shadow-[0_0_15px_rgba(34,211,238,0.2)] hover:shadow-[0_0_25px_rgba(139,92,246,0.4)]"
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign In to OCTUPUS"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="space-y-4">
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleLocalAuth("register");
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="reg-name">Full Name</Label>
                  <Input
                    id="reg-name"
                    type="text"
                    placeholder="Mustapha Amin"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    className="border-slate-300 dark:border-slate-700 focus-visible:ring-cyan-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="student@octopus.edu"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="border-slate-300 dark:border-slate-700 focus-visible:ring-cyan-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Password</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="border-slate-300 dark:border-slate-700 focus-visible:ring-cyan-500"
                  />
                </div>
                <Button
                  className="w-full h-11 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-semibold transition-all duration-300 shadow-[0_0_15px_rgba(139,92,246,0.2)] hover:shadow-[0_0_25px_rgba(34,211,238,0.4)]"
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? "Creating account..." : "Create OCTUPUS Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-muted" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="h-11 hover:bg-slate-50 dark:hover:bg-slate-900"
              onClick={() => (window.location.href = "/api/oauth/google")}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </Button>
            <Button
              variant="outline"
              className="h-11 hover:bg-slate-50 dark:hover:bg-slate-900"
              onClick={() => (window.location.href = "/api/oauth/github")}
            >
              <Github className="w-5 h-5 mr-2" />
              GitHub
            </Button>
          </div>

          <Button
            variant="ghost"
            className="w-full text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400"
            onClick={() => (window.location.href = "/api/oauth/test")}
          >
            Skip & Sign in as Test Dummy User
          </Button>

          <p className="text-center text-sm text-muted-foreground px-8">
            By clicking continue, you agree to our{" "}
            <a
              href="#"
              className="underline underline-offset-4 hover:text-blue-600"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="#"
              className="underline underline-offset-4 hover:text-blue-600"
            >
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
