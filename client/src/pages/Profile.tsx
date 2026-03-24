import { useTranslation } from "@/_core/hooks/useTranslation";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Award, TrendingUp, BookOpen, CheckCircle, Download } from "lucide-react";
import { useEffect, useState } from "react";

import jsPDF from "jspdf";

export default function Profile() {
  const { t, language } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null);
  const [dailyStreak, setDailyStreak] = useState(0);

  useEffect(() => {
    setProfileName(user?.name || "");
    setProfileEmail(user?.email || "");
  }, [user?.name, user?.email]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setDailyStreak(0);
      return;
    }
    if (typeof window === "undefined") return;

    const dayMs = 24 * 60 * 60 * 1000;
    const getStartOfDayTs = (ts: number) => {
      const d = new Date(ts);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    };
    const userScope = String(
      (user as { id?: string | number }).id ??
        (user as { email?: string | null }).email ??
        (user as { name?: string | null }).name ??
        "user"
    );
    const storageKey = `octopus-daily-streak-v1:${userScope}`;
    const now = Date.now();
    const todayStart = getStartOfDayTs(now);

    let nextStreak = 1;

    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          streak?: number;
          lastSeenAt?: number;
        };
        const prevStreak = Number(parsed?.streak);
        const prevLastSeenAt = Number(parsed?.lastSeenAt);

        if (Number.isFinite(prevStreak) && Number.isFinite(prevLastSeenAt)) {
          const prevDayStart = getStartOfDayTs(prevLastSeenAt);
          const dayDiff = Math.floor((todayStart - prevDayStart) / dayMs);

          if (dayDiff <= 0) {
            nextStreak = prevStreak;
          } else if (dayDiff === 1) {
            nextStreak = prevStreak + 1;
          } else {
            nextStreak = 0;
          }
        }
      }
    } catch {
      nextStreak = 1;
    }

    localStorage.setItem(
      storageKey,
      JSON.stringify({ streak: nextStreak, lastSeenAt: now })
    );
    setDailyStreak(nextStreak);
  }, [isAuthenticated, user]);

  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: async updated => {
      utils.auth.me.setData(undefined, updated);
      await utils.auth.me.invalidate();
      setIsEditingProfile(false);
      setProfileFeedback(
        language === "fr"
          ? "Profil mis a jour avec succes."
          : "Profile updated successfully."
      );
    },
    onError: () => {
      setProfileFeedback(
        language === "fr"
          ? "Echec de mise a jour du profil."
          : "Failed to update profile."
      );
    },
  });

  const handleSaveProfile = async () => {
    if (profileName.trim().length < 2) {
      setProfileFeedback(
        language === "fr"
          ? "Le nom doit contenir au moins 2 caracteres."
          : "Name must contain at least 2 characters."
      );
      return;
    }

    await updateProfileMutation.mutateAsync({
      name: profileName.trim(),
      email: profileEmail.trim() || undefined,
    });
  };

  const { data: statsData } = trpc.progress.getStats.useQuery(undefined, {
    enabled: !!user,
  });

  const stats = statsData || {
    chaptersCompleted: 0,
    totalChapters: 12,
    labsCompleted: 0,
    totalLabs: 20,
    examsCompleted: 0,
    totalExams: 5,
    averageScore: 0,
    streak: 0,
    certificates: [],
    recentExams: [],
    chapterProgress: [],
  };

  const certificates = stats.certificates || [];

  const recentActivity = (stats.recentExams || []).map(e => ({
    type: "exam",
    title: e.title,
    status: e.passed ? t("exams.passed") : t("exams.failed"),
    score: `${e.score}%`,
    date: new Date(e.date).toLocaleDateString()
  }));

  const chapterProgressItems =
    (stats.chapterProgress || []).length > 0
      ? stats.chapterProgress.map((item: any) => ({
          name: language === "fr" ? item.titleFr : item.titleEn,
          progress: item.progress,
        }))
      : [
          {
            name: t("profile.chapter_progress.title"),
            progress: Math.round(
              stats.totalChapters > 0
                ? (stats.chaptersCompleted / stats.totalChapters) * 100
                : 0
            ),
          },
        ];

  const weakestTopics = [...chapterProgressItems]
    .sort((a, b) => a.progress - b.progress)
    .slice(0, 3);

  const recentScores = ((stats as any).examTrend || [])
    .map((exam: any) => ({
      title: exam.title,
      score: Math.round(parseFloat(String(exam.score))),
    }))
    .filter((x: any) => Number.isFinite(x.score));

  const loadImageDataUrl = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = url;
    });
  };

  const loadFirstAvailableImage = async (urls: string[]) => {
    for (const url of urls) {
      try {
        const dataUrl = await loadImageDataUrl(url);
        return dataUrl;
      } catch {
        // Try next file path.
      }
    }
    return null;
  };

  const getGradeLabel = (score?: number) => {
    if (typeof score !== "number") return "Completed";
    if (score >= 90) return "Excellent / A+";
    if (score >= 80) return "A";
    if (score >= 70) return "B";
    return "C";
  };

  const handleDownloadCertificate = async (cert: { id: string | number; kind?: "chapter" | "final"; name: string; date: Date | null; score?: number }) => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const isFinalCertificate = cert.kind === "final";
    const dateString = new Date(cert.date || Date.now()).toLocaleDateString("fr-FR");
    const randomToken = Math.random().toString(36).slice(2, 6).toUpperCase();
    const certificateId = isFinalCertificate
      ? `OCTO-RHCSA-${randomToken}`
      : `OCTO-MOD-${randomToken}`;
    const verificationUrl = `https://www.octopus-edu.com/verify/${certificateId}`;
    
    

    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    const isDarkMinimal = isFinalCertificate;
    const pageBg = isDarkMinimal ? [14, 18, 32] : [255, 255, 255];
    const primary = isDarkMinimal ? [122, 196, 255] : [24, 47, 99];
    const secondary = isDarkMinimal ? [198, 207, 226] : [70, 82, 106];
    const textColor = isDarkMinimal ? [235, 240, 250] : [45, 45, 45];

    doc.setFillColor(pageBg[0], pageBg[1], pageBg[2]);
    doc.rect(0, 0, width, height, "F");

    const margin = 14;
    doc.setDrawColor(primary[0], primary[1], primary[2]);
    doc.setLineWidth(0.4);
    doc.rect(margin, margin, width - 2 * margin, height - 2 * margin, "S");

    const [logoDataUrl, signatureDataUrl] = await Promise.all([ loadFirstAvailableImage(["/logo2.png", "/logo.png", "/logo.jpg"]), loadFirstAvailableImage(["/signatur.png", "/signature.png", "/signature.jpg", "/sig.png"]) ]);

    



    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text(
      isFinalCertificate ? "CERTIFICATE OF ACHIEVEMENT" : "CERTIFICATE OF COMPLETION",
      width / 2,
      50,
      { align: "center" }
    );

    doc.setTextColor(secondary[0], secondary[1], secondary[2]);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(
      isFinalCertificate
        ? "This certificate is proudly awarded to"
        : "This is to certify that",
      width / 2,
      62,
      { align: "center" }
    );

    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.text(user?.name || "Student Name", width / 2, 80, { align: "center" });

    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);

    if (isFinalCertificate) {
      doc.text("for successfully completing the", width / 2, 96, { align: "center" });
      doc.setTextColor(primary[0], primary[1], primary[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
        doc.text("RHCSA - Red Hat Certified System Administrator Training Program", width / 2, 108, {
        align: "center",
      });

      doc.setTextColor(secondary[0], secondary[1], secondary[2]);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text("Delivered by Octopus Education", width / 2, 118, { align: "center" });
        doc.text("The recipient has demonstrated solid understanding and practical skills in:", width / 2, 128, {
        align: "center",
      });

      const finalPoints = [
        "Linux system administration",
        "User and permission management",
        "Networking configuration",
        "Security and system services",
      ];

      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFontSize(10.5);
      finalPoints.forEach((point, idx) => {
        doc.text(`- ${point}`, width / 2, 138 + idx * 8, { align: "center" });
      });

      if ("score" in cert && typeof cert.score === "number") {
        doc.setTextColor(primary[0], primary[1], primary[2]);
        doc.setFont("helvetica", "bold");
        doc.text(`Final Average Score: ${cert.score}%`, width / 2, 172, { align: "center" });
      }
    } else {
      doc.text("has successfully completed the module", width / 2, 96, { align: "center" });
      doc.setTextColor(primary[0], primary[1], primary[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(`\"${cert.name}\"`, width / 2, 108, { align: "center" });

      doc.setTextColor(secondary[0], secondary[1], secondary[2]);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text("as part of the RHCSA Training Program", width / 2, 118, { align: "center" });
      doc.text("delivered by Octopus Education.", width / 2, 126, { align: "center" });
        doc.text("This module covered essential concepts and practical skills related to:", width / 2, 134, {
        align: "center",
      });

      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFontSize(10.5);

      const getModulePoints = (name: string) => {
        const lowerName = name.toLowerCase();
        if (lowerName.includes("chapter 1") || lowerName.includes("fundamentals")) {
          return ["System Administration Basics", "User Environment Configuration", "Basic File Management"];
        }
        if (lowerName.includes("chapter 2") || lowerName.includes("user")) {
          return ["User and Group Creation", "Password Policies", "Access Control"];
        }
        if (lowerName.includes("chapter 3") || lowerName.includes("file system") || lowerName.includes("storage")) {
          return ["Partition Management", "LVM Configuration", "File System Maintenance"];
        }
        if (lowerName.includes("chapter 4") || lowerName.includes("boot")) {
          return ["GRUB Configuration", "System Initialization", "Boot Troubleshooting"];
        }
        if (lowerName.includes("chapter 5") || lowerName.includes("network")) {
          return ["Network Interface Configuration", "Connection Troubleshooting", "Network Services"];
        }
        if (lowerName.includes("chapter 6") || lowerName.includes("selinux")) {
          return ["SELinux Contexts", "Boolean Toggles", "Policy Troubleshooting"];
        }
        if (lowerName.includes("chapter 7") || lowerName.includes("service") || lowerName.includes("daemon")) {
          return ["Systemd Management", "Service Targets", "Daemon Configuration"];
        }
        if (lowerName.includes("chapter 8") || lowerName.includes("package")) {
          return ["YUM/DNF Repositories", "Software Installation", "AppStreams and Modules"];
        }
        if (lowerName.includes("chapter 9") || lowerName.includes("performance") || lowerName.includes("monitoring")) {
          return ["System Monitoring Tools", "Process Management", "Resource Tuning"];
        }
        if (lowerName.includes("chapter 10") || lowerName.includes("log")) {
          return ["Rsyslog Configuration", "Journalctl Usage", "Log Rotation Analysis"];
        }
        if (lowerName.includes("chapter 11") || lowerName.includes("scripting") || lowerName.includes("automation")) {
          return ["Bash Fundamentals", "Automation Scripts", "Execution Flows"];
        }
        if (lowerName.includes("chapter 12") || lowerName.includes("troubleshooting") || lowerName.includes("advanced")) {
          return ["Advanced System Recovery", "Kernel Management", "Complex Issue Resolution"];
        }
        if (lowerName.includes("firewall")) {
          return ["Firewall Configuration", "Network Security Policies", "Port Management"];
        }
        return [
          "Linux administration concepts",
          "Practical RHCSA command-line skills",
          "System operations and troubleshooting"
        ];
      };

      const modulePoints = getModulePoints(cert.name);
      modulePoints.forEach((point, idx) => {
        doc.text(`- ${point}`, width / 2, 144 + (idx * 8), { align: "center" });
      });
    }

    doc.setTextColor(secondary[0], secondary[1], secondary[2]);
    doc.setFont("courier", "normal");
    doc.setFontSize(10);
    doc.text(`Date: ${dateString}`, 24, 166);
    doc.text(`Certificate ID: ${certificateId}`, 24, 173);
    
    

    if (isFinalCertificate) {
      doc.text(`Verification: ${verificationUrl}`, 24, 180);
    }

        if (logoDataUrl) {
      doc.addImage(logoDataUrl, "PNG", 26, 134, 32, 32);
    }

    doc.setDrawColor(secondary[0], secondary[1], secondary[2]);
    doc.setLineWidth(0.2);
        if (signatureDataUrl) { 
      doc.addImage(signatureDataUrl, "PNG", width - 85, 134, 50, 20); 
    }
    doc.line(width - 90, 154, width - 30, 154);

    doc.setTextColor(secondary[0], secondary[1], secondary[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(isFinalCertificate ? "Authorized Signature" : "Signature", width - 60, 160, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.text("Mustapha Amin Tbini", width - 60, 168, { align: "center" });
    doc.text(
      isFinalCertificate ? "Founder & Lead Instructor" : "Founder & Cybersecurity Instructor",
      width - 60,
      174,
      { align: "center" }
    );
    doc.text("Octopus Education", width - 60, 180, { align: "center" });

    doc.save(`${isFinalCertificate ? "Final" : "Module"}_Certificate_${cert.name.replace(/\s+/g, "_")}.pdf`);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-4xl font-bold">{t("profile.title")}</h1>
        <p className="text-lg text-muted-foreground">{t("profile.track_progress")}</p>
      </div>

      {/* User Info Card */}
      <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-200 dark:border-blue-900">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              {isEditingProfile ? (
                <div className="space-y-2 max-w-sm">
                  <Input
                    value={profileName}
                    onChange={e => setProfileName(e.target.value)}
                    placeholder={language === "fr" ? "Nom complet" : "Full name"}
                  />
                  <Input
                    type="email"
                    value={profileEmail}
                    onChange={e => setProfileEmail(e.target.value)}
                    placeholder={language === "fr" ? "Adresse email" : "Email address"}
                  />
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-foreground">{user?.name || "User"}</h2>
                  <p className="text-muted-foreground">{user?.email}</p>
                </>
              )}
              <div className="flex gap-2 mt-3">
                <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-400">
                  {stats.chaptersCompleted}/{stats.totalChapters} {t("profile.chapters")}
                </Badge>
                <Badge className="bg-green-500/20 text-green-700 dark:text-green-400">
                  {dailyStreak} {t("profile.day_streak")}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                {stats.averageScore}%
              </div>
              <p className="text-sm text-muted-foreground">{t("profile.average_score")}</p>
              <div className="mt-3 flex justify-end gap-2">
                {isEditingProfile ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditingProfile(false);
                        setProfileName(user?.name || "");
                        setProfileEmail(user?.email || "");
                        setProfileFeedback(null);
                      }}
                    >
                      {language === "fr" ? "Annuler" : "Cancel"}
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveProfile}
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending
                        ? language === "fr"
                          ? "Enregistrement..."
                          : "Saving..."
                        : language === "fr"
                          ? "Enregistrer"
                          : "Save"}
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setIsEditingProfile(true)}>
                    {language === "fr" ? "Modifier profil" : "Edit Profile"}
                  </Button>
                )}
              </div>
            </div>
          </div>
          {profileFeedback ? (
            <p className="text-sm mt-3 text-muted-foreground">{profileFeedback}</p>
          ) : null}
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              {t("profile.chapters")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.chaptersCompleted}/{stats.totalChapters}
            </div>
            <Progress value={(stats.chaptersCompleted / stats.totalChapters) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {t("profile.labs")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.labsCompleted}/{stats.totalLabs}
            </div>
            <Progress value={(stats.labsCompleted / stats.totalLabs) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Award className="w-4 h-4" />
              {t("profile.exams")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.examsCompleted}/{stats.totalExams}
            </div>
            <Progress value={(stats.examsCompleted / stats.totalExams) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              {t("profile.score")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.averageScore}%
            </div>
            <p className="text-xs text-muted-foreground mt-2">{t("profile.average_performance")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="progress" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="progress">{t("profile.tabs.progress")}</TabsTrigger>
          <TabsTrigger value="activity">{t("profile.tabs.activity")}</TabsTrigger>
          <TabsTrigger value="certificates">{t("profile.tabs.certificates")}</TabsTrigger>
          <TabsTrigger value="settings">{t("profile.tabs.settings")}</TabsTrigger>
        </TabsList>

        {/* Progress Tab */}
        <TabsContent value="progress" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("profile.chapter_progress.title")}</CardTitle>
              <CardDescription>{t("profile.chapter_progress.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {chapterProgressItems.map((item, idx) => (
                <div key={item.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground">{item.name}</p>
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                      {item.progress}%
                    </span>
                  </div>
                  <Progress value={item.progress} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  {language === "fr" ? "Points faibles" : "Weak Topics"}
                </CardTitle>
                <CardDescription>
                  {language === "fr"
                    ? "Chapitres a renforcer en priorite"
                    : "Topics to strengthen first"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {weakestTopics.map(item => (
                  <div
                    key={`weak-${item.name}`}
                    className="rounded-md border p-3 flex items-center justify-between"
                  >
                    <p className="text-sm font-medium">{item.name}</p>
                    <Badge variant="secondary">{item.progress}%</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {language === "fr" ? "Tendance des scores" : "Score Trend"}
                </CardTitle>
                <CardDescription>
                  {language === "fr"
                    ? "Dernieres tentatives d'examen"
                    : "Latest exam attempts"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentScores.length > 0 ? (
                  recentScores.map((item, idx) => (
                    <div key={`trend-${idx}`} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate pr-2">{item.title}</span>
                        <span className="font-semibold">{item.score}%</span>
                      </div>
                      <Progress value={item.score} className="h-2" />
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {language === "fr"
                      ? "Aucun score disponible pour l'instant."
                      : "No score data available yet."}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("profile.recent_activity.title")}</CardTitle>
              <CardDescription>{t("profile.recent_activity.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity, idx) => (
                  <div key={idx} className="flex items-start gap-4 pb-4 border-b border-border last:border-0 last:pb-0">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-foreground">{activity.title}</p>
                        <Badge variant="outline" className="capitalize">
                          {activity.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {activity.score !== "-" ? `${t("profile.score")}: ${activity.score}` : t("common.completed")} · {activity.date}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Certificates Tab */}
        <TabsContent value="certificates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("profile.certificates.title")}</CardTitle>
              <CardDescription>{t("profile.certificates.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {certificates.length > 0 ? (
                <div className="space-y-4">
                  {certificates.map((cert) => (
                    <div
                      key={cert.id}
                      className="p-4 border border-border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Award className="w-5 h-5 text-yellow-500" />
                            <p className="font-semibold text-foreground">{cert.name}</p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {t("profile.certificates.completed_on")} {new Date(cert.date || Date.now()).toLocaleDateString()}
                            {"score" in cert && typeof cert.score === "number"
                              ? ` · ${t("profile.score")}: ${cert.score}%`
                              : ""}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                          onClick={() => handleDownloadCertificate(cert)}
                        >
                          <Download className="w-4 h-4" />
                          {t("common.download")}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Award className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">{t("profile.certificates.no_certificates")}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("profile.certificates.no_certificates_hint")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("profile.settings.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-foreground">{t("profile.settings.email_notifications_title")}</label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("profile.settings.email_notifications_desc")}
                  </p>
                  <div className="mt-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <label className="ml-2 text-sm text-muted-foreground">{t("profile.settings.enable_notifications")}</label>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <label className="text-sm font-medium text-foreground">{t("profile.settings.learning_reminders_title")}</label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("profile.settings.learning_reminders_desc")}
                  </p>
                  <div className="mt-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <label className="ml-2 text-sm text-muted-foreground">{t("profile.settings.enable_reminders")}</label>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <Button variant="destructive">{t("nav.logout")}</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}






























