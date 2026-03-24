import { useAuth } from "@/_core/hooks/useAuth";
import { useTranslation } from "@/_core/hooks/useTranslation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { BookOpen, Code, Zap, BarChart3, Brain, Award } from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const { t, language } = useTranslation();
  const [, navigate] = useLocation();

  const { data: statsData } = trpc.progress.getStats.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const statsFromProfile = statsData || {
    chaptersCompleted: 0,
    totalChapters: 12,
    labsCompleted: 0,
    totalLabs: 20,
    examsCompleted: 0,
    totalExams: 5,
  };

  const chapterProgressPct = Math.round(
    statsFromProfile.totalChapters > 0
      ? (statsFromProfile.chaptersCompleted / statsFromProfile.totalChapters) *
          100
      : 0
  );

  const labsProgressPct = Math.round(
    statsFromProfile.totalLabs > 0
      ? (statsFromProfile.labsCompleted / statsFromProfile.totalLabs) * 100
      : 0
  );

  const examsProgressPct = Math.round(
    statsFromProfile.totalExams > 0
      ? (statsFromProfile.examsCompleted / statsFromProfile.totalExams) * 100
      : 0
  );

  const overallProgress = Math.round(
    (chapterProgressPct + labsProgressPct + examsProgressPct) / 3
  );

  const recommendedChapters = (statsData?.chapterProgress || [])
    .filter(ch => !ch.completed)
    .sort((a, b) => a.progress - b.progress)
    .slice(0, 3);

  const recentExamActivity = (statsData?.recentExams || []).slice(0, 3);

  const nextStepCta =
    chapterProgressPct < 100
      ? { label: t("home.next_steps.continue_chapters"), href: "/chapters" }
      : labsProgressPct < 100
        ? { label: t("home.next_steps.go_labs"), href: "/labs" }
        : { label: t("home.next_steps.go_exams"), href: "/exams" };

  const features = [
    {
      icon: BookOpen,
      title: t("home.features.chapters_title"),
      description: t("home.features.chapters_desc"),
    },
    {
      icon: Code,
      title: t("home.features.commands_title"),
      description: t("home.features.commands_desc"),
    },
    {
      icon: Zap,
      title: t("home.features.terminal_title"),
      description: t("home.features.terminal_desc"),
    },
    {
      icon: BarChart3,
      title: t("home.features.labs_title"),
      description: t("home.features.labs_desc"),
    },
    {
      icon: Brain,
      title: t("home.features.exams_title"),
      description: t("home.features.exams_desc"),
    },
    {
      icon: Award,
      title: t("home.features.certificates_title"),
      description: t("home.features.certificates_desc"),
    },
  ];

  const stats = [
    { label: t("home.stats.chapters"), value: "12" },
    { label: t("home.stats.commands"), value: "125+" },
    { label: t("home.stats.labs"), value: "18" },
    { label: t("home.stats.exams"), value: "5" },
  ];

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="py-12 md:py-20">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-block px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.15)]">
            <p className="text-sm font-semibold text-cyan-600 dark:text-cyan-400">
              {t("app.title")}
            </p>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-violet-500">
                {t("home.hero_title")}
            </span>{" "}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              {t("home.hero_subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            {isAuthenticated ? (
              <>
                <Button
                  size="lg"
                  onClick={() => navigate("/chapters")}
                  className="bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 text-white shadow-[0_0_15px_rgba(34,211,238,0.2)] hover:shadow-[0_0_25px_rgba(139,92,246,0.4)] transition-all"
                >
                  {t("home.start_learning")}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/exams")}
                  className="border-violet-500/30 hover:bg-violet-500/10 text-violet-600 dark:text-violet-400 transition-colors"
                >
                  {t("home.take_practice_exam")}
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="lg"
                  onClick={() => (window.location.href = getLoginUrl())}
                  className="bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 text-white shadow-[0_0_15px_rgba(34,211,238,0.2)] hover:shadow-[0_0_25px_rgba(139,92,246,0.4)] transition-all"
                >
                  {t("home.get_started")}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-violet-500/30 hover:bg-violet-500/10 text-violet-600 dark:text-violet-400 transition-colors"
                >
                  {t("home.learn_more")}
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
        {stats.map(stat => (
          <div key={stat.label} className="text-center">
            <p className="text-3xl md:text-4xl font-bold text-blue-600 dark:text-blue-400">
              {stat.value}
            </p>
            <p className="text-sm text-muted-foreground mt-2">{stat.label}</p>
          </div>
        ))}
      </section>

      {isAuthenticated && (
        <section className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">
                {t("home.next_steps.title")}
              </h2>
              <p className="text-muted-foreground">
                {t("home.next_steps.subtitle")} {user?.name || ""}
              </p>
            </div>
            <Badge className="bg-primary/90 text-primary-foreground px-3 py-1">
              {overallProgress}% {t("home.next_steps.overall")}
            </Badge>
          </div>

          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="text-lg">
                {t("home.next_steps.today_plan")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t("home.next_steps.chapters")}</span>
                  <span>
                    {statsFromProfile.chaptersCompleted}/
                    {statsFromProfile.totalChapters}
                  </span>
                </div>
                <Progress value={chapterProgressPct} />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t("home.next_steps.labs")}</span>
                  <span>
                    {statsFromProfile.labsCompleted}/{statsFromProfile.totalLabs}
                  </span>
                </div>
                <Progress value={labsProgressPct} />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t("home.next_steps.exams")}</span>
                  <span>
                    {statsFromProfile.examsCompleted}/{statsFromProfile.totalExams}
                  </span>
                </div>
                <Progress value={examsProgressPct} />
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button onClick={() => navigate(nextStepCta.href)}>
                  {nextStepCta.label}
                </Button>
                <Button variant="outline" onClick={() => navigate("/profile")}>
                  {t("home.next_steps.open_profile")}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("home.roadmap.easy")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {t("home.roadmap.easy_desc")}
                </p>
                <Badge variant={chapterProgressPct >= 35 ? "default" : "secondary"}>
                  {chapterProgressPct >= 35
                    ? t("home.roadmap.done")
                    : t("home.roadmap.in_progress")}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("home.roadmap.medium")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {t("home.roadmap.medium_desc")}
                </p>
                <Badge variant={labsProgressPct >= 40 ? "default" : "secondary"}>
                  {labsProgressPct >= 40
                    ? t("home.roadmap.done")
                    : t("home.roadmap.in_progress")}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("home.roadmap.hard")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {t("home.roadmap.hard_desc")}
                </p>
                <Badge variant={examsProgressPct >= 40 ? "default" : "secondary"}>
                  {examsProgressPct >= 40
                    ? t("home.roadmap.done")
                    : t("home.roadmap.in_progress")}
                </Badge>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {language === "fr" ? "Recommandations" : "Recommended Focus"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recommendedChapters.length > 0 ? (
                  recommendedChapters.map(ch => (
                    <button
                      key={ch.chapterId}
                      onClick={() => navigate(`/chapters/${ch.chapterId}`)}
                      className="w-full text-left rounded-md border p-2 text-sm hover:bg-accent"
                    >
                      {language === "fr" ? ch.titleFr || ch.titleEn : ch.titleEn || ch.titleFr} - {ch.progress}%
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {language === "fr"
                      ? "Excellent, vous avez complete tous les chapitres."
                      : "Great, you have completed all chapters."}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {language === "fr" ? "Activite recente" : "Recent Exam Activity"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recentExamActivity.length > 0 ? (
                  recentExamActivity.map((exam, idx) => (
                    <div
                      key={`${exam.title}-${idx}`}
                      className="rounded-md border p-2 text-sm flex items-center justify-between"
                    >
                      <span className="truncate pr-2">{exam.title}</span>
                      <Badge variant={exam.passed ? "default" : "secondary"}>
                        {Math.round(parseFloat(String(exam.score)))}%
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {language === "fr"
                      ? "Aucune activite d'examen pour le moment."
                      : "No exam activity yet."}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl md:text-4xl font-bold">
            {t("home.features_title")}
          </h2>
          <p className="text-lg text-muted-foreground">
            {t("home.features_subtitle")}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <Icon className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-4" />
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* CTA Section */}
      {isAuthenticated && (
        <section className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 md:p-12 text-center text-white space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold">
            {t("home.cta_title")}
          </h2>
          <p className="text-lg opacity-90 max-w-2xl mx-auto">
            {t("home.cta_subtitle")}
          </p>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => navigate("/chapters")}
            className="mt-4"
          >
            {t("home.start_chapter_1")}
          </Button>
        </section>
      )}
    </div>
  );
}
