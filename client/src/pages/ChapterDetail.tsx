import { useTranslation } from "@/_core/hooks/useTranslation";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, BookOpen, Code } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const toAscii = (value?: string | null) =>
  (value || "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2026]/g, "...")
    .replace(/[\u00A0]/g, " ");

const toMultilineList = (value?: string | null) =>
  toAscii(value)
    .split(/\n|,\s*(?=-)/g)
    .map(line => line.trim())
    .filter(Boolean)
    .join("\n");

type ParsedOption = { flag: string; description: string };

const parseOptions = (value?: string | null): ParsedOption[] => {
  return toAscii(value)
    .split(/\n|,\s*(?=-)/g)
    .map(line => line.trim())
    .filter(Boolean)
    .map(part => {
      const parenMatch = part.match(/^([^()]+?)\s*\((.+)\)$/);
      if (parenMatch) {
        return { flag: parenMatch[1].trim(), description: parenMatch[2].trim() };
      }
      const colonIndex = part.indexOf(":");
      if (colonIndex > 0) {
        return {
          flag: part.slice(0, colonIndex).trim(),
          description: part.slice(colonIndex + 1).trim(),
        };
      }
      return { flag: part, description: "" };
    });
};

const looksLikeNeedsValue = (description: string) =>
  /(set|specify|change|defin|uid|gid|group|shell|directory|date|name|password|type|path|size|port|user|file|mode|owner|time)/i.test(
    description
  );

const extractTargetPlaceholder = (syntax: string, commandName: string) => {
  const tokens = syntax
    .split(/\s+/)
    .map(token => token.trim())
    .filter(Boolean)
    .filter(token => token !== commandName)
    .filter(token => !token.startsWith("["));
  const target = tokens[tokens.length - 1];
  return target ? `<${target.replace(/[<>]/g, "")}>` : "";
};

const buildExampleLinesFromOptions = (
  commandName: string,
  syntax: string,
  rawOptions?: string | null
) => {
  const options = parseOptions(rawOptions);
  const target = extractTargetPlaceholder(syntax, commandName);
  return options.map(option => {
    const valuePart = looksLikeNeedsValue(option.description) ? " <value>" : "";
    const targetPart = target ? ` ${target}` : "";
    return `$ ${commandName} ${option.flag}${valuePart}${targetPart}`.trim();
  });
};

const frDescriptionOverrides: Record<string, string> = {
  useradd: "Creer un nouveau compte utilisateur",
  userdel: "Supprimer un compte utilisateur",
  usermod: "Modifier un compte utilisateur",
  passwd: "Changer ou gerer le mot de passe utilisateur",
  groupadd: "Creer un nouveau groupe",
  groupdel: "Supprimer un groupe",
  groupmod: "Modifier un groupe",
  gpasswd: "Gerer les membres et mots de passe de groupe",
  id: "Afficher les identifiants utilisateur et groupes",
  who: "Afficher les utilisateurs connectes",
  w: "Afficher les utilisateurs connectes et leurs activites",
};

const translateEnglishToFrench = (text: string) => {
  let translated = toAscii(text);
  const replacements: Array<[RegExp, string]> = [
    [/create/gi, "creer"],
    [/delete/gi, "supprimer"],
    [/remove/gi, "retirer"],
    [/modify/gi, "modifier"],
    [/manage/gi, "gerer"],
    [/change/gi, "changer"],
    [/display/gi, "afficher"],
    [/show/gi, "montrer"],
    [/list/gi, "lister"],
    [/print/gi, "afficher"],
    [/user account/gi, "compte utilisateur"],
    [/user accounts/gi, "comptes utilisateur"],
    [/users/gi, "utilisateurs"],
    [/groups/gi, "groupes"],
    [/group/gi, "groupe"],
    [/password/gi, "mot de passe"],
    [/permissions/gi, "permissions"],
    [/filesystems/gi, "systemes de fichiers"],
    [/filesystem/gi, "systeme de fichiers"],
    [/network/gi, "reseau"],
    [/service/gi, "service"],
    [/command/gi, "commande"],
    [/commands/gi, "commandes"],
    [/directory/gi, "repertoire"],
    [/directories/gi, "repertoires"],
    [/file/gi, "fichier"],
    [/logged in/gi, "connectes"],
    [/activities/gi, "activites"],
  ];

  replacements.forEach(([pattern, replacement]) => {
    translated = translated.replace(pattern, replacement);
  });

  return translated.charAt(0).toUpperCase() + translated.slice(1);
};

const getLocalizedDescription = (
  command: {
    nameEn?: string | null;
    descriptionEn?: string | null;
    descriptionFr?: string | null;
  },
  language: "fr" | "en"
) => {
  if (language === "en") {
    return command.descriptionEn || command.descriptionFr || "";
  }

  const descFr = (command.descriptionFr || "").trim();
  const descEn = (command.descriptionEn || "").trim();
  const override = frDescriptionOverrides[(command.nameEn || "").toLowerCase()];

  if (descFr && descFr !== descEn) {
    return descFr;
  }

  if (override) {
    return override;
  }

  return translateEnglishToFrench(descEn);
};

async function loadFirstAvailableImage(urls: string[]) {
  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const blob = await response.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Failed to read image"));
        reader.readAsDataURL(blob);
      });
      if (dataUrl) return dataUrl;
    } catch {
      // Try next path.
    }
  }
  return null;
}

export default function ChapterDetail() {
  const { t, language } = useTranslation();
  const [, navigate] = useLocation();
  const [chapterId, setChapterId] = useState<number | null>(null);

  useEffect(() => {
    const match = window.location.pathname.match(/\/chapters\/(\d+)/);
    if (match) {
      setChapterId(parseInt(match[1]));
    }
  }, []);

  const { data: chapter, isLoading: chapterLoading } =
    trpc.chapters.getById.useQuery(
      { id: chapterId! },
      { enabled: !!chapterId }
    );

  const { data: commands, isLoading: commandsLoading } =
    trpc.commands.list.useQuery(
      { chapterId: chapterId! },
      { enabled: !!chapterId }
    );

  if (!chapterId || chapterLoading || commandsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!chapter) {
    return (
      <Card className="text-center py-12">
        <p className="text-muted-foreground">
          {language === "fr" ? "Chapitre introuvable" : "Chapter not found"}
        </p>
      </Card>
    );
  }

  const chapterTitle =
    language === "fr"
      ? chapter.titleFr || chapter.titleEn
      : chapter.titleEn || chapter.titleFr;
  const chapterDescription =
    language === "fr"
      ? chapter.descriptionFr || chapter.descriptionEn
      : chapter.descriptionEn || chapter.descriptionFr;
  const chapterContent =
    language === "fr"
      ? chapter.contentFr ||
        chapter.contentEn ||
        chapter.descriptionFr ||
        chapter.descriptionEn
      : chapter.contentEn ||
        chapter.contentFr ||
        chapter.descriptionEn ||
        chapter.descriptionFr;

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case "beginner":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "intermediate":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
      case "advanced":
        return "bg-red-500/10 text-red-700 dark:text-red-400";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
    }
  };

  const handleDownloadCheatsheet = async (mode: "standard" | "print" = "standard") => {
    if (!chapter || !commands) return;
    const isPrint = mode === "print";
    const doc = new jsPDF({
      orientation: isPrint ? "portrait" : "landscape",
      unit: "pt",
      format: "a4",
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const logoDataUrl = await loadFirstAvailableImage([
      "/logo2.png",
      "/logo.png",
      "/logo.jpg",
    ]);
    if (logoDataUrl && !isPrint) {
      doc.addImage(logoDataUrl, "PNG", 26, 18, 56, 56);
    }

    const fullTitle = toAscii(
      language === "fr"
        ? `Chapitre ${chapter.chapterNumber}: ${chapterTitle}`
        : `Chapter ${chapter.chapterNumber}: ${chapterTitle}`
    );

    if (!isPrint) {
      // Cover page for the standard version.
      const coverWidth = doc.internal.pageSize.getWidth();
      const coverHeight = doc.internal.pageSize.getHeight();
      doc.setFillColor(8, 33, 58);
      doc.rect(0, 0, coverWidth, coverHeight, "F");
      doc.setFillColor(191, 155, 48);
      doc.rect(0, 0, coverWidth, 14, "F");
      doc.rect(0, coverHeight - 14, coverWidth, 14, "F");
      if (logoDataUrl) {
        doc.addImage(logoDataUrl, "PNG", coverWidth / 2 - 55, 72, 110, 110);
      }
      doc.setTextColor(253, 244, 227);
      doc.setFontSize(26);
      doc.text("OCTUPUS Education", coverWidth / 2, 200, { align: "center" });
      doc.setFontSize(18);
      doc.text(fullTitle, coverWidth / 2, 238, { align: "center" });
      doc.setFontSize(12);
      doc.text(
        language === "fr"
          ? "Guide de revision pratique avec options et exemples"
          : "Practical revision guide with options and examples",
        coverWidth / 2,
        266,
        { align: "center" }
      );
      doc.text(
        `${commands.length} ${language === "fr" ? "commandes" : "commands"}`,
        coverWidth / 2,
        294,
        { align: "center" }
      );
      doc.addPage("a4", "landscape");
    } else {
      doc.setTextColor(20, 20, 20);
      doc.setFontSize(16);
      doc.text(fullTitle, 32, 36);
      doc.setFontSize(10);
      doc.text(
        toAscii(new Date().toLocaleString(language === "fr" ? "fr-FR" : "en-US")),
        pageWidth - 32,
        36,
        { align: "right" }
      );
      doc.setFontSize(11);
      doc.text(toAscii(chapterDescription), 32, 56, { maxWidth: pageWidth - 64 });
    }

    autoTable(doc, {
      startY: isPrint ? 84 : 36,
      head: [
        [
          language === "fr" ? "Commande" : "Command",
          language === "fr" ? "Description" : "Description",
          language === "fr" ? "Syntaxe" : "Syntax",
          language === "fr" ? "Options" : "Options",
          language === "fr" ? "Exemples" : "Examples",
        ],
      ],
      body: commands.map(c => [
        toAscii(language === "fr" ? c.nameFr || c.nameEn : c.nameEn || c.nameFr),
        toAscii(getLocalizedDescription(c, language as "fr" | "en")),
        toAscii(c.syntax),
        toMultilineList(
          language === "fr" ? c.optionsFr || c.optionsEn : c.optionsEn || c.optionsFr
        ),
        (() => {
          const rawExamples =
            language === "fr" ? c.examplesFr || c.examplesEn : c.examplesEn || c.examplesFr;
          const cleanExamples = toMultilineList(rawExamples);
          if (cleanExamples) return cleanExamples;

          const generated = buildExampleLinesFromOptions(
            c.nameEn || c.nameFr || "cmd",
            c.syntax || "",
            language === "fr" ? c.optionsFr || c.optionsEn : c.optionsEn || c.optionsFr
          );
          return generated.join("\n");
        })(),
      ]),
      theme: "grid",
      headStyles: {
        fillColor: isPrint ? [235, 235, 235] : [7, 66, 111],
        textColor: isPrint ? 20 : 255,
        fontStyle: "bold",
        fontSize: isPrint ? 11 : 10,
      },
      alternateRowStyles: { fillColor: isPrint ? [255, 255, 255] : [247, 249, 252] },
      styles: {
        fontSize: isPrint ? 10 : 9,
        cellPadding: 6,
        lineColor: isPrint ? [180, 180, 180] : [220, 226, 234],
        textColor: isPrint ? [20, 20, 20] : [23, 37, 84],
        overflow: "linebreak",
      },
      columnStyles: {
        0: { cellWidth: isPrint ? 60 : 82, fontStyle: "bold" },
        1: { cellWidth: isPrint ? 92 : 165 },
        2: { cellWidth: isPrint ? 86 : 130 },
        3: { cellWidth: isPrint ? 132 : 170 },
        4: { cellWidth: isPrint ? 132 : 190 },
      },
      margin: { left: isPrint ? 22 : 26, right: isPrint ? 22 : 26, bottom: 28 },
      didDrawPage: data => {
        const currentWidth = doc.internal.pageSize.getWidth();
        const currentHeight = doc.internal.pageSize.getHeight();
        if (isPrint) {
          if (logoDataUrl) {
            const watermarkSize = 220;
            const watermarkX = currentWidth / 2 - watermarkSize / 2;
            const watermarkY = currentHeight / 2 - watermarkSize / 2;
            const asAny = doc as any;

            if (asAny.GState && typeof asAny.setGState === "function") {
              asAny.setGState(new asAny.GState({ opacity: 0.08 }));
              doc.addImage(
                logoDataUrl,
                "PNG",
                watermarkX,
                watermarkY,
                watermarkSize,
                watermarkSize
              );
              asAny.setGState(new asAny.GState({ opacity: 1 }));
            } else {
              doc.addImage(
                logoDataUrl,
                "PNG",
                watermarkX,
                watermarkY,
                watermarkSize,
                watermarkSize
              );
            }
          }
          doc.setTextColor(70, 70, 70);
          doc.setFontSize(8);
          doc.text("OCTUPUS Education", 22, currentHeight - 10);
        } else {
          doc.setFillColor(8, 33, 58);
          doc.rect(0, currentHeight - 20, currentWidth, 20, "F");
          doc.setTextColor(253, 244, 227);
          doc.setFontSize(8);
          doc.text("OCTUPUS Education - RHCSA Learning Platform", 26, currentHeight - 7);
        }
        doc.text(
          `${data.pageNumber}`,
          currentWidth - 26,
          currentHeight - (isPrint ? 10 : 7),
          { align: "right" }
        );
      },
    });

    if (isPrint && logoDataUrl) {
      const totalPages = doc.getNumberOfPages();
      doc.setPage(totalPages);
      const lastPageWidth = doc.internal.pageSize.getWidth();
      const lastPageHeight = doc.internal.pageSize.getHeight();
      const stampSize = 110;
      const stampX = lastPageWidth - stampSize - 22;
      const stampY = lastPageHeight - stampSize - 14;
      doc.addImage(logoDataUrl, "PNG", stampX, stampY, stampSize, stampSize);
    }

    doc.save(
      language === "fr"
        ? isPrint
          ? `rhcsa-chapitre-${chapter.chapterNumber}-aide-memoire-impression.pdf`
          : `rhcsa-chapitre-${chapter.chapterNumber}-aide-memoire.pdf`
        : isPrint
          ? `rhcsa-chapter-${chapter.chapterNumber}-cheatsheet-print.pdf`
          : `rhcsa-chapter-${chapter.chapterNumber}-cheatsheet.pdf`
    );
  };
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <button
          onClick={() => navigate("/chapters")}
          className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
        >
          <ChevronLeft className="w-4 h-4" />
          {language === "fr" ? "Retour aux Chapitres" : "Back to Chapters"}
        </button>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-semibold text-muted-foreground">
              {language === "fr"
                ? `Chapitre ${chapter.chapterNumber}`
                : `Chapter ${chapter.chapterNumber}`}
            </span>
          </div>
          <h1 className="text-4xl font-bold">{chapterTitle}</h1>
          <p className="text-lg text-muted-foreground">{chapterDescription}</p>
        </div>
      </div>

      {/* Content */}
      <Tabs defaultValue="content" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="content">
            {language === "fr" ? "Contenu" : "Content"}
          </TabsTrigger>
          <TabsTrigger value="commands">
            {language === "fr" ? "Commandes" : "Commands"} (
            {commands?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="resources">
            {language === "fr" ? "Ressources" : "Resources"}
          </TabsTrigger>
        </TabsList>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {language === "fr"
                  ? "Vue d'ensemble du chapitre"
                  : "Chapter Overview"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 prose dark:prose-invert max-w-none">
              <p className="text-muted-foreground leading-relaxed">
                {chapterContent}
              </p>

              <div className="bg-blue-500/5 border border-blue-200 dark:border-blue-900 rounded-lg p-6 space-y-4">
                <h3 className="font-semibold text-foreground">
                  {language === "fr"
                    ? "Objectifs d'apprentissage"
                    : "Learning Objectives"}
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    {language === "fr"
                      ? "Comprendre les concepts fondamentaux de ce chapitre"
                      : "Understand the fundamental concepts of this chapter"}
                  </li>
                  <li>
                    {language === "fr"
                      ? "Maitriser les commandes et outils essentiels"
                      : "Master the essential commands and tools"}
                  </li>
                  <li>
                    {language === "fr"
                      ? "Appliquer les connaissances a des scenarios reels"
                      : "Apply knowledge to real-world scenarios"}
                  </li>
                  <li>
                    {language === "fr"
                      ? "Se preparer a l'examen RHCSA"
                      : "Prepare for RHCSA certification exam"}
                  </li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">
                  {language === "fr" ? "Sujets cles" : "Key Topics"}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(language === "fr"
                    ? [
                        "Fondamentaux",
                        "Bonnes pratiques",
                        "Problemes frequents",
                        "Techniques avancees",
                      ]
                    : [
                        "Fundamentals",
                        "Best Practices",
                        "Common Issues",
                        "Advanced Techniques",
                      ]
                  ).map(topic => (
                    <div
                      key={topic}
                      className="p-4 border border-border rounded-lg"
                    >
                      <p className="font-medium text-foreground">{topic}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {language === "fr"
                          ? `Apprenez les points essentiels de ${topic.toLowerCase()} pour ce chapitre`
                          : `Learn the essential ${topic.toLowerCase()} for this chapter`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Commands Tab */}
        <TabsContent value="commands" className="space-y-4">
          {commands && commands.length > 0 ? (
            <div className="space-y-4">
              {commands.map(cmd =>
                (() => {
                  const cmdName =
                    language === "fr"
                      ? cmd.nameFr || cmd.nameEn
                      : cmd.nameEn || cmd.nameFr;
                  const cmdDescription =
                    language === "fr"
                      ? cmd.descriptionFr || cmd.descriptionEn
                      : cmd.descriptionEn || cmd.descriptionFr;

                  return (
                    <Card
                      key={cmd.id}
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => navigate(`/commands/${cmd.id}`)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Code className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                                {cmdName}
                              </span>
                              <Badge
                                className={getDifficultyColor(cmd.difficulty)}
                              >
                                {cmd.difficulty}
                              </Badge>
                            </div>
                            <CardDescription>{cmdDescription}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-muted p-3 rounded-md font-mono text-sm overflow-x-auto">
                          {cmd.syntax}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()
              )}
            </div>
          ) : (
            <Card className="text-center py-12">
              <p className="text-muted-foreground">
                {language === "fr"
                  ? "Aucune commande pour ce chapitre pour le moment"
                  : "No commands for this chapter yet"}
              </p>
            </Card>
          )}
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {language === "fr"
                  ? "Ressources d'apprentissage"
                  : "Learning Resources"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div
                  className="p-4 border border-border rounded-lg hover:bg-accent transition-colors cursor-pointer"
                  onClick={() =>
                    window.open(
                      "https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9",
                      "_blank"
                    )
                  }
                >
                  <p className="font-medium text-foreground">
                    {language === "fr"
                      ? "Documentation officielle Red Hat"
                      : "Official Red Hat Documentation"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {language === "fr"
                      ? "Acceder a la documentation officielle Red Hat pour ce chapitre"
                      : "Access the official Red Hat documentation for this chapter"}
                  </p>
                </div>
                <div
                  className="p-4 border border-border rounded-lg hover:bg-accent transition-colors cursor-pointer"
                  onClick={() => navigate("/labs")}
                >
                  <p className="font-medium text-foreground">
                    {language === "fr" ? "Labs pratiques" : "Practice Labs"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {language === "fr"
                      ? "Completer des labs pratiques pour renforcer votre apprentissage"
                      : "Complete hands-on labs to reinforce your learning"}
                  </p>
                </div>
                <div
                  className="p-4 border border-border rounded-lg hover:bg-accent transition-colors cursor-pointer"
                  onClick={() => handleDownloadCheatsheet("standard")}
                >
                  <p className="font-medium text-foreground">
                    {language === "fr" ? "Aide-memoire" : "Cheatsheet"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {language === "fr"
                      ? "Telecharger un guide de reference rapide pour ce chapitre"
                      : "Download a quick reference guide for this chapter"}
                  </p>
                </div>
                <div
                  className="p-4 border border-border rounded-lg hover:bg-accent transition-colors cursor-pointer"
                  onClick={() => handleDownloadCheatsheet("print")}
                >
                  <p className="font-medium text-foreground">
                    {language === "fr"
                      ? "Version imprimable A4"
                      : "Printable A4 Version"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {language === "fr"
                      ? "Telecharger une version optimisee pour impression papier"
                      : "Download a print-optimized paper version"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Navigation */}
      <div className="flex gap-4 justify-between">
        <Button
          variant="outline"
          onClick={() => {
            if (chapter.chapterNumber > 1) {
              navigate(`/chapters/${chapter.chapterNumber - 1}`);
            }
          }}
          disabled={chapter.chapterNumber === 1}
        >
          {language === "fr" ? "← Chapitre precedent" : "← Previous Chapter"}
        </Button>
        <Button
          variant="default"
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => navigate("/labs")}
        >
          {language === "fr"
            ? "Commencer un Lab pratique"
            : "Start Practice Lab"}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            if (chapter.chapterNumber < 12) {
              navigate(`/chapters/${chapter.chapterNumber + 1}`);
            }
          }}
          disabled={chapter.chapterNumber === 12}
        >
          {language === "fr" ? "Chapitre suivant →" : "Next Chapter →"}
        </Button>
      </div>
    </div>
  );
}
