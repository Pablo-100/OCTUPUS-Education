import { useTranslation } from "@/_core/hooks/useTranslation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RotateCcw, Copy, Check } from "lucide-react";
import { useState } from "react";

interface TerminalCommand {
  prompt: string;
  input: string;
  output: string;
}

type FsNode = FsDirNode | FsFileNode;

interface FsBaseNode {
  name: string;
  type: "dir" | "file";
  perms: string;
  owner: string;
  group: string;
  mtime: string;
}

interface FsDirNode extends FsBaseNode {
  type: "dir";
  children: Record<string, FsNode>;
}

interface FsFileNode extends FsBaseNode {
  type: "file";
  content: string;
}

interface ShellState {
  fs: FsDirNode;
  user: string;
  hostname: string;
  cwd: string;
  commandHistory: string[];
}

interface LocalExecutionResult {
  known: boolean;
  shell: ShellState;
  output: string;
  clearScreen?: boolean;
}

const nowStamp = () => new Date().toISOString();

const makeDir = (
  name: string,
  children: Record<string, FsNode> = {}
): FsDirNode => ({
  name,
  type: "dir",
  perms: "rwxr-xr-x",
  owner: "user",
  group: "user",
  mtime: nowStamp(),
  children,
});

const makeFile = (name: string, content = ""): FsFileNode => ({
  name,
  type: "file",
  perms: "rw-r--r--",
  owner: "user",
  group: "user",
  mtime: nowStamp(),
  content,
});

const createInitialFs = (): FsDirNode =>
  makeDir("/", {
    home: makeDir("home", {
      student: makeDir("student", {
        "notes.txt": makeFile(
          "notes.txt",
          "Remember: exam 2h30m, practice LVM and SELinux."
        ),
        "readme.md": makeFile(
          "readme.md",
          "Try commands: lsblk, fdisk -l, pvs, vgs, lvs, systemctl status sshd."
        ),
        documents: makeDir("documents", {
          "rhcsa_notes.md": makeFile(
            "rhcsa_notes.md",
            "# RHCSA Notes\nchmod 755 file\npvcreate /dev/sdb\nvgcreate vg0 /dev/sdb"
          ),
        }),
        scripts: makeDir("scripts", {
          "backup.sh": makeFile(
            "backup.sh",
            "#!/bin/bash\ntar -czf /mnt/backup/home.tar.gz /home/student"
          ),
        }),
      }),
      alice: makeDir("alice", {}),
    }),
    etc: makeDir("etc", {
      passwd: makeFile(
        "passwd",
        "root:x:0:0:root:/root:/bin/bash\nstudent:x:1000:1000:Student:/home/student:/bin/bash\nalice:x:1001:1001:Alice:/home/alice:/bin/bash"
      ),
      hosts: makeFile("hosts", "127.0.0.1 localhost\n::1 localhost"),
      hostname: makeFile("hostname", "rhcsa-lab-01"),
      fstab: makeFile(
        "fstab",
        "/dev/sda1 / xfs defaults 0 0\n/dev/sda2 /boot xfs defaults 0 0"
      ),
    }),
    var: makeDir("var", {
      log: makeDir("log", {
        "messages.log": makeFile(
          "messages.log",
          "Mar 23 kernel: RHCSA simulator booted."
        ),
        secure: makeFile(
          "secure",
          "sshd[1024]: Started OpenSSH server daemon."
        ),
      }),
    }),
    tmp: makeDir("tmp"),
    mnt: makeDir("mnt", {
      data: makeDir("data", {}),
      backup: makeDir("backup", {}),
    }),
    root: makeDir("root", {
      ".bashrc": makeFile(".bashrc", "alias ll='ls -la'"),
    }),
  });

const createInitialShell = (): ShellState => ({
  fs: createInitialFs(),
  user: "student",
  hostname: "rhcsa-lab-01",
  cwd: "/home/student",
  commandHistory: [],
});

const cloneFs = (fs: FsDirNode): FsDirNode => JSON.parse(JSON.stringify(fs));

const tokenize = (command: string): string[] => {
  const regex = /"([^"\\]*(\\.[^"\\]*)*)"|'([^'\\]*(\\.[^'\\]*)*)'|\S+/g;
  const parts: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(command)) !== null) {
    const token = match[0];
    parts.push(token.replace(/^['"]|['"]$/g, ""));
  }
  return parts;
};

const resolvePath = (cwd: string, rawPath?: string, user = "student") => {
  const input = (rawPath || "").trim();
  if (!input || input === ".") return cwd;

  const absolute = input.startsWith("/")
    ? input
    : input.startsWith("~")
      ? input.replace(/^~/, `/home/${user}`)
      : `${cwd}/${input}`;

  const segments = absolute.split("/").filter(Boolean);
  const stack: string[] = [];

  segments.forEach(segment => {
    if (segment === ".") return;
    if (segment === "..") {
      stack.pop();
      return;
    }
    stack.push(segment);
  });

  return `/${stack.join("/")}` || "/";
};

const getNode = (root: FsDirNode, path: string): FsNode | null => {
  if (path === "/") return root;
  const parts = path.split("/").filter(Boolean);
  let current: FsNode = root;

  for (const part of parts) {
    if (current.type !== "dir") return null;
    current = current.children[part];
    if (!current) return null;
  }

  return current;
};

const getParentAndName = (
  root: FsDirNode,
  path: string
): { parent: FsDirNode | null; name: string } => {
  const parts = path.split("/").filter(Boolean);
  const name = parts.pop() || "";
  const parentPath = `/${parts.join("/")}` || "/";
  const parentNode = getNode(root, parentPath);
  return {
    parent: parentNode && parentNode.type === "dir" ? parentNode : null,
    name,
  };
};

const promptFromCwd = (cwd: string, user: string, hostname: string) => {
  const displayPath =
    cwd === `/home/${user}`
      ? "~"
      : cwd.replace(new RegExp(`^/home/${user}`), "~");
  return `${user}@${hostname}:${displayPath}$`;
};

const formatDate = (iso: string) => {
  const date = new Date(iso);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const fileSize = (node: FsNode) =>
  node.type === "file" ? node.content.length : 4096;

const octalToPerms = (octal: string) => {
  const map = ["---", "--x", "-w-", "-wx", "r--", "r-x", "rw-", "rwx"];
  if (!/^[0-7]{3}$/.test(octal)) return null;
  return octal
    .split("")
    .map(d => map[Number(d)])
    .join("");
};

const applySimpleSymbolicPerm = (existing: string, symbolic: string) => {
  const groups = {
    u: 0,
    g: 3,
    o: 6,
    a: -1,
  } as const;

  const match = symbolic.match(/^([ugoa]+)([+-])([rwx]+)$/);
  if (!match) return null;
  const [, who, op, perms] = match;
  const chars = existing.split("");

  const targets = who.includes("a") ? ["u", "g", "o"] : who.split("");
  const flags = {
    r: 0,
    w: 1,
    x: 2,
  } as const;

  for (const target of targets) {
    const start = groups[target as keyof typeof groups];
    for (const p of perms.split("")) {
      const idx = start + flags[p as keyof typeof flags];
      chars[idx] = op === "+" ? p : "-";
    }
  }

  return chars.join("");
};

const patternToRegex = (pattern: string) => {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped.replace(/\*/g, ".*")}$`);
};

const walkFs = (
  node: FsNode,
  path: string,
  visit: (node: FsNode, path: string) => void
) => {
  visit(node, path);
  if (node.type === "dir") {
    Object.values(node.children).forEach(child => {
      const childPath =
        path === "/" ? `/${child.name}` : `${path}/${child.name}`;
      walkFs(child, childPath, visit);
    });
  }
};

const localHelp = (language: "fr" | "en") =>
  language === "fr"
    ? [
        "Commandes RHCSA principales:",
        "  Navigation: ls, cd, pwd, find",
        "  Fichiers: touch, mkdir, rm, cp, mv, cat, head, tail, grep, wc, tar",
        "  Permissions: chmod, chown, stat",
        "  Users: useradd, userdel, passwd, groupadd, usermod, id, whoami, su",
        "  Services: systemctl [start|stop|restart|enable|disable|status|list-units]",
        "  Reseau: ip addr, ip route, ss, ping, firewall-cmd",
        "  SELinux: getenforce, setenforce, sestatus",
        "  Stockage/LVM: lsblk, fdisk -l, mount, mkfs, pvcreate, vgcreate, lvcreate, lvextend, pvs, vgs, lvs",
        "  Systeme: uname -a, hostname, date, uptime, df -h, free -h, ps aux, top, journalctl",
        "  Divers: env, export, alias, which, history, man, clear, reset-lab",
      ].join("\n")
    : [
        "Main RHCSA commands:",
        "  Navigation: ls, cd, pwd, find",
        "  Files: touch, mkdir, rm, cp, mv, cat, head, tail, grep, wc, tar",
        "  Permissions: chmod, chown, stat",
        "  Users: useradd, userdel, passwd, groupadd, usermod, id, whoami, su",
        "  Services: systemctl [start|stop|restart|enable|disable|status|list-units]",
        "  Network: ip addr, ip route, ss, ping, firewall-cmd",
        "  SELinux: getenforce, setenforce, sestatus",
        "  Storage/LVM: lsblk, fdisk -l, mount, mkfs, pvcreate, vgcreate, lvcreate, lvextend, pvs, vgs, lvs",
        "  System: uname -a, hostname, date, uptime, df -h, free -h, ps aux, top, journalctl",
        "  Misc: env, export, alias, which, history, man, clear, reset-lab",
      ].join("\n");

const BUILTIN_COMMANDS = [
  "ls",
  "cd",
  "pwd",
  "touch",
  "mkdir",
  "rm",
  "cp",
  "mv",
  "cat",
  "head",
  "tail",
  "grep",
  "find",
  "wc",
  "echo",
  "chmod",
  "chown",
  "stat",
  "useradd",
  "userdel",
  "passwd",
  "groupadd",
  "usermod",
  "id",
  "whoami",
  "who",
  "su",
  "systemctl",
  "ip",
  "ss",
  "ping",
  "firewall-cmd",
  "getenforce",
  "setenforce",
  "sestatus",
  "dnf",
  "yum",
  "rpm",
  "pvcreate",
  "vgcreate",
  "lvcreate",
  "lvextend",
  "pvs",
  "vgs",
  "lvs",
  "lsblk",
  "fdisk",
  "mount",
  "mkfs",
  "tar",
  "crontab",
  "journalctl",
  "df",
  "free",
  "ps",
  "top",
  "kill",
  "killall",
  "uname",
  "hostname",
  "date",
  "uptime",
  "env",
  "export",
  "alias",
  "which",
  "history",
  "man",
  "clear",
  "exit",
  "logout",
  "help",
  "reset-lab",
];

const commonPrefix = (values: string[]) => {
  if (values.length === 0) return "";
  let prefix = values[0];
  for (let i = 1; i < values.length; i += 1) {
    while (values[i].indexOf(prefix) !== 0 && prefix.length > 0) {
      prefix = prefix.slice(0, -1);
    }
  }
  return prefix;
};

const autocompleteInput = (currentInput: string, shell: ShellState) => {
  const endsWithSpace = /\s$/.test(currentInput);
  const parts = currentInput.split(/\s+/).filter(p => p.length > 0);
  const currentToken = endsWithSpace ? "" : parts[parts.length - 1] || "";

  if (parts.length <= 1 && !endsWithSpace) {
    const hits = BUILTIN_COMMANDS.filter(cmd => cmd.startsWith(currentToken));
    if (hits.length === 0) return currentInput;
    if (hits.length === 1) return `${hits[0]} `;
    const prefix = commonPrefix(hits);
    if (prefix.length > currentToken.length) return prefix;
    return currentInput;
  }

  const token = currentToken;
  const slashIndex = token.lastIndexOf("/");
  const rawDir = slashIndex >= 0 ? token.slice(0, slashIndex + 1) : "";
  const rawPrefix = slashIndex >= 0 ? token.slice(slashIndex + 1) : token;
  const baseDir = resolvePath(shell.cwd, rawDir || ".", shell.user);
  const baseNode = getNode(shell.fs, baseDir);
  if (!baseNode || baseNode.type !== "dir") return currentInput;

  const names = Object.keys(baseNode.children)
    .filter(n => n.startsWith(rawPrefix))
    .sort();

  if (names.length === 0) return currentInput;

  const buildReplacement = (name: string) => {
    const n = baseNode.children[name];
    const suffix = n.type === "dir" ? "/" : " ";
    return `${rawDir}${name}${suffix}`;
  };

  if (names.length === 1) {
    const replacement = buildReplacement(names[0]);
    if (endsWithSpace) return `${currentInput}${replacement}`;
    return `${parts.slice(0, -1).join(" ")}${parts.length > 1 ? " " : ""}${replacement}`;
  }

  const prefix = commonPrefix(names);
  if (prefix.length > rawPrefix.length) {
    const replacement = `${rawDir}${prefix}`;
    if (endsWithSpace) return `${currentInput}${replacement}`;
    return `${parts.slice(0, -1).join(" ")}${parts.length > 1 ? " " : ""}${replacement}`;
  }

  return currentInput;
};

const executeLocalCommand = (
  raw: string,
  shell: ShellState,
  language: "fr" | "en"
): LocalExecutionResult => {
  const text = raw.trim();
  if (!text) {
    return { known: true, shell, output: "" };
  }

  const tokens = tokenize(text);
  if (tokens.length === 0) {
    return { known: true, shell, output: "" };
  }

  let effective = [...tokens];
  if (
    (effective[0] === "sudo" || effective[0] === "time") &&
    effective.length > 1
  ) {
    effective = effective.slice(1);
  }

  const command = effective[0];
  const args = effective.slice(1);
  const fs = cloneFs(shell.fs);

  const fail = (msgEn: string, msgFr?: string): LocalExecutionResult => ({
    known: true,
    shell,
    output: language === "fr" ? msgFr || msgEn : msgEn,
  });

  if (command === "help") {
    return { known: true, shell, output: localHelp(language) };
  }

  if (command === "clear") {
    return { known: true, shell, output: "", clearScreen: true };
  }

  if (command === "reset-lab") {
    return {
      known: true,
      shell: createInitialShell(),
      output:
        language === "fr"
          ? "Environnement terminal reinitialise."
          : "Terminal environment reset.",
      clearScreen: true,
    };
  }

  if (command === "pwd") {
    return { known: true, shell, output: shell.cwd };
  }

  if (command === "whoami") {
    return { known: true, shell, output: shell.user };
  }

  if (command === "id") {
    const who = args[0] || shell.user;
    if (who === "root") {
      return {
        known: true,
        shell,
        output: "uid=0(root) gid=0(root) groups=0(root)",
      };
    }
    return {
      known: true,
      shell,
      output: `uid=1000(${who}) gid=1000(${who}) groups=1000(${who}),10(wheel)`,
    };
  }

  if (command === "who") {
    return {
      known: true,
      shell,
      output: `${shell.user}  pts/0  ${formatDate(nowStamp())} (:0)`,
    };
  }

  if (command === "hostname") {
    if (args.length > 0) {
      return {
        known: true,
        shell: { ...shell, hostname: args[0] },
        output:
          language === "fr"
            ? `Hostname change: ${args[0]}`
            : `Hostname set to ${args[0]}`,
      };
    }
    return { known: true, shell, output: shell.hostname };
  }

  if (command === "date") {
    return { known: true, shell, output: new Date().toString() };
  }

  if (command === "uname") {
    if (args[0] === "-a") {
      return {
        known: true,
        shell,
        output: `Linux ${shell.hostname} 5.14.0-362.8.1.el9_3.x86_64 #1 SMP PREEMPT_DYNAMIC x86_64 x86_64 x86_64 GNU/Linux`,
      };
    }
    return { known: true, shell, output: "Linux" };
  }

  if (command === "uptime") {
    return {
      known: true,
      shell,
      output:
        " 14:32:10 up 2 days,  4:17,  1 user,  load average: 0.15, 0.12, 0.09",
    };
  }

  if (command === "df") {
    return {
      known: true,
      shell,
      output: [
        "Filesystem      Size  Used Avail Use% Mounted on",
        "/dev/sda1       50G  8.2G   42G  17% /",
        "tmpfs           3.9G     0  3.9G   0% /dev/shm",
      ].join("\n"),
    };
  }

  if (command === "free") {
    return {
      known: true,
      shell,
      output: [
        "              total        used        free      shared  buff/cache   available",
        "Mem:          8192Mi      2415Mi      3204Mi        78Mi      2571Mi      5453Mi",
        "Swap:         2048Mi         0Mi      2048Mi",
      ].join("\n"),
    };
  }

  if (command === "ip") {
    const sub = args[0];
    if (sub === "addr" || sub === "a") {
      return {
        known: true,
        shell,
        output: [
          "1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 state UNKNOWN",
          "    inet 127.0.0.1/8 scope host lo",
          "2: ens3: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 state UP",
          "    inet 192.168.122.100/24 brd 192.168.122.255 scope global ens3",
        ].join("\n"),
      };
    }
    if (sub === "route" || sub === "r") {
      return {
        known: true,
        shell,
        output: [
          "default via 192.168.122.1 dev ens3",
          "192.168.122.0/24 dev ens3 proto kernel",
        ].join("\n"),
      };
    }
    return {
      known: true,
      shell,
      output:
        language === "fr"
          ? "Usage: ip [addr|route|link]"
          : "Usage: ip [addr|route|link]",
    };
  }

  if (command === "ss") {
    return {
      known: true,
      shell,
      output: [
        "Netid State  Recv-Q Send-Q  Local Address:Port  Peer Address:Port",
        "tcp   LISTEN 0      128          0.0.0.0:22         0.0.0.0:*",
      ].join("\n"),
    };
  }

  if (command === "ping") {
    const host = args.find(a => !a.startsWith("-")) || "localhost";
    return {
      known: true,
      shell,
      output: [
        `PING ${host} 56(84) bytes of data.`,
        `64 bytes from ${host}: icmp_seq=1 ttl=64 time=23.121 ms`,
        `64 bytes from ${host}: icmp_seq=2 ttl=64 time=22.842 ms`,
        `--- ${host} ping statistics ---`,
        "2 packets transmitted, 2 received, 0% packet loss",
      ].join("\n"),
    };
  }

  if (command === "firewall-cmd") {
    if (args.includes("--list-all")) {
      return {
        known: true,
        shell,
        output: [
          "public (active)",
          "  services: cockpit dhcpv6-client ssh",
          "  ports: 8080/tcp",
        ].join("\n"),
      };
    }
    if (args.includes("--state"))
      return { known: true, shell, output: "running" };
    if (args.find(a => a.startsWith("--add-")) || args.includes("--reload")) {
      return { known: true, shell, output: "success" };
    }
    return {
      known: true,
      shell,
      output:
        "firewall-cmd [--list-all|--add-service=|--add-port=|--permanent|--reload|--state]",
    };
  }

  if (command === "getenforce")
    return { known: true, shell, output: "Enforcing" };
  if (command === "setenforce")
    return {
      known: true,
      shell,
      output:
        args[0] === "0"
          ? "SELinux set to Permissive"
          : "SELinux set to Enforcing",
    };
  if (command === "sestatus") {
    return {
      known: true,
      shell,
      output: [
        "SELinux status:                 enabled",
        "Current mode:                   enforcing",
        "Mode from config file:          enforcing",
      ].join("\n"),
    };
  }

  if (command === "dnf" || command === "yum") {
    const action = args[0];
    const pkg = args
      .slice(1)
      .filter(a => !a.startsWith("-"))
      .join(" ");
    if (action === "install")
      return { known: true, shell, output: `Installing: ${pkg}\nComplete!` };
    if (action === "remove")
      return { known: true, shell, output: `Removing: ${pkg}\nComplete!` };
    if (action === "update")
      return {
        known: true,
        shell,
        output: "Checking for updates...\nComplete! No packages were upgraded.",
      };
    return {
      known: true,
      shell,
      output: `${command} [install|remove|update|list|search] <package>`,
    };
  }

  if (command === "rpm") {
    if (args[0] === "-qa") {
      return {
        known: true,
        shell,
        output: "bash-5.1.8\nvim-9.0\nsystemd-252\nkernel-5.14.0",
      };
    }
    if (args[0] === "-q" && args[1]) {
      return { known: true, shell, output: `${args[1]}-1.0.0-1.el9.x86_64` };
    }
    return { known: true, shell, output: "rpm [-qa|-q package]" };
  }

  if (command === "systemctl") {
    const action = args[0];
    const service = args[1] || "";
    if (action === "status") {
      return {
        known: true,
        shell,
        output: [
          `● ${service}.service - ${service || "service"}`,
          `   Loaded: loaded (/usr/lib/systemd/system/${service}.service; enabled)`,
          "   Active: active (running) since Mon 2024-01-15 08:00:00 UTC; 1 day 6h ago",
          `  Main PID: 1024 (${service || "service"})`,
        ].join("\n"),
      };
    }
    if (
      [
        "start",
        "stop",
        "restart",
        "enable",
        "disable",
        "daemon-reload",
      ].includes(action)
    ) {
      return { known: true, shell, output: "success" };
    }
    if (action === "list-units") {
      return {
        known: true,
        shell,
        output: [
          "UNIT                LOAD   ACTIVE SUB     DESCRIPTION",
          "sshd.service        loaded active running OpenSSH server daemon",
          "firewalld.service   loaded active running Firewall daemon",
          "crond.service       loaded active running Command Scheduler",
        ].join("\n"),
      };
    }
    return {
      known: true,
      shell,
      output:
        "systemctl [start|stop|restart|enable|disable|status|list-units|daemon-reload] <service>",
    };
  }

  if (command === "pvcreate")
    return {
      known: true,
      shell,
      output: `Physical volume "${args[0] || "/dev/sdb"}" successfully created.`,
    };
  if (command === "vgcreate")
    return {
      known: true,
      shell,
      output: `Volume group "${args[0] || "vg0"}" successfully created.`,
    };
  if (command === "lvcreate")
    return {
      known: true,
      shell,
      output: `Logical volume "${args[args.indexOf("-n") + 1] || "lv0"}" created.`,
    };
  if (command === "lvextend")
    return {
      known: true,
      shell,
      output: "Size of logical volume successfully resized.",
    };
  if (command === "pvs")
    return {
      known: true,
      shell,
      output:
        "PV         VG   Fmt  Attr PSize   PFree\n/dev/sdb   vg0  lvm2 a--  20.00g  10.00g",
    };
  if (command === "vgs")
    return {
      known: true,
      shell,
      output:
        "VG   #PV #LV Attr   VSize   VFree\nvg0    1   1 wz--n- 20.00g  10.00g",
    };
  if (command === "lvs")
    return {
      known: true,
      shell,
      output: "LV   VG   Attr       LSize\nlv0  vg0  -wi-a----- 10.00g",
    };

  if (command === "lsblk") {
    return {
      known: true,
      shell,
      output: [
        "NAME   MAJ:MIN RM SIZE RO TYPE MOUNTPOINTS",
        "sda      8:0    0  50G  0 disk",
        "|-sda1   8:1    0  49G  0 part /",
        "`-sda2   8:2    0   1G  0 part /boot",
        "sdb      8:16   0  20G  0 disk",
      ].join("\n"),
    };
  }

  if (command === "fdisk") {
    if (args[0] === "-l") {
      return {
        known: true,
        shell,
        output: [
          "Disk /dev/sda: 50 GiB, 53687091200 bytes, 104857600 sectors",
          "Units: sectors of 1 * 512 = 512 bytes",
          "Sector size (logical/physical): 512 bytes / 512 bytes",
          "I/O size (minimum/optimal): 512 bytes / 512 bytes",
          "Disklabel type: dos",
          "Disk identifier: 0x6c3f88af",
          "",
          "Device     Boot   Start       End   Sectors Size Id Type",
          "/dev/sda1 *       2048 102760447 102758400  49G 83 Linux",
          "/dev/sda2      102760448 104857599   2097152   1G 83 Linux",
          "",
          "Disk /dev/sdb: 20 GiB, 21474836480 bytes, 41943040 sectors",
          "Units: sectors of 1 * 512 = 512 bytes",
          "Sector size (logical/physical): 512 bytes / 512 bytes",
          "I/O size (minimum/optimal): 512 bytes / 512 bytes",
          "Disklabel type: dos",
          "Disk identifier: 0x9af14cb1",
        ].join("\n"),
      };
    }

    return {
      known: true,
      shell,
      output: language === "fr" ? "Utilisation: fdisk -l" : "Usage: fdisk -l",
    };
  }

  if (command === "ps") {
    return {
      known: true,
      shell,
      output: [
        "USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND",
        "root         1  0.0  0.2  22512  4160 ?        Ss   09:00   0:00 /sbin/init",
        "user       204  0.0  0.1  10972  2400 pts/0    Ss   09:00   0:00 -bash",
      ].join("\n"),
    };
  }

  if (command === "top") {
    return {
      known: true,
      shell,
      output: [
        `top - ${new Date().toTimeString().slice(0, 8)} up 2 days, 4:17, 1 user, load average: 0.15, 0.12, 0.09`,
        "Tasks: 127 total,   2 running, 125 sleeping,   0 stopped,   0 zombie",
        "%Cpu(s):  1.2 us,  0.5 sy, 98.1 id,  0.2 wa",
      ].join("\n"),
    };
  }

  if (command === "history") {
    const lines = shell.commandHistory.map((h, i) => `${i + 1}  ${h}`);
    return { known: true, shell, output: lines.join("\n") };
  }

  if (command === "ls") {
    const showAll =
      args.includes("-a") || args.includes("-la") || args.includes("-al");
    const longFormat =
      args.includes("-l") || args.includes("-la") || args.includes("-al");
    const pathArg = args.find(a => !a.startsWith("-"));
    const targetPath = resolvePath(shell.cwd, pathArg, shell.user);
    const node = getNode(fs, targetPath);
    if (!node)
      return fail(`ls: cannot access '${pathArg}': No such file or directory`);

    if (node.type === "file") {
      if (longFormat) {
        const row = `-${node.perms} 1 ${node.owner} ${node.group} ${fileSize(node)} ${formatDate(node.mtime)} ${node.name}`;
        return { known: true, shell, output: row };
      }
      return { known: true, shell, output: node.name };
    }

    const names = Object.keys(node.children)
      .filter(n => showAll || !n.startsWith("."))
      .sort();

    if (longFormat) {
      const rows = names.map(name => {
        const child = node.children[name];
        const typeChar = child.type === "dir" ? "d" : "-";
        return `${typeChar}${child.perms} 1 ${child.owner} ${child.group} ${fileSize(child)} ${formatDate(child.mtime)} ${name}`;
      });
      return { known: true, shell, output: rows.join("\n") };
    }

    return { known: true, shell, output: names.join("  ") };
  }

  if (command === "cd") {
    const targetPath = resolvePath(shell.cwd, args[0] || "~", shell.user);
    const node = getNode(fs, targetPath);
    if (!node || node.type !== "dir") {
      return fail(`cd: ${args[0] || "~"}: No such file or directory`);
    }
    return { known: true, shell: { ...shell, cwd: targetPath }, output: "" };
  }

  if (command === "mkdir") {
    const recursive = args.includes("-p");
    const targets = args.filter(a => !a.startsWith("-"));
    if (targets.length === 0) return fail("mkdir: missing operand");

    for (const t of targets) {
      const abs = resolvePath(shell.cwd, t, shell.user);
      const parts = abs.split("/").filter(Boolean);
      let current: FsDirNode = fs;
      let created = false;

      for (const part of parts) {
        const existing = current.children[part];
        if (!existing) {
          if (!recursive && part !== parts[parts.length - 1]) {
            return fail(
              `mkdir: cannot create directory '${t}': No such file or directory`
            );
          }
          current.children[part] = makeDir(part);
          created = true;
        } else if (existing.type !== "dir") {
          return fail(`mkdir: cannot create directory '${t}': Not a directory`);
        }

        const next = current.children[part];
        if (!next || next.type !== "dir") {
          return fail(`mkdir: cannot create directory '${t}': Not a directory`);
        }
        current = next;
      }

      if (!recursive && !created) {
        return fail(`mkdir: cannot create directory '${t}': File exists`);
      }
    }

    return { known: true, shell: { ...shell, fs }, output: "" };
  }

  if (command === "touch") {
    if (args.length === 0) return fail("touch: missing file operand");
    for (const t of args) {
      const abs = resolvePath(shell.cwd, t, shell.user);
      const existing = getNode(fs, abs);
      if (existing) {
        existing.mtime = nowStamp();
        continue;
      }
      const { parent, name } = getParentAndName(fs, abs);
      if (!parent || !name)
        return fail(`touch: cannot touch '${t}': No such file or directory`);
      parent.children[name] = makeFile(name, "");
    }
    return { known: true, shell: { ...shell, fs }, output: "" };
  }

  if (command === "cat") {
    if (args.length === 0) return fail("cat: missing file operand");
    const chunks: string[] = [];
    for (const t of args) {
      const abs = resolvePath(shell.cwd, t, shell.user);
      const node = getNode(fs, abs);
      if (!node) return fail(`cat: ${t}: No such file or directory`);
      if (node.type !== "file") return fail(`cat: ${t}: Is a directory`);
      chunks.push(node.content);
    }
    return { known: true, shell, output: chunks.join("\n") };
  }

  if (command === "echo") {
    const redirectIndex = args.findIndex(a => a === ">" || a === ">>");
    if (redirectIndex >= 0) {
      const mode = args[redirectIndex];
      const textValue = args.slice(0, redirectIndex).join(" ");
      const filePath = args[redirectIndex + 1];
      if (!filePath) return fail("echo: missing redirection target");

      const abs = resolvePath(shell.cwd, filePath, shell.user);
      const existing = getNode(fs, abs);
      if (existing && existing.type === "dir")
        return fail(`echo: ${filePath}: Is a directory`);
      if (existing && existing.type === "file") {
        existing.content =
          mode === ">>"
            ? `${existing.content}${existing.content ? "\n" : ""}${textValue}`
            : textValue;
        existing.mtime = nowStamp();
      } else {
        const { parent, name } = getParentAndName(fs, abs);
        if (!parent || !name)
          return fail(`echo: ${filePath}: No such file or directory`);
        parent.children[name] = makeFile(name, textValue);
      }

      return { known: true, shell: { ...shell, fs }, output: "" };
    }

    return { known: true, shell, output: args.join(" ") };
  }

  if (command === "rm") {
    const recursive =
      args.includes("-r") || args.includes("-rf") || args.includes("-fr");
    const force =
      args.includes("-f") || args.includes("-rf") || args.includes("-fr");
    const targets = args.filter(a => !a.startsWith("-"));
    if (targets.length === 0) return fail("rm: missing operand");

    for (const t of targets) {
      const abs = resolvePath(shell.cwd, t, shell.user);
      if (abs === "/")
        return fail("rm: cannot remove '/': Operation not permitted");
      const { parent, name } = getParentAndName(fs, abs);
      if (!parent || !name || !parent.children[name]) {
        if (!force)
          return fail(`rm: cannot remove '${t}': No such file or directory`);
        continue;
      }
      const node = parent.children[name];
      if (node.type === "dir" && !recursive) {
        return fail(`rm: cannot remove '${t}': Is a directory`);
      }
      delete parent.children[name];
    }

    return { known: true, shell: { ...shell, fs }, output: "" };
  }

  if (command === "cp" || command === "mv") {
    if (args.length < 2) return fail(`${command}: missing file operand`);
    const srcPath = resolvePath(shell.cwd, args[0], shell.user);
    const dstPath = resolvePath(shell.cwd, args[1], shell.user);
    const srcNode = getNode(fs, srcPath);
    if (!srcNode)
      return fail(
        `${command}: cannot stat '${args[0]}': No such file or directory`
      );
    if (srcNode.type === "dir") {
      return fail(
        `${command}: -r not specified; omitting directory '${args[0]}'`
      );
    }

    const { parent: dstParent, name: dstName } = getParentAndName(fs, dstPath);
    if (!dstParent || !dstName)
      return fail(`${command}: cannot create regular file '${args[1]}'`);

    dstParent.children[dstName] = makeFile(dstName, srcNode.content);
    dstParent.children[dstName].perms = srcNode.perms;
    dstParent.children[dstName].owner = srcNode.owner;
    dstParent.children[dstName].group = srcNode.group;

    if (command === "mv") {
      const { parent: srcParent, name: srcName } = getParentAndName(
        fs,
        srcPath
      );
      if (srcParent && srcName) delete srcParent.children[srcName];
    }

    return { known: true, shell: { ...shell, fs }, output: "" };
  }

  if (command === "chmod") {
    if (args.length < 2) return fail("chmod: missing operand");
    const mode = args[0];
    const targetPath = resolvePath(shell.cwd, args[1], shell.user);
    const node = getNode(fs, targetPath);
    if (!node)
      return fail(
        `chmod: cannot access '${args[1]}': No such file or directory`
      );

    const octalPerms = octalToPerms(mode);
    if (octalPerms) {
      node.perms = octalPerms;
      node.mtime = nowStamp();
      return { known: true, shell: { ...shell, fs }, output: "" };
    }

    const symbolicPerms = applySimpleSymbolicPerm(node.perms, mode);
    if (symbolicPerms) {
      node.perms = symbolicPerms;
      node.mtime = nowStamp();
      return { known: true, shell: { ...shell, fs }, output: "" };
    }

    return fail(`chmod: invalid mode: '${mode}'`);
  }

  if (command === "chown") {
    if (args.length < 2) return fail("chown: missing operand");
    const [ownerRaw, targetRaw] = args;
    const [owner, group] = ownerRaw.split(":");
    const node = getNode(fs, resolvePath(shell.cwd, targetRaw, shell.user));
    if (!node)
      return fail(
        `chown: cannot access '${targetRaw}': No such file or directory`
      );
    node.owner = owner || node.owner;
    node.group = group || node.group;
    node.mtime = nowStamp();
    return { known: true, shell: { ...shell, fs }, output: "" };
  }

  if (command === "grep") {
    if (args.length < 2) return fail("grep: missing pattern or file");
    const pattern = args[0];
    const node = getNode(fs, resolvePath(shell.cwd, args[1], shell.user));
    if (!node) return fail(`grep: ${args[1]}: No such file or directory`);
    if (node.type !== "file") return fail(`grep: ${args[1]}: Is a directory`);
    const regex = new RegExp(pattern, "i");
    const lines = node.content.split("\n").filter(line => regex.test(line));
    return { known: true, shell, output: lines.join("\n") };
  }

  if (command === "find") {
    const basePathArg = args[0] && !args[0].startsWith("-") ? args[0] : ".";
    const basePath = resolvePath(shell.cwd, basePathArg, shell.user);
    const baseNode = getNode(fs, basePath);
    if (!baseNode || baseNode.type !== "dir") {
      return fail(`find: '${basePathArg}': No such file or directory`);
    }

    const nameIndex = args.findIndex(a => a === "-name");
    const pattern = nameIndex >= 0 ? args[nameIndex + 1] : "*";
    const regex = patternToRegex(pattern || "*");
    const found: string[] = [];

    walkFs(baseNode, basePath, (node, path) => {
      if (regex.test(node.name) || (path === basePath && regex.test("."))) {
        found.push(path);
      }
    });

    return { known: true, shell, output: found.join("\n") };
  }

  if (command === "man") {
    const topic = args[0] || "help";
    const manPages: Record<string, string> = {
      ls: "ls - list directory contents\nUsage: ls [-la] [path]",
      cd: "cd - change directory\nUsage: cd [path]",
      chmod:
        "chmod [OPTION]... MODE[,MODE]... FILE...\n  Octal: 4=r, 2=w, 1=x -> chmod 755 file\n  Symbolic: [ugoa][+-=][rwx] -> chmod u+x file\n  -R recursive",
      grep: "grep - print lines matching a pattern\nUsage: grep pattern file",
      useradd:
        "useradd [OPTIONS] LOGIN\n  -m create home directory\n  -s login shell (e.g. /bin/bash)\n  -G supplementary groups\n  -u user ID",
      systemctl:
        "systemctl COMMAND [UNIT]\n  start|stop|restart UNIT\n  enable|disable UNIT\n  status [UNIT]\n  list-units",
      lvcreate:
        "lvcreate -L SIZE -n NAME VG\n  Example: lvcreate -L 10G -n lv0 vg0\n  -l use LE percentage: lvcreate -l 100%FREE -n lv0 vg0",
      crontab:
        "crontab [-l|-e|-r]\n  Format: min hour day month weekday command\n  0 2 * * * cmd -> daily at 2am",
      find: "find [PATH] [EXPRESSION]\n  -name pattern (e.g. '*.conf')\n  -type f|d\n  -perm mode\n  -exec cmd {} \\;",
    };
    return {
      known: true,
      shell,
      output:
        manPages[topic] ||
        (language === "fr"
          ? `Aucune page manuel pour ${topic}`
          : `No manual entry for ${topic}`),
    };
  }

  if (command === "stat") {
    if (args.length < 1) return fail("stat: missing operand");
    const p = resolvePath(shell.cwd, args[0], shell.user);
    const n = getNode(fs, p);
    if (!n)
      return fail(`stat: cannot statx '${args[0]}': No such file or directory`);
    const fType = n.type === "dir" ? "directory" : "regular file";
    return {
      known: true,
      shell,
      output: [
        `File: ${p}`,
        `Size: ${fileSize(n)}  Type: ${fType}`,
        `Access: (${n.perms})`,
        `Uid: ${n.owner}  Gid: ${n.group}`,
      ].join("\n"),
    };
  }

  if (command === "useradd") {
    if (args.length < 1) return fail("useradd: specify username");
    const username = args[args.length - 1];
    const homePath = `/home/${username}`;
    if (getNode(fs, homePath))
      return fail(`useradd: user '${username}' already exists`);
    const homeRoot = getNode(fs, "/home");
    if (!homeRoot || homeRoot.type !== "dir")
      return fail("useradd: /home missing");
    homeRoot.children[username] = makeDir(username, {
      ".bashrc": makeFile(".bashrc", `# .bashrc for ${username}`),
    });
    return {
      known: true,
      shell: { ...shell, fs },
      output: `User ${username} created with home ${homePath}`,
    };
  }

  if (command === "userdel") {
    if (args.length < 1) return fail("userdel: specify username");
    const username = args[args.length - 1];
    const homeRoot = getNode(fs, "/home");
    if (!homeRoot || homeRoot.type !== "dir" || !homeRoot.children[username]) {
      return fail(`userdel: user '${username}' does not exist`);
    }
    delete homeRoot.children[username];
    return {
      known: true,
      shell: { ...shell, fs },
      output: `User ${username} removed`,
    };
  }

  if (command === "passwd") {
    const who = args[0] || shell.user;
    return {
      known: true,
      shell,
      output: [
        `Changing password for user ${who}.`,
        "New password: [simulated - hidden]",
        "passwd: all authentication tokens updated successfully.",
      ].join("\n"),
    };
  }

  if (command === "groupadd") {
    const g = args[args.length - 1] || "group";
    return { known: true, shell, output: `Group ${g} created` };
  }

  if (command === "usermod") {
    const u = args[args.length - 1] || "user";
    return { known: true, shell, output: `User ${u} modified` };
  }

  if (command === "su") {
    const nextUser = args[0] || "root";
    const home = nextUser === "root" ? "/root" : `/home/${nextUser}`;
    const nextHome = getNode(fs, home);
    const nextCwd = nextHome && nextHome.type === "dir" ? home : shell.cwd;
    return {
      known: true,
      shell: { ...shell, user: nextUser, cwd: nextCwd },
      output: `Switched to user ${nextUser}`,
    };
  }

  if (command === "exit" || command === "logout") {
    if (shell.user !== "student") {
      return {
        known: true,
        shell: { ...shell, user: "student", cwd: "/home/student" },
        output: "logout",
      };
    }
    return { known: true, shell, output: "exit - bye!" };
  }

  if (command === "mount") {
    if (args.length === 0) {
      return {
        known: true,
        shell,
        output: [
          "/dev/sda1 on / type xfs (rw,relatime)",
          "tmpfs on /dev/shm type tmpfs (rw,nosuid,nodev)",
        ].join("\n"),
      };
    }
    return {
      known: true,
      shell,
      output: `Mounted ${args[0]} on ${args[1] || "/mnt"}`,
    };
  }

  if (command === "mkfs")
    return {
      known: true,
      shell,
      output: "Writing superblocks and filesystem accounting information: done",
    };
  if (command === "tar") {
    const joined = args.join("");
    if (joined.includes("c"))
      return { known: true, shell, output: "Archive created" };
    if (joined.includes("x"))
      return { known: true, shell, output: "Archive extracted" };
    if (joined.includes("t"))
      return {
        known: true,
        shell,
        output: "./\n./home/\n./home/student/\n./home/student/notes.txt",
      };
    return { known: true, shell, output: "tar [ctx]f archive [path]" };
  }

  if (command === "crontab") {
    if (args.includes("-l")) {
      return {
        known: true,
        shell,
        output:
          "# RHCSA Lab crontab\n0 2 * * * /home/student/scripts/backup.sh >> /var/log/backup.log 2>&1",
      };
    }
    if (args.includes("-e"))
      return {
        known: true,
        shell,
        output: "[Opening crontab in editor - simulated]",
      };
    if (args.includes("-r"))
      return { known: true, shell, output: "Crontab removed" };
    return { known: true, shell, output: "crontab [-l|-e|-r]" };
  }

  if (command === "journalctl") {
    return {
      known: true,
      shell,
      output:
        "-- Logs begin at Mon 2024-01-15 08:00:00 UTC --\nJan 16 14:55 rhcsa-lab-01 systemd[1]: Started sshd.service.",
    };
  }

  if (command === "wc") {
    const file = args.filter(a => !a.startsWith("-")).pop();
    if (!file) return fail("wc: missing file operand");
    const p = resolvePath(shell.cwd, file, shell.user);
    const n = getNode(fs, p);
    if (!n || n.type !== "file")
      return fail(`wc: ${file}: No such file or directory`);
    const lines = n.content.split("\n").length;
    const words = n.content.split(/\s+/).filter(Boolean).length;
    return {
      known: true,
      shell,
      output: `${lines} ${words} ${n.content.length} ${file}`,
    };
  }

  if (command === "head" || command === "tail") {
    const count = args.includes("-n")
      ? Number(args[args.indexOf("-n") + 1]) || 10
      : 10;
    const file = args.filter(a => !a.startsWith("-") && !/^\d+$/.test(a)).pop();
    if (!file) return fail(`${command}: missing file operand`);
    const p = resolvePath(shell.cwd, file, shell.user);
    const n = getNode(fs, p);
    if (!n || n.type !== "file")
      return fail(`${command}: ${file}: No such file or directory`);
    const lines = n.content.split("\n");
    const out =
      command === "head" ? lines.slice(0, count) : lines.slice(-count);
    return { known: true, shell, output: out.join("\n") };
  }

  if (command === "alias") {
    if (args.length === 0) {
      return {
        known: true,
        shell,
        output: "alias ll='ls -la'\nalias grep='grep --color=auto'",
      };
    }
    return { known: true, shell, output: `Alias: ${args.join(" ")}` };
  }

  if (command === "env") {
    return {
      known: true,
      shell,
      output: [
        `HOME=/home/${shell.user}`,
        `USER=${shell.user}`,
        "SHELL=/bin/bash",
        "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin",
        `PWD=${shell.cwd}`,
        `HOSTNAME=${shell.hostname}`,
      ].join("\n"),
    };
  }

  if (command === "export")
    return { known: true, shell, output: `Exported: ${args.join(" ")}` };

  if (command === "which") {
    const paths: Record<string, string> = {
      ls: "/usr/bin/ls",
      bash: "/usr/bin/bash",
      vim: "/usr/bin/vim",
      useradd: "/usr/sbin/useradd",
      chmod: "/usr/bin/chmod",
      ssh: "/usr/bin/ssh",
    };
    if (paths[args[0]]) return { known: true, shell, output: paths[args[0]] };
    return { known: true, shell, output: `which: no ${args[0] || ""} in PATH` };
  }

  if (command === "kill" || command === "killall") {
    const target = args.find(a => !a.startsWith("-")) || "";
    return { known: true, shell, output: `Signal sent to ${target}` };
  }

  return {
    known: false,
    shell,
    output: "",
  };
};

export default function Terminal() {
  const { t, language } = useTranslation();
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<TerminalCommand[]>([]);
  const [shell, setShell] = useState<ShellState>(createInitialShell());
  const [historyCursor, setHistoryCursor] = useState<number>(-1);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const { data: commandsList } = trpc.commands.list.useQuery({});
  const terminalStatus = trpc.terminal.status.useQuery();
  const executeMutation = trpc.terminal.execute.useMutation();
  const resetMutation = trpc.terminal.reset.useMutation({
    onSuccess: () => {
      terminalStatus.refetch();
      setHistory(prev => {
        const prompt = promptFromCwd(shell.cwd, shell.user, shell.hostname);
        return [
          ...prev,
          {
            prompt,
            input: "reset-lab",
            output:
              language === "fr"
                ? "Conteneur d'apprentissage reinitialise."
                : "Learning container reset.",
          },
        ];
      });
    },
  });

  const resolveBaseCommand = (commandStr: string) => {
    const parts = commandStr.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "";

    // Common wrappers in shell commands; actual command is usually the next token.
    if ((parts[0] === "sudo" || parts[0] === "time") && parts.length > 1) {
      return parts[1];
    }

    return parts[0];
  };

  const findCatalogCommand = (commandStr: string) => {
    if (!commandsList) return null;

    const normalized = commandStr.trim().toLowerCase();
    const base = resolveBaseCommand(normalized);

    return (
      commandsList.find((c: any) => {
        const en = (c.nameEn || "").toLowerCase();
        const fr = (c.nameFr || "").toLowerCase();
        const candidates = [en, fr].filter(Boolean);

        return candidates.some(
          name =>
            normalized === name ||
            normalized.startsWith(name + " ") ||
            base === name
        );
      }) || null
    );
  };

  const handleExecute = async () => {
    if (!input.trim()) return;

    const rawInput = input.trim();
    const nextHistory = [...shell.commandHistory, rawInput];
    const shellWithHistory = { ...shell, commandHistory: nextHistory };
    const local = executeLocalCommand(
      rawInput,
      shellWithHistory,
      language === "fr" ? "fr" : "en"
    );
    const prompt = promptFromCwd(shell.cwd, shell.user, shell.hostname);

    if (local.clearScreen) {
      setHistory([]);
    }

    if (local.known) {
      setShell(local.shell);
      if (!local.clearScreen) {
        setHistory(prev => [
          ...prev,
          { prompt, input: rawInput, output: local.output },
        ]);
      }
      setInput("");
      setHistoryCursor(-1);
      return;
    }

    let output = "";
    if (terminalStatus.data?.ready) {
      try {
        const execResult = await executeMutation.mutateAsync({
          command: rawInput,
        });
        output = execResult.output;
      } catch {
        const found = findCatalogCommand(rawInput.toLowerCase());
        if (found) {
          const name =
            language === "fr"
              ? found.nameFr || found.nameEn
              : found.nameEn || found.nameFr;
          const description =
            language === "fr"
              ? found.descriptionFr || found.descriptionEn
              : found.descriptionEn || found.descriptionFr;
          output = `${language === "fr" ? "Execute" : "Executed"}: ${rawInput}\n[Mock System Output] ${language === "fr" ? "Commande terminee avec succes" : "Command completed successfully"}.\n${language === "fr" ? "Commande" : "Command"}: ${name}\n${language === "fr" ? "Description" : "Description"}: ${description}`;
        } else {
          output = `bash: ${rawInput.split(/\s+/)[0]}: command not found`;
        }
      }
    } else {
      output = `bash: ${rawInput.split(/\s+/)[0]}: command not found`;
    }

    setShell(shellWithHistory);
    setHistory(prev => [...prev, { prompt, input: rawInput, output }]);
    setInput("");
    setHistoryCursor(-1);
  };

  const handleClear = () => {
    setHistory([]);
    setInput("");
    setHistoryCursor(-1);
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const nextValue = autocompleteInput(input, shell);
      setInput(nextValue);
      return;
    }

    if (e.ctrlKey && (e.key === "l" || e.key === "L")) {
      e.preventDefault();
      setHistory([]);
      return;
    }

    if (e.ctrlKey && (e.key === "c" || e.key === "C")) {
      e.preventDefault();
      if (input.trim().length > 0) {
        setHistory(prev => [
          ...prev,
          {
            prompt: promptFromCwd(shell.cwd, shell.user, shell.hostname),
            input,
            output: "^C",
          },
        ]);
      }
      setInput("");
      setHistoryCursor(-1);
      return;
    }

    if (e.key === "Enter") {
      handleExecute();
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (shell.commandHistory.length === 0) return;
      const next =
        historyCursor === -1
          ? shell.commandHistory.length - 1
          : Math.max(0, historyCursor - 1);
      setHistoryCursor(next);
      setInput(shell.commandHistory[next]);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyCursor === -1) return;
      const next = historyCursor + 1;
      if (next >= shell.commandHistory.length) {
        setHistoryCursor(-1);
        setInput("");
        return;
      }
      setHistoryCursor(next);
      setInput(shell.commandHistory[next]);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold">
          {t("terminal.title")}
        </h1>
        <p className="text-lg text-muted-foreground">
          {t("terminal.description")}
        </p>
      </div>

      <Tabs defaultValue="terminal" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="terminal">Terminal</TabsTrigger>
          <TabsTrigger value="help">Help</TabsTrigger>
        </TabsList>

        {/* Terminal */}
        <TabsContent value="terminal" className="space-y-4">
          <Card className="bg-black text-green-400 font-mono p-6 min-h-96 max-h-96 overflow-y-auto">
            <div className="space-y-2 text-sm">
              {history.length === 0 && (
                <div className="text-muted-foreground">
                  <p>
                    {language === "fr"
                      ? "Bienvenue dans le simulateur de terminal RHCSA"
                      : "Welcome to RHCSA Learning Platform Terminal Simulator"}
                  </p>
                  <p>
                    {language === "fr"
                      ? "Tapez 'help' pour voir les commandes disponibles"
                      : "Type 'help' to see available commands"}
                  </p>
                  <p>
                    {language === "fr"
                      ? "Fleche Haut/Bas pour parcourir l'historique"
                      : "Use Arrow Up/Down to navigate command history"}
                  </p>
                  <p className="mt-4">
                    {promptFromCwd(shell.cwd, shell.user, shell.hostname)}
                  </p>
                </div>
              )}
              {history.map((cmd, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-start justify-between group">
                    <div className="flex-1">
                      <p className="text-green-400 font-bold">
                        {cmd.prompt}{" "}
                        <span className="text-white font-normal">
                          {cmd.input}
                        </span>
                      </p>
                      <p className="text-gray-300 whitespace-pre-wrap break-words mt-1">
                        {cmd.output}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCopy(cmd.input, index)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0"
                    >
                      {copiedIndex === index ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-green-400" />
                      )}
                    </button>
                  </div>
                  {index < history.length - 1 && (
                    <div className="h-px bg-gray-700" />
                  )}
                </div>
              ))}
              <p className="text-green-400">
                {promptFromCwd(shell.cwd, shell.user, shell.hostname)}
              </p>
            </div>
          </Card>

          {/* Input */}
          <div className="flex gap-2">
            <Input
              placeholder={t("terminal.input_placeholder")}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              className="font-mono bg-black text-green-400 border-green-400/30"
              autoFocus
            />
            <Button
              onClick={handleExecute}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={executeMutation.isPending}
            >
              {executeMutation.isPending
                ? language === "fr"
                  ? "Execution..."
                  : "Running..."
                : t("terminal.execute")}
            </Button>
            <Button onClick={handleClear} variant="outline" size="icon">
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          {/* Command Tips */}
          <Card className="bg-blue-500/5 border-blue-200 dark:border-blue-900 p-4">
            <p className="text-sm font-semibold text-foreground mb-2">
              {language === "fr"
                ? "Essayez ces commandes :"
                : "Try these commands:"}
            </p>
            <p className="text-xs text-muted-foreground mb-2">
              {terminalStatus.data?.ready
                ? `${language === "fr" ? "Mode reel actif via" : "Real mode active via"} ${terminalStatus.data.runtime}`
                : language === "fr"
                  ? "Mode reel indisponible (installez Podman ou Docker)."
                  : "Real mode unavailable (install Podman or Docker)."}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                "ls -la",
                "pwd",
                "mkdir -p labs/day1",
                "touch notes.txt",
                "cat readme.md",
                "grep RHCSA readme.md",
                "find . -name *.txt",
                "chmod 755 notes.txt",
              ].map(cmd => (
                <button
                  key={cmd}
                  onClick={() => {
                    setInput(cmd);
                  }}
                  className="text-xs px-2 py-1 bg-blue-600/10 hover:bg-blue-600/20 rounded border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 transition-colors"
                >
                  {cmd}
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShell(createInitialShell());
                  setHistory([]);
                  setInput("");
                  setHistoryCursor(-1);
                  if (terminalStatus.data?.ready) {
                    resetMutation.mutate();
                  }
                }}
                disabled={resetMutation.isPending}
              >
                {language === "fr" ? "Reset Lab" : "Reset Lab"}
              </Button>
              <p className="text-xs text-muted-foreground self-center">
                {language === "fr"
                  ? "Utilisez 'reset-lab' pour recreer le conteneur propre."
                  : "Use 'reset-lab' to recreate a clean container."}
              </p>
            </div>
          </Card>
        </TabsContent>

        {/* Help */}
        <TabsContent value="help" className="space-y-4">
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground mb-2">
                  {language === "fr"
                    ? "Commandes disponibles"
                    : "Available Commands"}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-mono text-blue-600 dark:text-blue-400">
                      ls -la [path]
                    </p>
                    <p className="text-muted-foreground">
                      {language === "fr"
                        ? "Lister fichiers/repertoires (cache + details)"
                        : "List files/directories with hidden + long format"}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-blue-600 dark:text-blue-400">
                      cd [path] / pwd
                    </p>
                    <p className="text-muted-foreground">
                      {language === "fr"
                        ? "Naviguer dans les dossiers"
                        : "Navigate directories"}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-blue-600 dark:text-blue-400">
                      mkdir / touch / cat
                    </p>
                    <p className="text-muted-foreground">
                      {language === "fr"
                        ? "Creer et lire des fichiers"
                        : "Create and read files"}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-blue-600 dark:text-blue-400">
                      echo "x" &gt; file
                    </p>
                    <p className="text-muted-foreground">
                      {language === "fr"
                        ? "Ecrire/ajouter du contenu"
                        : "Write/append file content"}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-blue-600 dark:text-blue-400">
                      rm / cp / mv
                    </p>
                    <p className="text-muted-foreground">
                      {language === "fr"
                        ? "Supprimer, copier, deplacer"
                        : "Remove, copy, move files"}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-blue-600 dark:text-blue-400">
                      chmod / chown
                    </p>
                    <p className="text-muted-foreground">
                      {language === "fr"
                        ? "Permissions et proprietaire"
                        : "Permissions and ownership"}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-blue-600 dark:text-blue-400">
                      grep / find
                    </p>
                    <p className="text-muted-foreground">
                      {language === "fr"
                        ? "Recherche de texte/fichiers"
                        : "Search text and files"}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-blue-600 dark:text-blue-400">
                      history / clear / help
                    </p>
                    <p className="text-muted-foreground">
                      {language === "fr"
                        ? "Historique et assistance"
                        : "History and help"}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">
                  {language === "fr" ? "Conseils" : "Tips"}
                </h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>
                    {language === "fr"
                      ? "Tapez 'help' pour voir les commandes disponibles"
                      : "Type 'help' to see all available commands"}
                  </li>
                  <li>
                    {language === "fr"
                      ? "Utilisez les fleches Haut/Bas pour reutiliser les commandes"
                      : "Use Arrow Up/Down to reuse previous commands"}
                  </li>
                  <li>
                    {language === "fr"
                      ? "Le terminal garde l'etat des fichiers et du repertoire courant"
                      : "Terminal keeps file system and current directory state"}
                  </li>
                  <li>
                    {language === "fr"
                      ? "Si le mode reel est actif, les commandes inconnues passent au conteneur"
                      : "If real mode is active, unknown commands fallback to container execution"}
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
