import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import MainLayout from "./components/MainLayout";
import Home from "./pages/Home";

import Chapters from "./pages/Chapters";
import ChapterDetail from "./pages/ChapterDetail";
import Commands from "./pages/Commands";
import CommandDetail from "./pages/CommandDetail";
import Terminal from "./pages/Terminal";
import Labs from "./pages/Labs";
import LabDetail from "./pages/LabDetail";
import Exams from "./pages/Exams";
import ExamDetail from "./pages/ExamDetail";
import Troubleshooting from "./pages/Troubleshooting";
import Profile from "./pages/Profile";
import Login from "./pages/Login";

function ProtectedRoute({
  component: Component,
}: {
  component: React.ComponentType;
}) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="py-10 text-center text-muted-foreground">Loading...</div>
    );
  }

  if (!isAuthenticated) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route
        path={"/chapters"}
        component={() => <ProtectedRoute component={Chapters} />}
      />
      <Route
        path={"/chapters/:id"}
        component={() => <ProtectedRoute component={ChapterDetail} />}
      />
      <Route
        path={"/commands"}
        component={() => <ProtectedRoute component={Commands} />}
      />
      <Route
        path={"/commands/:id"}
        component={() => <ProtectedRoute component={CommandDetail} />}
      />
      <Route
        path={"/terminal"}
        component={() => <ProtectedRoute component={Terminal} />}
      />
      <Route
        path={"/labs"}
        component={() => <ProtectedRoute component={Labs} />}
      />
      <Route
        path={"/labs/:id"}
        component={() => <ProtectedRoute component={LabDetail} />}
      />
      <Route
        path={"/exams"}
        component={() => <ProtectedRoute component={Exams} />}
      />
      <Route
        path={"/exams/:id"}
        component={() => <ProtectedRoute component={ExamDetail} />}
      />
      <Route
        path={"/troubleshooting"}
        component={() => <ProtectedRoute component={Troubleshooting} />}
      />
      <Route
        path={"/profile"}
        component={() => <ProtectedRoute component={Profile} />}
      />
      <Route path={"/login"} component={Login} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <MainLayout>
              <Router />
            </MainLayout>
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
