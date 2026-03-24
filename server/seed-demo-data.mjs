import mysql from "mysql2/promise";
import { config } from "dotenv";

config();

const pool = mysql.createPool({
  connectionLimit: 1,
  host: process.env.DATABASE_URL?.split("@")[1]?.split("/")[0] || "localhost",
  user: process.env.DATABASE_URL?.split("://")[1]?.split(":")[0] || "root",
  password: process.env.DATABASE_URL?.split(":")[2]?.split("@")[0] || "",
  database: process.env.DATABASE_URL?.split("/")[3]?.split("?")[0] || "rhcsa",
});

async function seedData() {
  const connection = await pool.getConnection();

  try {
    console.log("🌱 Seeding demo data...");

    // Insert Chapters
    const chapters = [
      {
        chapterNumber: 1,
        titleEn: "System Administration Fundamentals",
        titleFr: "Fondamentaux de l'Administration Système",
        descriptionEn: "Learn the basics of Linux system administration",
        descriptionFr: "Apprenez les bases de l'administration système Linux",
        order: 1,
      },
      {
        chapterNumber: 2,
        titleEn: "User and Group Management",
        titleFr: "Gestion des Utilisateurs et Groupes",
        descriptionEn: "Create and manage users and groups on Linux systems",
        descriptionFr:
          "Créez et gérez les utilisateurs et groupes sur les systèmes Linux",
        order: 2,
      },
      {
        chapterNumber: 3,
        titleEn: "File Systems and Storage",
        titleFr: "Systèmes de Fichiers et Stockage",
        descriptionEn:
          "Understand partitioning, LVM, and file system management",
        descriptionFr:
          "Comprenez le partitionnement, LVM et la gestion des systèmes de fichiers",
        order: 3,
      },
    ];

    for (const chapter of chapters) {
      await connection.query(
        "INSERT INTO chapters (chapterNumber, titleEn, titleFr, descriptionEn, descriptionFr, `order`) VALUES (?, ?, ?, ?, ?, ?)",
        [
          chapter.chapterNumber,
          chapter.titleEn,
          chapter.titleFr,
          chapter.descriptionEn,
          chapter.descriptionFr,
          chapter.order,
        ]
      );
    }
    console.log("✅ Chapters inserted");

    // Insert Commands
    const commands = [
      {
        nameEn: "ls",
        nameFr: "ls",
        descriptionEn: "List directory contents",
        descriptionFr: "Lister le contenu du répertoire",
        syntax: "ls [options] [directory]",
        optionsEn:
          "-l: long format\n-a: show hidden files\n-h: human readable sizes",
        optionsFr:
          "-l: format long\n-a: afficher les fichiers cachés\n-h: tailles lisibles",
        examplesEn: "ls -la /home",
        examplesFr: "ls -la /home",
        outputExample:
          "total 48\ndrwxr-xr-x 5 root root 4096 Mar 21 00:00 .\ndrwxr-xr-x 13 root root 4096 Mar 21 00:00 ..\ndrwxr-xr-x 2 user user 4096 Mar 21 00:00 user",
        chapterId: 1,
        difficulty: "beginner",
        order: 1,
      },
      {
        nameEn: "pwd",
        nameFr: "pwd",
        descriptionEn: "Print working directory",
        descriptionFr: "Afficher le répertoire de travail",
        syntax: "pwd [options]",
        optionsEn: "-L: logical directory\n-P: physical directory",
        optionsFr: "-L: répertoire logique\n-P: répertoire physique",
        examplesEn: "pwd",
        examplesFr: "pwd",
        outputExample: "/home/user",
        chapterId: 1,
        difficulty: "beginner",
        order: 2,
      },
      {
        nameEn: "cd",
        nameFr: "cd",
        descriptionEn: "Change directory",
        descriptionFr: "Changer de répertoire",
        syntax: "cd [directory]",
        optionsEn:
          "~: home directory\n..: parent directory\n-: previous directory",
        optionsFr:
          "~: répertoire personnel\n..: répertoire parent\n-: répertoire précédent",
        examplesEn: "cd /home\ncd ~\ncd ..",
        examplesFr: "cd /home\ncd ~\ncd ..",
        outputExample: "",
        chapterId: 1,
        difficulty: "beginner",
        order: 3,
      },
      {
        nameEn: "mkdir",
        nameFr: "mkdir",
        descriptionEn: "Make directories",
        descriptionFr: "Créer des répertoires",
        syntax: "mkdir [options] directory_name",
        optionsEn: "-p: create parent directories\n-m: set permissions",
        optionsFr:
          "-p: créer les répertoires parents\n-m: définir les permissions",
        examplesEn: "mkdir -p /path/to/dir",
        examplesFr: "mkdir -p /path/to/dir",
        outputExample: "",
        chapterId: 1,
        difficulty: "beginner",
        order: 4,
      },
      {
        nameEn: "useradd",
        nameFr: "useradd",
        descriptionEn: "Create new user accounts",
        descriptionFr: "Créer de nouveaux comptes utilisateur",
        syntax: "useradd [options] username",
        optionsEn:
          "-m: create home directory\n-M: do not create home directory\n-s: set login shell\n-u: set UID\n-g: set primary group\n-G: set supplementary groups\n-c: set comment\n-d: set home directory\n-e: set account expiration date\n-r: create system account",
        optionsFr:
          "-m: créer le répertoire personnel\n-M: ne pas créer le répertoire personnel\n-s: définir le shell\n-u: définir l'UID\n-g: définir le groupe principal\n-G: définir les groupes secondaires\n-c: définir le commentaire\n-d: définir le répertoire personnel\n-e: définir la date d'expiration du compte\n-r: créer un compte système",
        examplesEn: "useradd -m -s /bin/bash john",
        examplesFr: "useradd -m -s /bin/bash john",
        outputExample: "",
        chapterId: 2,
        difficulty: "intermediate",
        order: 1,
      },
      {
        nameEn: "userdel",
        nameFr: "userdel",
        descriptionEn: "Delete user accounts",
        descriptionFr: "Supprimer des comptes utilisateur",
        syntax: "userdel [options] username",
        optionsEn:
          "-r: remove home directory and mail spool\n-f: force deletion\n-Z: remove SELinux user mapping",
        optionsFr:
          "-r: supprimer le répertoire personnel et la boite mail\n-f: forcer la suppression\n-Z: supprimer le mapping SELinux de l'utilisateur",
        examplesEn: "userdel -r john",
        examplesFr: "userdel -r john",
        outputExample: "",
        chapterId: 2,
        difficulty: "intermediate",
        order: 2,
      },
      {
        nameEn: "fdisk",
        nameFr: "fdisk",
        descriptionEn: "Partition table editor",
        descriptionFr: "Éditeur de table de partition",
        syntax: "fdisk [options] device",
        optionsEn: "-l: list partitions\n-u: display in sectors",
        optionsFr: "-l: lister les partitions\n-u: afficher en secteurs",
        examplesEn: "fdisk -l /dev/sda",
        examplesFr: "fdisk -l /dev/sda",
        outputExample:
          "Disk /dev/sda: 100 GiB, 107374182400 bytes, 209715200 sectors",
        chapterId: 3,
        difficulty: "advanced",
        order: 1,
      },
      {
        nameEn: "mount",
        nameFr: "mount",
        descriptionEn: "Mount file systems",
        descriptionFr: "Monter des systèmes de fichiers",
        syntax: "mount [options] device mount_point",
        optionsEn: "-t: specify file system type\n-o: mount options",
        optionsFr:
          "-t: spécifier le type de système de fichiers\n-o: options de montage",
        examplesEn: "mount -t ext4 /dev/sda1 /mnt",
        examplesFr: "mount -t ext4 /dev/sda1 /mnt",
        outputExample: "",
        chapterId: 3,
        difficulty: "intermediate",
        order: 2,
      },
    ];

    for (const cmd of commands) {
      await connection.query(
        "INSERT INTO commands (nameEn, nameFr, descriptionEn, descriptionFr, syntax, optionsEn, optionsFr, examplesEn, examplesFr, outputExample, chapterId, difficulty, `order`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          cmd.nameEn,
          cmd.nameFr,
          cmd.descriptionEn,
          cmd.descriptionFr,
          cmd.syntax,
          cmd.optionsEn,
          cmd.optionsFr,
          cmd.examplesEn,
          cmd.examplesFr,
          cmd.outputExample,
          cmd.chapterId,
          cmd.difficulty,
          cmd.order,
        ]
      );
    }
    console.log("✅ Commands inserted");

    // Insert Labs
    const labs = [
      {
        titleEn: "User Creation and Basic Permissions",
        titleFr: "Création d'Utilisateurs et Permissions de Base",
        descriptionEn:
          "Learn to create users and manage basic file permissions",
        descriptionFr:
          "Apprenez à créer des utilisateurs et gérer les permissions de base",
        difficulty: "easy",
        estimatedDuration: 30,
        objectivesEn: "Create users, set permissions, understand chmod",
        objectivesFr:
          "Créer des utilisateurs, définir les permissions, comprendre chmod",
        order: 1,
        chapterId: 2,
      },
      {
        titleEn: "File System Navigation and Manipulation",
        titleFr: "Navigation et Manipulation du Système de Fichiers",
        descriptionEn:
          "Master file system navigation and basic file operations",
        descriptionFr:
          "Maîtrisez la navigation du système de fichiers et les opérations de base",
        difficulty: "easy",
        estimatedDuration: 25,
        objectivesEn:
          "Navigate directories, create/delete files, copy/move files",
        objectivesFr:
          "Naviguer dans les répertoires, créer/supprimer des fichiers",
        order: 2,
        chapterId: 1,
      },
      {
        titleEn: "LVM Configuration and Management",
        titleFr: "Configuration et Gestion de LVM",
        descriptionEn: "Configure and manage Logical Volume Management",
        descriptionFr: "Configurez et gérez la Gestion des Volumes Logiques",
        difficulty: "hard",
        estimatedDuration: 60,
        objectivesEn: "Create PV, VG, LV, resize volumes, manage snapshots",
        objectivesFr: "Créer PV, VG, LV, redimensionner les volumes",
        order: 3,
        chapterId: 3,
      },
    ];

    for (const lab of labs) {
      await connection.query(
        "INSERT INTO labs (titleEn, titleFr, descriptionEn, descriptionFr, difficulty, estimatedDuration, objectivesEn, objectivesFr, `order`, chapterId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          lab.titleEn,
          lab.titleFr,
          lab.descriptionEn,
          lab.descriptionFr,
          lab.difficulty,
          lab.estimatedDuration,
          lab.objectivesEn,
          lab.objectivesFr,
          lab.order,
          lab.chapterId,
        ]
      );
    }
    console.log("✅ Labs inserted");

    // Insert Exams
    const exams = [
      {
        titleEn: "Basic System Administration",
        titleFr: "Administration Système de Base",
        descriptionEn: "Test your knowledge of basic system administration",
        descriptionFr:
          "Testez vos connaissances en administration système de base",
        timeLimit: 60,
        totalQuestions: 20,
        passingScore: 70.0,
        order: 1,
      },
      {
        titleEn: "Networking and Services",
        titleFr: "Réseautage et Services",
        descriptionEn: "Test your knowledge of networking and services",
        descriptionFr: "Testez vos connaissances en réseautage et services",
        timeLimit: 60,
        totalQuestions: 20,
        passingScore: 70.0,
        order: 2,
      },
      {
        titleEn: "Full RHCSA Simulation",
        titleFr: "Simulation Complète RHCSA",
        descriptionEn: "Complete RHCSA exam simulation",
        descriptionFr: "Simulation complète d'examen RHCSA",
        timeLimit: 120,
        totalQuestions: 50,
        passingScore: 75.0,
        order: 5,
      },
    ];

    for (const exam of exams) {
      await connection.query(
        "INSERT INTO exams (titleEn, titleFr, descriptionEn, descriptionFr, timeLimit, totalQuestions, passingScore, `order`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
          exam.titleEn,
          exam.titleFr,
          exam.descriptionEn,
          exam.descriptionFr,
          exam.timeLimit,
          exam.totalQuestions,
          exam.passingScore,
          exam.order,
        ]
      );
    }
    console.log("✅ Exams inserted");

    // Insert Exam Questions
    const examQuestions = [
      {
        examId: 1,
        questionEn: "Which command is used to create a new user?",
        questionFr:
          "Quelle commande est utilisée pour créer un nouvel utilisateur?",
        optionsEn: JSON.stringify([
          "useradd",
          "adduser",
          "newuser",
          "createuser",
        ]),
        optionsFr: JSON.stringify([
          "useradd",
          "adduser",
          "newuser",
          "createuser",
        ]),
        correctAnswer: "A",
        explanationEn:
          "useradd is the standard command to create new user accounts",
        explanationFr:
          "useradd est la commande standard pour créer de nouveaux comptes utilisateur",
        difficulty: "easy",
        order: 1,
      },
      {
        examId: 1,
        questionEn: "What does the chmod command do?",
        questionFr: "Que fait la commande chmod?",
        optionsEn: JSON.stringify([
          "Change file permissions",
          "Change file owner",
          "Change file content",
          "Change file location",
        ]),
        optionsFr: JSON.stringify([
          "Modifier les permissions des fichiers",
          "Modifier le propriétaire du fichier",
          "Modifier le contenu du fichier",
          "Modifier l'emplacement du fichier",
        ]),
        correctAnswer: "A",
        explanationEn: "chmod is used to change file and directory permissions",
        explanationFr:
          "chmod est utilisé pour modifier les permissions des fichiers et répertoires",
        difficulty: "easy",
        order: 2,
      },
    ];

    for (const q of examQuestions) {
      await connection.query(
        "INSERT INTO examQuestions (examId, questionEn, questionFr, optionsEn, optionsFr, correctAnswer, explanationEn, explanationFr, difficulty, `order`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          q.examId,
          q.questionEn,
          q.questionFr,
          q.optionsEn,
          q.optionsFr,
          q.correctAnswer,
          q.explanationEn,
          q.explanationFr,
          q.difficulty,
          q.order,
        ]
      );
    }
    console.log("✅ Exam Questions inserted");

    // Insert Troubleshooting Scenarios
    const scenarios = [
      {
        titleEn: "User cannot login",
        titleFr: "L'utilisateur ne peut pas se connecter",
        symptomsEn: "Authentication failed, permission denied",
        symptomsFr: "Authentification échouée, permission refusée",
        diagnosticsEn:
          "Check user account status with id command, verify password with passwd, check sudoers file",
        diagnosticsFr:
          "Vérifiez l'état du compte utilisateur avec la commande id, vérifiez le mot de passe avec passwd",
        solutionEn: "Reset password, unlock account, check SSH configuration",
        solutionFr:
          "Réinitialisez le mot de passe, déverrouillez le compte, vérifiez la configuration SSH",
        difficulty: "easy",
        order: 1,
      },
      {
        titleEn: "File permission denied",
        titleFr: "Permission de fichier refusée",
        symptomsEn: "Cannot read/write file despite being owner",
        symptomsFr:
          "Impossible de lire/écrire le fichier malgré être propriétaire",
        diagnosticsEn:
          "Use ls -l to check permissions, check SELinux context with ls -Z",
        diagnosticsFr:
          "Utilisez ls -l pour vérifier les permissions, vérifiez le contexte SELinux avec ls -Z",
        solutionEn:
          "Use chmod to fix permissions, restore SELinux context with restorecon",
        solutionFr:
          "Utilisez chmod pour corriger les permissions, restaurez le contexte SELinux",
        difficulty: "easy",
        order: 2,
      },
    ];

    for (const scenario of scenarios) {
      await connection.query(
        "INSERT INTO troubleshootingScenarios (titleEn, titleFr, symptomsEn, symptomsFr, diagnosticsEn, diagnosticsFr, solutionEn, solutionFr, difficulty, `order`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          scenario.titleEn,
          scenario.titleFr,
          scenario.symptomsEn,
          scenario.symptomsFr,
          scenario.diagnosticsEn,
          scenario.diagnosticsFr,
          scenario.solutionEn,
          scenario.solutionFr,
          scenario.difficulty,
          scenario.order,
        ]
      );
    }
    console.log("✅ Troubleshooting Scenarios inserted");

    console.log("🎉 Demo data seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding data:", error);
  } finally {
    await connection.release();
    await pool.end();
  }
}

seedData();
