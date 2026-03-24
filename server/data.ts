import fs from "fs";
import path from "path";

let commandsData = { chapters: [], commands: [] };
try {
  const contents = fs.readFileSync(
    path.join(process.cwd(), "COMPLETE_COMMANDS_DATA.json"),
    "utf-8"
  );
  commandsData = JSON.parse(contents);
} catch (e) {
  console.warn("Could not read COMPLETE_COMMANDS_DATA.json", e);
}

// Fallback data
export const FALLBACK_CHAPTERS = commandsData.chapters.map((c: any) => ({
  id: c.id,
  chapterNumber: c.number,
  titleEn: c.titleEn,
  titleFr: c.titleFr,
  descriptionEn: c.descriptionEn,
  descriptionFr: c.descriptionFr,
  contentEn: c.contentEn,
  contentFr: c.contentFr,
  order: c.id,
}));

export const FALLBACK_COMMANDS = commandsData.commands.map(
  (c: any, index: number) => ({
    id: index + 1,
    nameEn: c.name,
    nameFr: c.name,
    descriptionEn: c.description || "",
    descriptionFr: c.description || "",
    syntax: c.syntax || "",
    optionsEn: c.options || "",
    optionsFr: c.options || "",
    examplesEn: c.examples || "",
    examplesFr: c.examples || "",
    chapterId: c.chapter,
    difficulty: c.difficulty || "beginner",
    order: index + 1,
  })
);

const toLabStepsJson = (tasks: string[]) =>
  JSON.stringify(
    tasks.map((task, index) => ({
      title: `Task ${index + 1}`,
      description: task,
      command: "$ # Complete the task",
      hint: "Validate each task before moving to the next one.",
    }))
  );

const getAutoAnswerForQuestion = (question: string) => {
  const q = question.toLowerCase();

  if (/root password|reset root|rd\.break/.test(q)) {
    return "Reboot and interrupt GRUB; append rd.break; boot; mount -o remount,rw /sysroot; chroot /sysroot; passwd root; touch /.autorelabel; exit; exit";
  }
  if (/backup|tar\.bz2|compress|bzip2/.test(q)) {
    return "tar -cjf /root/backup.tar.bz2 /usr/local";
  }
  if (/selinux|setenforce|permissive|enforcing/.test(q)) {
    return "getenforce; setenforce 1; edit /etc/selinux/config (SELINUX=enforcing or permissive as required)";
  }
  if (/kernel|grub|boot/.test(q)) {
    return "dnf update kernel -y; grub2-set-default 1; grub2-mkconfig -o /boot/grub2/grub.cfg";
  }
  if (/cron|crontab|periodic|every|at\s+\d/.test(q)) {
    return "crontab -e; add cron expression matching schedule and required command";
  }
  if (/find.*\/etc|size|owned by|setuid|grep|\/bin\/bash/.test(q)) {
    return "Use find/grep with proper filters then redirect output to required file (e.g. find ... > /path/file)";
  }
  if (/timezone|time zone|europe|timedatectl/.test(q)) {
    return "timedatectl set-timezone Europe/Paris (or required zone)";
  }
  if (/ntp|chrony|chronyd|time\.nist/.test(q)) {
    return "Edit /etc/chrony.conf with target server; systemctl restart chronyd; chronyc sources";
  }
  if (
    /useradd|create user|groupadd|gid|uid|password aging|chage|lock/.test(q)
  ) {
    return "Create users/groups with useradd/groupadd/usermod/chage; set passwords and memberships as requested";
  }
  if (/shared directory|sgid|acl|setfacl|permissions|umask/.test(q)) {
    return "mkdir -p <dir>; chown/chgrp as required; chmod with SGID/sticky as needed; apply ACL using setfacl";
  }
  if (/ip_forward|sysctl/.test(q)) {
    return "echo 'net.ipv4.ip_forward = 1' >> /etc/sysctl.conf; sysctl -p";
  }
  if (/firewall|smtp|port|firewall-cmd/.test(q)) {
    return "firewall-cmd --permanent --add-service=<service> or --add-port=<port>/tcp; firewall-cmd --reload";
  }
  if (/autofs|nfs|mount.*home|auto\.master/.test(q)) {
    return "Install autofs/nfs-utils; configure /etc/auto.master and map file; enable and start autofs; verify mount";
  }
  if (/tuned|balanced|profile/.test(q)) {
    return "dnf install -y tuned; systemctl enable --now tuned; tuned-adm profile balanced or recommended";
  }
  if (/container|podman|rsyslog|systemd service|linger|journal/.test(q)) {
    return "podman run/create container; generate systemd unit with podman generate systemd; enable user service; loginctl enable-linger <user>; configure volume mount for journal if requested";
  }
  if (/partition|fdisk|ext4|xfs|swap|lvm|vg|lv|vdo|stratis/.test(q)) {
    return "Create partition/PV/VG/LV as requested; format filesystem; configure persistent mount in /etc/fstab; mount -a; extend/reduce with lvextend/lvreduce and fs resize tools";
  }
  if (/httpd|apache|web server|documentroot|listen/.test(q)) {
    return "dnf install -y httpd; configure Listen and DocumentRoot; update SELinux port context if needed; open firewall; enable --now httpd";
  }
  if (/repo|yum|dnf|baseos|appstream/.test(q)) {
    return "Create repo file under /etc/yum.repos.d with BaseOS/AppStream entries; run dnf repolist";
  }
  if (/ssh|passwordless|ssh-keygen|ssh-copy-id/.test(q)) {
    return "ssh-keygen -t rsa -N ''; ssh-copy-id user@host; verify ssh login without password";
  }
  return "Use standard RHCSA commands to complete this task and verify with systemctl, lsblk, mount, id, getenforce, firewall-cmd or relevant checks.";
};

const enrichScenarioAnswers = (value: any): any => {
  if (Array.isArray(value)) {
    return value.map(item => {
      if (typeof item === "string") {
        return { question: item, answer: getAutoAnswerForQuestion(item) };
      }
      if (
        item &&
        typeof item === "object" &&
        typeof item.question === "string"
      ) {
        return {
          question: item.question,
          answer:
            typeof item.answer === "string" && item.answer.trim().length > 0
              ? item.answer
              : getAutoAnswerForQuestion(item.question),
        };
      }
      return enrichScenarioAnswers(item);
    });
  }

  if (value && typeof value === "object") {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = enrichScenarioAnswers(v);
    }
    return out;
  }

  return value;
};

const scenario = (value: unknown) =>
  JSON.stringify(enrichScenarioAnswers(value));

type LabMcqQuestion = {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
};

const toLabMcqJson = (questions: LabMcqQuestion[]) =>
  JSON.stringify(
    questions.map((question, index) => ({
      type: "mcq",
      title: `Question ${index + 1}`,
      question: question.question,
      options: question.options,
      answerIndex: question.answerIndex,
      explanation: question.explanation,
    }))
  );

const LAB_QCM_BANK: Record<string, LabMcqQuestion[]> = {
  usersBasics: [
    {
      question: "Which command creates a new local user account?",
      options: ["groupadd", "useradd", "usermod", "passwd"],
      answerIndex: 1,
      explanation:
        "useradd creates a new user entry and home directory when used with -m.",
    },
    {
      question: "Which file stores hashed user passwords on RHEL?",
      options: ["/etc/passwd", "/etc/group", "/etc/shadow", "/etc/login.defs"],
      answerIndex: 2,
      explanation:
        "/etc/shadow stores password hashes and aging policy fields.",
    },
    {
      question: "How do you force user ali to change password at next login?",
      options: [
        "passwd -u ali",
        "chage -d 0 ali",
        "usermod -L ali",
        "passwd -e ali",
      ],
      answerIndex: 1,
      explanation:
        "chage -d 0 sets last password change date to epoch and forces reset.",
    },
    {
      question: "Which command adds user sam to supplementary group wheel?",
      options: [
        "usermod -aG wheel sam",
        "groupadd wheel sam",
        "gpasswd sam wheel",
        "useradd -G wheel sam",
      ],
      answerIndex: 0,
      explanation:
        "usermod -aG appends the group without removing existing memberships.",
    },
  ],
  permissions: [
    {
      question: "What does chmod 2770 /shared set on a directory?",
      options: ["sticky bit", "SGID bit", "SUID bit", "SELinux context"],
      answerIndex: 1,
      explanation: "2 in the first octal digit sets SGID.",
    },
    {
      question: "Which command grants user user1 rw access via ACL on file1?",
      options: [
        "chmod u:user1:rw file1",
        "setfacl -m u:user1:rw file1",
        "getfacl -m user1:rw file1",
        "chacl user1 file1",
      ],
      answerIndex: 1,
      explanation: "setfacl modifies ACL entries.",
    },
    {
      question: "What umask value gives new files 640 and directories 750?",
      options: ["022", "027", "007", "077"],
      answerIndex: 1,
      explanation: "Base perms 666/777 minus 027 give 640/750.",
    },
    {
      question: "Which command displays ACLs of /srv/data?",
      options: [
        "lsacl /srv/data",
        "getfacl /srv/data",
        "aclshow /srv/data",
        "ls -Z /srv/data",
      ],
      answerIndex: 1,
      explanation: "getfacl prints access and default ACL entries.",
    },
  ],
  findGrep: [
    {
      question: "Find all files in /etc owned by root with .conf extension:",
      options: [
        "find /etc -name '*.conf' -user root -type f",
        "grep root /etc/*.conf",
        "locate /etc/*.conf root",
        "find /etc -perm root",
      ],
      answerIndex: 0,
      explanation: "find with -user and -type f is the standard approach.",
    },
    {
      question:
        "Search recursively for the word PermitRootLogin under /etc/ssh:",
      options: [
        "grep -R 'PermitRootLogin' /etc/ssh",
        "find /etc/ssh PermitRootLogin",
        "awk PermitRootLogin /etc/ssh",
        "sed -n PermitRootLogin /etc/ssh",
      ],
      answerIndex: 0,
      explanation: "grep -R recursively scans files.",
    },
    {
      question: "Which command counts lines in /var/log/messages?",
      options: [
        "wc -l /var/log/messages",
        "grep -c /var/log/messages",
        "linecount /var/log/messages",
        "cat -n /var/log/messages",
      ],
      answerIndex: 0,
      explanation: "wc -l returns line count.",
    },
    {
      question: "Find files larger than 100M in /var:",
      options: [
        "find /var -size +100M -type f",
        "du -h /var 100M",
        "ls -lh /var +100M",
        "grep 100M /var",
      ],
      answerIndex: 0,
      explanation: "find -size +100M filters files above 100 MB.",
    },
  ],
  systemdLogs: [
    {
      question: "Which command starts and enables httpd at boot?",
      options: [
        "systemctl run httpd",
        "systemctl enable --now httpd",
        "service httpd start --boot",
        "chkconfig httpd on && service httpd start",
      ],
      answerIndex: 1,
      explanation: "enable --now performs both enable and immediate start.",
    },
    {
      question: "View logs for sshd service with journalctl:",
      options: [
        "journalctl -u sshd",
        "journalctl sshd.log",
        "systemctl log sshd",
        "tail /run/log/sshd",
      ],
      answerIndex: 0,
      explanation: "-u filters by systemd unit.",
    },
    {
      question: "Reload service config without full restart:",
      options: [
        "systemctl reboot <service>",
        "systemctl reset <service>",
        "systemctl reload <service>",
        "systemctl reexec <service>",
      ],
      answerIndex: 2,
      explanation: "reload asks daemon to re-read configuration.",
    },
    {
      question: "After editing a unit file, which command is required first?",
      options: [
        "systemctl daemon-reload",
        "systemctl status",
        "systemctl daemon-clean",
        "systemctl flush",
      ],
      answerIndex: 0,
      explanation: "daemon-reload refreshes unit metadata.",
    },
  ],
  networking: [
    {
      question: "Set static IPv4 using nmcli on connection ens160:",
      options: [
        "nmcli con mod ens160 ipv4.method manual ipv4.addresses 192.168.1.10/24",
        "ifconfig ens160 static 192.168.1.10",
        "ip addr add 192.168.1.10/24 dev ens160 --permanent",
        "route add ens160 192.168.1.10",
      ],
      answerIndex: 0,
      explanation: "nmcli modifies persistent NetworkManager profiles.",
    },
    {
      question: "Command to set hostname permanently:",
      options: [
        "hostname newhost",
        "hostnamectl set-hostname newhost",
        "nmcli host newhost",
        "sysctl hostname=newhost",
      ],
      answerIndex: 1,
      explanation: "hostnamectl updates static hostname persistently.",
    },
    {
      question: "Which file stores DNS resolver settings?",
      options: [
        "/etc/hosts",
        "/etc/resolv.conf",
        "/etc/nsswitch.conf",
        "/etc/dns.conf",
      ],
      answerIndex: 1,
      explanation: "resolv.conf contains nameserver entries.",
    },
    {
      question: "Test if port 22 is open on server1:",
      options: [
        "ping server1:22",
        "nc -zv server1 22",
        "curl server1:22",
        "ss -lnt server1 22",
      ],
      answerIndex: 1,
      explanation: "nc -zv performs TCP connect test without data transfer.",
    },
  ],
  firewalld: [
    {
      question: "Open service http permanently in firewalld:",
      options: [
        "firewall-cmd --add-service=http",
        "firewall-cmd --permanent --add-service=http",
        "iptables -A INPUT -p tcp --dport 80 -j ACCEPT",
        "firewall-cmd --set-service=http",
      ],
      answerIndex: 1,
      explanation: "--permanent persists across reboot.",
    },
    {
      question: "Apply permanent firewalld changes immediately:",
      options: [
        "firewall-cmd --refresh",
        "firewall-cmd --runtime-to-permanent",
        "firewall-cmd --reload",
        "systemctl restart firewalld --save",
      ],
      answerIndex: 2,
      explanation: "--reload merges permanent config into runtime.",
    },
    {
      question: "List active zone rules:",
      options: [
        "firewall-cmd --list-all",
        "firewall-cmd --show",
        "firewall-cmd --zones-all",
        "iptables -S",
      ],
      answerIndex: 0,
      explanation:
        "--list-all prints services, ports, and interfaces for active zone.",
    },
    {
      question: "Open custom TCP port 8080 permanently:",
      options: [
        "firewall-cmd --permanent --add-port=8080/tcp",
        "firewall-cmd --add-port 8080",
        "semanage port -a 8080",
        "iptables -P 8080/tcp",
      ],
      answerIndex: 0,
      explanation: "Use --add-port=<port>/tcp with --permanent.",
    },
  ],
  reposDnf: [
    {
      question: "Where should a custom DNF repo file be created?",
      options: [
        "/etc/dnf.repos.d",
        "/etc/yum.repos.d",
        "/var/lib/dnf/repos",
        "/usr/share/repos",
      ],
      answerIndex: 1,
      explanation: "RHEL uses /etc/yum.repos.d/*.repo.",
    },
    {
      question: "Command to list enabled repositories:",
      options: [
        "dnf repolist",
        "dnf repo --list",
        "yum list repo",
        "repoctl status",
      ],
      answerIndex: 0,
      explanation: "dnf repolist displays enabled repos.",
    },
    {
      question: "Install package named vim with DNF:",
      options: [
        "dnf add vim",
        "dnf install -y vim",
        "rpm -i vim",
        "yum fetch vim",
      ],
      answerIndex: 1,
      explanation: "dnf install is the package install workflow.",
    },
    {
      question: "Which command checks package update availability?",
      options: [
        "dnf check-update",
        "dnf needs-update",
        "dnf verify",
        "rpm --update",
      ],
      answerIndex: 0,
      explanation: "check-update returns packages with newer versions.",
    },
  ],
  cronAt: [
    {
      question: "Cron expression for every day at 22:30:",
      options: ["30 22 * * *", "22 30 * * *", "* 22 30 * *", "30 * 22 * *"],
      answerIndex: 0,
      explanation: "Order is minute hour day month weekday.",
    },
    {
      question: "Edit root crontab:",
      options: [
        "cron -e root",
        "crontab -e",
        "at -e root",
        "systemctl edit cron",
      ],
      answerIndex: 1,
      explanation: "Run as root then use crontab -e.",
    },
    {
      question:
        "Where are system-wide periodic scripts usually configured on RHEL?",
      options: [
        "/etc/cron.d and /etc/crontab",
        "/usr/cron",
        "/etc/systemd/cron",
        "/var/spool/cronjobs",
      ],
      answerIndex: 0,
      explanation: "System cron jobs live in /etc/crontab and /etc/cron.d.",
    },
    {
      question: "One-time execution at 23:00 should use:",
      options: ["crond", "at", "anacron", "watch"],
      answerIndex: 1,
      explanation: "at schedules one-off jobs.",
    },
  ],
  ssh: [
    {
      question: "Generate RSA key pair without passphrase:",
      options: [
        "ssh-keygen -t rsa -N ''",
        "ssh-keygen rsa --empty",
        "ssh-keygen -p",
        "ssh-copy-id -N",
      ],
      answerIndex: 0,
      explanation: "-N '' sets empty passphrase.",
    },
    {
      question: "Copy public key to remote host user bob:",
      options: [
        "scp ~/.ssh/id_rsa bob@host:.ssh/authorized_keys",
        "ssh-copy-id bob@host",
        "ssh-keygen --send bob@host",
        "rsync ~/.ssh bob@host",
      ],
      answerIndex: 1,
      explanation: "ssh-copy-id appends key safely to authorized_keys.",
    },
    {
      question: "Main SSH daemon config file:",
      options: [
        "/etc/ssh/ssh_config",
        "/etc/ssh/sshd_config",
        "/etc/sshd.conf",
        "/usr/lib/ssh/sshd.conf",
      ],
      answerIndex: 1,
      explanation: "sshd_config controls server behavior.",
    },
    {
      question: "After changing sshd_config, apply changes with:",
      options: [
        "systemctl reload sshd",
        "systemctl restart ssh",
        "service ssh reload",
        "pkill -HUP ssh",
      ],
      answerIndex: 0,
      explanation: "reload is enough for most config changes.",
    },
  ],
  lvmCore: [
    {
      question: "Correct order to build LVM stack:",
      options: [
        "VG -> PV -> LV",
        "PV -> VG -> LV",
        "LV -> VG -> PV",
        "PV -> LV -> VG",
      ],
      answerIndex: 1,
      explanation:
        "Create physical volume first, then volume group, then logical volume.",
    },
    {
      question: "Create physical volume on /dev/sdb1:",
      options: [
        "pvcreate /dev/sdb1",
        "vgcreate /dev/sdb1",
        "lvcreate /dev/sdb1",
        "mkfs.xfs /dev/sdb1",
      ],
      answerIndex: 0,
      explanation: "pvcreate initializes block device for LVM.",
    },
    {
      question: "Extend logical volume lvdata by 1G:",
      options: [
        "vgextend lvdata 1G",
        "lvextend -L +1G /dev/vg0/lvdata",
        "pvextend /dev/vg0/lvdata",
        "lvm grow lvdata +1G",
      ],
      answerIndex: 1,
      explanation: "lvextend changes LV size.",
    },
    {
      question: "After extending XFS LV, grow filesystem with:",
      options: [
        "resize2fs",
        "xfs_growfs /mountpoint",
        "fsck -f",
        "xfs_repair -g",
      ],
      answerIndex: 1,
      explanation: "xfs_growfs resizes mounted XFS filesystem.",
    },
  ],
  partitionsFs: [
    {
      question: "Which utility is recommended for GPT partitioning on RHEL 9?",
      options: ["fdisk only", "parted", "mkpart", "gpart"],
      answerIndex: 1,
      explanation:
        "parted handles GPT well and is commonly used in RHCSA labs.",
    },
    {
      question: "Create XFS filesystem on /dev/vg0/lvdata:",
      options: [
        "mkfs.ext4 /dev/vg0/lvdata",
        "mkfs.xfs /dev/vg0/lvdata",
        "xfs_create /dev/vg0/lvdata",
        "fsformat xfs /dev/vg0/lvdata",
      ],
      answerIndex: 1,
      explanation: "mkfs.xfs formats LV as XFS.",
    },
    {
      question: "Persist mount in system boot process by editing:",
      options: [
        "/etc/mtab",
        "/etc/fstab",
        "/boot/grub2/grub.cfg",
        "/etc/default/mounts",
      ],
      answerIndex: 1,
      explanation: "/etc/fstab defines persistent mounts.",
    },
    {
      question: "Apply new /etc/fstab entries without reboot:",
      options: ["mount -a", "systemctl daemon-reload", "reboot", "fsck -A"],
      answerIndex: 0,
      explanation: "mount -a tests and applies all non-mounted entries.",
    },
  ],
  swapFstab: [
    {
      question: "Create swap signature on /dev/sdc1:",
      options: [
        "mkfs.swap /dev/sdc1",
        "mkswap /dev/sdc1",
        "swapon --create /dev/sdc1",
        "parted /dev/sdc1 swap",
      ],
      answerIndex: 1,
      explanation: "mkswap initializes swap area.",
    },
    {
      question: "Enable swap immediately:",
      options: [
        "swapon /dev/sdc1",
        "mount /dev/sdc1",
        "systemctl start swap",
        "swapctl -a",
      ],
      answerIndex: 0,
      explanation: "swapon activates swap device now.",
    },
    {
      question: "Verify active swap devices:",
      options: ["lsblk", "swapon --show", "free -m --disk", "cat /proc/memory"],
      answerIndex: 1,
      explanation: "swapon --show lists active swap areas.",
    },
    {
      question: "Persist swap device across reboot:",
      options: [
        "Add entry in /etc/fstab",
        "Run swapon in .bashrc",
        "Edit /etc/default/swap",
        "Add in /boot/grub2/grub.cfg",
      ],
      answerIndex: 0,
      explanation: "fstab persistence is required for RHCSA tasks.",
    },
  ],
  selinux: [
    {
      question: "Check current SELinux mode:",
      options: [
        "selinux --status",
        "getenforce",
        "sestatus -m only",
        "setenforce --show",
      ],
      answerIndex: 1,
      explanation: "getenforce prints Enforcing, Permissive or Disabled.",
    },
    {
      question: "Set SELinux to permissive until reboot:",
      options: [
        "setenforce 0",
        "setsebool permissive on",
        "semanage mode permissive",
        "chmod selinux permissive",
      ],
      answerIndex: 0,
      explanation: "setenforce changes runtime mode only.",
    },
    {
      question: "Persist enforcing mode after reboot by editing:",
      options: [
        "/etc/selinux/config",
        "/etc/security/selinux",
        "/boot/selinux.cfg",
        "/etc/sysconfig/selinux_mode",
      ],
      answerIndex: 0,
      explanation: "Set SELINUX=enforcing in /etc/selinux/config.",
    },
    {
      question: "Allow httpd to listen on port 82 with SELinux policy:",
      options: [
        "chcon -p 82 http_port_t",
        "semanage port -a -t http_port_t -p tcp 82",
        "setsebool httpd_port_82 on",
        "restorecon -R /etc/httpd",
      ],
      answerIndex: 1,
      explanation: "semanage port adds allowed port labeling for service type.",
    },
  ],
  nfsAutofs: [
    {
      question: "NFS export definitions are stored in:",
      options: [
        "/etc/nfs.conf",
        "/etc/exports",
        "/etc/auto.master",
        "/etc/fstab",
      ],
      answerIndex: 1,
      explanation: "/etc/exports defines exported directories and clients.",
    },
    {
      question: "Apply NFS export changes:",
      options: [
        "exportfs -rav",
        "mount -a",
        "nfsconf reload",
        "systemctl reload rpcbind",
      ],
      answerIndex: 0,
      explanation: "exportfs -rav re-exports all entries verbosely.",
    },
    {
      question: "Main autofs map reference file:",
      options: [
        "/etc/auto.master",
        "/etc/auto.map",
        "/etc/autofs.conf",
        "/etc/nfs.auto",
      ],
      answerIndex: 0,
      explanation: "auto.master links mount points to map files.",
    },
    {
      question: "Start and enable autofs service:",
      options: [
        "systemctl enable --now autofs",
        "autofs --start",
        "service autofs on",
        "mount -t autofs",
      ],
      answerIndex: 0,
      explanation: "systemctl is standard service manager on RHEL.",
    },
  ],
  podman: [
    {
      question: "Run container named web from image httpd detached:",
      options: [
        "podman run --name web -d httpd",
        "docker run web httpd",
        "podman start -d web httpd",
        "podman create -r web httpd",
      ],
      answerIndex: 0,
      explanation: "podman run -d starts detached container.",
    },
    {
      question: "List all containers including stopped ones:",
      options: [
        "podman ps",
        "podman ps -a",
        "podman list --all",
        "podman container ls --up",
      ],
      answerIndex: 1,
      explanation: "-a includes exited containers.",
    },
    {
      question: "Generate systemd service for container web:",
      options: [
        "podman systemd web",
        "podman generate systemd --name web --files",
        "systemctl create podman web",
        "podman service create web",
      ],
      answerIndex: 1,
      explanation: "generate systemd outputs unit files.",
    },
    {
      question: "Rootless user service should be managed with:",
      options: [
        "systemctl --user",
        "systemctl --rootless",
        "service --user",
        "podman systemctl",
      ],
      answerIndex: 0,
      explanation: "--user scope controls per-user units.",
    },
  ],
  stratisVdo: [
    {
      question: "Create a Stratis pool named pool1 from /dev/sdb:",
      options: [
        "stratis pool create pool1 /dev/sdb",
        "stratis create pool1 /dev/sdb",
        "mkstratis pool1 /dev/sdb",
        "pooladd stratis pool1 /dev/sdb",
      ],
      answerIndex: 0,
      explanation: "stratis pool create builds the managed pool.",
    },
    {
      question: "Create Stratis filesystem fs1 in pool1:",
      options: [
        "stratis filesystem create pool1 fs1",
        "stratis fs add pool1 fs1",
        "mkfs.stratis pool1 fs1",
        "stratis lv create pool1 fs1",
      ],
      answerIndex: 0,
      explanation: "filesystem create is the proper subcommand.",
    },
    {
      question: "What is VDO mainly used for?",
      options: [
        "Network tuning",
        "Data deduplication and compression",
        "SELinux labeling",
        "Kernel management",
      ],
      answerIndex: 1,
      explanation:
        "VDO provides inline dedupe and compression for block storage.",
    },
    {
      question:
        "After creating filesystem, persistent mount should be configured in:",
      options: [
        "/etc/systemd/system",
        "/etc/fstab",
        "/etc/stratis.conf",
        "/boot/grub2/device.map",
      ],
      answerIndex: 1,
      explanation: "Use UUID/device entries in /etc/fstab for persistence.",
    },
  ],
  bootRecovery: [
    {
      question:
        "To reset forgotten root password in RHEL, common kernel argument is:",
      options: ["single", "rd.break", "rescue=1", "root.reset"],
      answerIndex: 1,
      explanation: "rd.break breaks before switch_root for recovery.",
    },
    {
      question:
        "After chroot /sysroot and changing password, required SELinux relabel marker:",
      options: [
        "touch /.autorelabel",
        "restorecon /",
        "fixfiles relabel",
        "setenforce 0",
      ],
      answerIndex: 0,
      explanation: "touch /.autorelabel ensures full relabel next boot.",
    },
    {
      question: "Regenerate GRUB2 config on BIOS systems:",
      options: [
        "grub2-install /boot/grub2/grub.cfg",
        "grub2-mkconfig -o /boot/grub2/grub.cfg",
        "grub2-rebuild",
        "dracut --grub",
      ],
      answerIndex: 1,
      explanation: "grub2-mkconfig writes menu entries to grub.cfg.",
    },
    {
      question: "List installed kernels:",
      options: [
        "rpm -qa | grep kernel",
        "uname -r",
        "grubby --installed",
        "dnf kernel list",
      ],
      answerIndex: 0,
      explanation: "rpm query shows all installed kernel packages.",
    },
  ],
  mixedMock: [
    {
      question: "You extended an XFS LV; what must be done next?",
      options: [
        "resize2fs on block device",
        "xfs_growfs on mount point",
        "fsck then remount",
        "nothing, auto grows",
      ],
      answerIndex: 1,
      explanation: "XFS requires explicit grow operation.",
    },
    {
      question:
        "Need HTTP on port 8080 with SELinux enforcing and firewalld active. Minimal correct pair is:",
      options: [
        "setenforce 0 only",
        "firewall-cmd add port only",
        "semanage port + firewall-cmd add-port",
        "iptables save only",
      ],
      answerIndex: 2,
      explanation: "You need both SELinux port label and firewall opening.",
    },
    {
      question:
        "For shared team dir with group inheritance, which mode is best?",
      options: ["1777", "2770", "0755", "0700"],
      answerIndex: 1,
      explanation: "2770 applies SGID and keeps access private to owner/group.",
    },
    {
      question:
        "Persistent static route and DNS on NetworkManager host should be configured with:",
      options: [
        "ip route add + echo nameserver",
        "nmcli connection modify",
        "ifconfig and route commands",
        "systemctl network restart only",
      ],
      answerIndex: 1,
      explanation: "nmcli connection profiles persist across reboot.",
    },
  ],
};

export const FALLBACK_LABS = [
  {
    id: 1,
    titleEn: "LAB 01 - Users Fundamentals QCM",
    titleFr: "LAB 01 - QCM Utilisateurs",
    descriptionEn:
      "QCM lab on local users, groups, password aging and account management.",
    descriptionFr:
      "QCM sur la gestion des utilisateurs locaux, groupes et expiration.",
    difficulty: "easy",
    estimatedDuration: 20,
    objectivesEn: "useradd, usermod, chage, shadow, wheel",
    objectivesFr: "useradd, usermod, chage, shadow, wheel",
    instructionsEn: toLabMcqJson(LAB_QCM_BANK.usersBasics),
    instructionsFr: toLabMcqJson(LAB_QCM_BANK.usersBasics),
    order: 1,
    chapterId: 2,
  },
  {
    id: 2,
    titleEn: "LAB 02 - Permissions and ACL QCM",
    titleFr: "LAB 02 - QCM Permissions et ACL",
    descriptionEn: "QCM on chmod, SGID, umask and access control lists.",
    descriptionFr: "QCM sur chmod, SGID, umask et ACL.",
    difficulty: "easy",
    estimatedDuration: 22,
    objectivesEn: "chmod, sgid, setfacl, getfacl, umask",
    objectivesFr: "chmod, sgid, setfacl, getfacl, umask",
    instructionsEn: toLabMcqJson(LAB_QCM_BANK.permissions),
    instructionsFr: toLabMcqJson(LAB_QCM_BANK.permissions),
    order: 2,
    chapterId: 2,
  },
  {
    id: 3,
    titleEn: "LAB 03 - Find and Grep QCM",
    titleFr: "LAB 03 - QCM Find et Grep",
    descriptionEn:
      "QCM practice for search commands, filters, and text extraction.",
    descriptionFr: "QCM pratique sur find, grep et extraction de texte.",
    difficulty: "easy",
    estimatedDuration: 18,
    objectivesEn: "find, grep, wc, file filters",
    objectivesFr: "find, grep, wc, filtres de fichiers",
    instructionsEn: toLabMcqJson(LAB_QCM_BANK.findGrep),
    instructionsFr: toLabMcqJson(LAB_QCM_BANK.findGrep),
    order: 3,
    chapterId: 1,
  },
  {
    id: 4,
    titleEn: "LAB 04 - Systemd and Logs QCM",
    titleFr: "LAB 04 - QCM Systemd et Logs",
    descriptionEn: "QCM on service lifecycle and journal diagnostics.",
    descriptionFr: "QCM sur la gestion des services et journaux.",
    difficulty: "easy",
    estimatedDuration: 20,
    objectivesEn: "systemctl, journalctl, daemon-reload",
    objectivesFr: "systemctl, journalctl, daemon-reload",
    instructionsEn: toLabMcqJson(LAB_QCM_BANK.systemdLogs),
    instructionsFr: toLabMcqJson(LAB_QCM_BANK.systemdLogs),
    order: 4,
    chapterId: 5,
  },
  {
    id: 5,
    titleEn: "LAB 05 - Network Basics QCM",
    titleFr: "LAB 05 - QCM Reseau de Base",
    descriptionEn: "QCM on nmcli, hostname, DNS and connectivity checks.",
    descriptionFr:
      "QCM sur nmcli, hostname, DNS et verification de connectivite.",
    difficulty: "medium",
    estimatedDuration: 22,
    objectivesEn: "nmcli, hostnamectl, resolv.conf, nc",
    objectivesFr: "nmcli, hostnamectl, resolv.conf, nc",
    instructionsEn: toLabMcqJson(LAB_QCM_BANK.networking),
    instructionsFr: toLabMcqJson(LAB_QCM_BANK.networking),
    order: 5,
    chapterId: 7,
  },
  {
    id: 6,
    titleEn: "LAB 06 - Firewalld QCM",
    titleFr: "LAB 06 - QCM Firewalld",
    descriptionEn: "QCM focused on zones, services and custom ports.",
    descriptionFr: "QCM centre sur les zones, services et ports personnalises.",
    difficulty: "medium",
    estimatedDuration: 20,
    objectivesEn: "firewall-cmd, services, ports, reload",
    objectivesFr: "firewall-cmd, services, ports, reload",
    instructionsEn: toLabMcqJson(LAB_QCM_BANK.firewalld),
    instructionsFr: toLabMcqJson(LAB_QCM_BANK.firewalld),
    order: 6,
    chapterId: 7,
  },
  {
    id: 7,
    titleEn: "LAB 07 - DNF and Repositories QCM",
    titleFr: "LAB 07 - QCM Depots et DNF",
    descriptionEn: "QCM on repository files and package lifecycle commands.",
    descriptionFr: "QCM sur les depots et commandes DNF.",
    difficulty: "medium",
    estimatedDuration: 20,
    objectivesEn: "repo files, dnf repolist, package install, update checks",
    objectivesFr: "fichiers repo, dnf repolist, installation, mises a jour",
    instructionsEn: toLabMcqJson(LAB_QCM_BANK.reposDnf),
    instructionsFr: toLabMcqJson(LAB_QCM_BANK.reposDnf),
    order: 7,
    chapterId: 6,
  },
  {
    id: 8,
    titleEn: "LAB 08 - Cron and At QCM",
    titleFr: "LAB 08 - QCM Cron et At",
    descriptionEn: "QCM for periodic and one-time scheduling tasks.",
    descriptionFr: "QCM pour planification periodique et one-shot.",
    difficulty: "medium",
    estimatedDuration: 18,
    objectivesEn: "crontab, cron.d, at jobs",
    objectivesFr: "crontab, cron.d, taches at",
    instructionsEn: toLabMcqJson(LAB_QCM_BANK.cronAt),
    instructionsFr: toLabMcqJson(LAB_QCM_BANK.cronAt),
    order: 8,
    chapterId: 8,
  },
  {
    id: 9,
    titleEn: "LAB 09 - SSH Access QCM",
    titleFr: "LAB 09 - QCM SSH",
    descriptionEn: "QCM on key auth, daemon config and safe reload.",
    descriptionFr: "QCM sur les cles SSH, config serveur et reload.",
    difficulty: "medium",
    estimatedDuration: 20,
    objectivesEn: "ssh-keygen, ssh-copy-id, sshd_config",
    objectivesFr: "ssh-keygen, ssh-copy-id, sshd_config",
    instructionsEn: toLabMcqJson(LAB_QCM_BANK.ssh),
    instructionsFr: toLabMcqJson(LAB_QCM_BANK.ssh),
    order: 9,
    chapterId: 10,
  },
  {
    id: 10,
    titleEn: "LAB 10 - LVM Core QCM",
    titleFr: "LAB 10 - QCM LVM Core",
    descriptionEn: "QCM on pv/vg/lv lifecycle and XFS growth.",
    descriptionFr: "QCM sur le cycle pv/vg/lv et extension XFS.",
    difficulty: "medium",
    estimatedDuration: 24,
    objectivesEn: "pvcreate, vgcreate, lvextend, xfs_growfs",
    objectivesFr: "pvcreate, vgcreate, lvextend, xfs_growfs",
    instructionsEn: toLabMcqJson(LAB_QCM_BANK.lvmCore),
    instructionsFr: toLabMcqJson(LAB_QCM_BANK.lvmCore),
    order: 10,
    chapterId: 3,
  },
  {
    id: 11,
    titleEn: "LAB 11 - Partitions and Filesystems QCM",
    titleFr: "LAB 11 - QCM Partitions et FS",
    descriptionEn: "QCM on GPT partitioning, mkfs and persistent mounts.",
    descriptionFr: "QCM sur GPT, mkfs et montages persistants.",
    difficulty: "hard",
    estimatedDuration: 24,
    objectivesEn: "parted, mkfs.xfs, fstab, mount -a",
    objectivesFr: "parted, mkfs.xfs, fstab, mount -a",
    instructionsEn: toLabMcqJson(LAB_QCM_BANK.partitionsFs),
    instructionsFr: toLabMcqJson(LAB_QCM_BANK.partitionsFs),
    order: 11,
    chapterId: 3,
  },
  {
    id: 12,
    titleEn: "LAB 12 - Swap and fstab QCM",
    titleFr: "LAB 12 - QCM Swap et fstab",
    descriptionEn: "QCM on creating and persisting swap spaces.",
    descriptionFr: "QCM sur creation et persistance du swap.",
    difficulty: "hard",
    estimatedDuration: 22,
    objectivesEn: "mkswap, swapon, fstab, verification",
    objectivesFr: "mkswap, swapon, fstab, verification",
    instructionsEn: toLabMcqJson(LAB_QCM_BANK.swapFstab),
    instructionsFr: toLabMcqJson(LAB_QCM_BANK.swapFstab),
    order: 12,
    chapterId: 3,
  },
  {
    id: 13,
    titleEn: "LAB 13 - SELinux Operations QCM",
    titleFr: "LAB 13 - QCM SELinux",
    descriptionEn: "QCM on SELinux modes and policy adjustments.",
    descriptionFr: "QCM sur modes SELinux et ajustements de policy.",
    difficulty: "hard",
    estimatedDuration: 24,
    objectivesEn: "getenforce, setenforce, semanage port",
    objectivesFr: "getenforce, setenforce, semanage port",
    instructionsEn: toLabMcqJson(LAB_QCM_BANK.selinux),
    instructionsFr: toLabMcqJson(LAB_QCM_BANK.selinux),
    order: 13,
    chapterId: 11,
  },
  {
    id: 14,
    titleEn: "LAB 14 - NFS and Autofs QCM",
    titleFr: "LAB 14 - QCM NFS et Autofs",
    descriptionEn: "QCM on NFS exports and demand-based automounts.",
    descriptionFr: "QCM sur exports NFS et montages automatiques.",
    difficulty: "hard",
    estimatedDuration: 25,
    objectivesEn: "exports, exportfs, auto.master, autofs service",
    objectivesFr: "exports, exportfs, auto.master, autofs service",
    instructionsEn: toLabMcqJson(LAB_QCM_BANK.nfsAutofs),
    instructionsFr: toLabMcqJson(LAB_QCM_BANK.nfsAutofs),
    order: 14,
    chapterId: 9,
  },
  {
    id: 15,
    titleEn: "LAB 15 - Podman and Systemd QCM",
    titleFr: "LAB 15 - QCM Podman et Systemd",
    descriptionEn: "QCM on containers, generated units and rootless services.",
    descriptionFr: "QCM sur conteneurs, units generees et services rootless.",
    difficulty: "hard",
    estimatedDuration: 25,
    objectivesEn: "podman run, podman ps -a, generate systemd",
    objectivesFr: "podman run, podman ps -a, generate systemd",
    instructionsEn: toLabMcqJson(LAB_QCM_BANK.podman),
    instructionsFr: toLabMcqJson(LAB_QCM_BANK.podman),
    order: 15,
    chapterId: 12,
  },
  {
    id: 16,
    titleEn: "LAB 16 - Stratis and VDO QCM",
    titleFr: "LAB 16 - QCM Stratis et VDO",
    descriptionEn: "QCM on modern storage with Stratis and VDO concepts.",
    descriptionFr: "QCM sur stockage moderne avec Stratis et VDO.",
    difficulty: "hard",
    estimatedDuration: 26,
    objectivesEn: "stratis pool, fs create, vdo concepts",
    objectivesFr: "stratis pool, fs create, concepts vdo",
    instructionsEn: toLabMcqJson(LAB_QCM_BANK.stratisVdo),
    instructionsFr: toLabMcqJson(LAB_QCM_BANK.stratisVdo),
    order: 16,
    chapterId: 3,
  },
  {
    id: 17,
    titleEn: "LAB 17 - Boot and Recovery QCM",
    titleFr: "LAB 17 - QCM Boot et Recovery",
    descriptionEn: "QCM on root password reset and bootloader recovery.",
    descriptionFr: "QCM sur reset root password et recuperation boot.",
    difficulty: "hard",
    estimatedDuration: 24,
    objectivesEn: "rd.break, autorelabel, grub2-mkconfig",
    objectivesFr: "rd.break, autorelabel, grub2-mkconfig",
    instructionsEn: toLabMcqJson(LAB_QCM_BANK.bootRecovery),
    instructionsFr: toLabMcqJson(LAB_QCM_BANK.bootRecovery),
    order: 17,
    chapterId: 4,
  },
  {
    id: 18,
    titleEn: "LAB 18 - Mixed RHCSA Mock QCM",
    titleFr: "LAB 18 - QCM Mock RHCSA",
    descriptionEn:
      "Final mixed QCM combining networking, storage, SELinux and permissions.",
    descriptionFr: "QCM final mixte reseau, stockage, SELinux et permissions.",
    difficulty: "hard",
    estimatedDuration: 28,
    objectivesEn: "mixed troubleshooting and command choices",
    objectivesFr: "troubleshooting mixte et choix de commandes",
    instructionsEn: toLabMcqJson(LAB_QCM_BANK.mixedMock),
    instructionsFr: toLabMcqJson(LAB_QCM_BANK.mixedMock),
    order: 18,
    chapterId: 12,
  },
];

export const FALLBACK_EXAMS = [
  {
    id: 1,
    titleEn: "EXAM1",
    titleFr: "EXAM1",
    descriptionEn: "White test N6 with full System1/System2 practical tasks.",
    descriptionFr: scenario({
      initialisation: {
        System1: {
          Hostname: "system1.example.com",
          IP: "192.168.55.150/24",
          DNS: "192.168.5.1",
          GW: "192.168.5.1",
        },
        System2: {
          Hostname: "system2.example.com",
          IP: "192.168.55.151/24",
          DNS: "192.168.5.1",
          GW: "192.168.5.1",
        },
      },
      questions: {
        System1: [
          {
            question:
              "Reset the root password of the system1 server to password123.",
            answer:
              "Reboot and interrupt GRUB, append rd.break, boot. Then: mount -o remount,rw /sysroot; chroot /sysroot; passwd root; touch /.autorelabel; exit; exit",
          },
          {
            question:
              "Create a backup file /root/backup.tar.bz2 from /usr/local using bzip2.",
            answer: "tar -cjf /root/backup.tar.bz2 /usr/local",
          },
          {
            question: "Ensure selinux is enforcing mode.",
            answer:
              "getenforce; setenforce 1; sed -i 's/^SELINUX=.*/SELINUX=enforcing/' /etc/selinux/config",
          },
          {
            question: "Upgrade kernel and configure boot to previous kernel.",
            answer:
              "dnf update kernel -y; grub2-set-default 1; grub2-mkconfig -o /boot/grub2/grub.cfg",
          },
          {
            question: "Write hello to rsyslog every Monday at 17:30.",
            answer: "crontab -e; add: 30 17 * * 1 logger hello",
          },
          {
            question: "Find files owned by student and copy to /opt/dir.",
            answer:
              "mkdir -p /opt/dir; find / -user student -exec cp -a {} /opt/dir/ \\; 2>/dev/null",
          },
          {
            question:
              "Write script that finds files in /etc with size between 2bytes and 10M.",
            answer: "find /etc -size +2c -size -10M -type f",
          },
          {
            question:
              "Find lines containing /bin/bash from /etc/passwd and write to /tmp/testfile.",
            answer: "grep '/bin/bash' /etc/passwd > /tmp/testfile",
          },
          {
            question: "On system2 configure Europe time zone.",
            answer: "timedatectl set-timezone Europe/Paris",
          },
          {
            question: "Configure system1 as NTP client of system2.",
            answer:
              "Edit /etc/chrony.conf: server 192.168.55.151 iburst; systemctl restart chronyd; systemctl enable chronyd",
          },
          {
            question:
              "Add user1,user2,user3. user2 and user3 secondary group admin. password redhat.",
            answer:
              "groupadd admin; useradd user1; useradd -G admin user2; useradd -G admin user3; echo redhat | passwd --stdin user1; echo redhat | passwd --stdin user2; echo redhat | passwd --stdin user3",
          },
          {
            question: "Add admin group with gid 6000.",
            answer: "groupadd -g 6000 admin",
          },
          {
            question:
              "Create shared /home/admins with administrator group and SGID behavior.",
            answer:
              "groupadd administrator; mkdir -p /home/admins; chown :administrator /home/admins; chmod 2770 /home/admins",
          },
          {
            question:
              "Copy /etc/passwd to /var/tmp/pass and set ACL/ownership rules for user1 and user2.",
            answer:
              "cp /etc/passwd /var/tmp/pass; chown root:root /var/tmp/pass; chmod 000 /var/tmp/pass; setfacl -m u:user1:rw /var/tmp/pass; setfacl -m u:user2:--- /var/tmp/pass",
          },
          {
            question: "Enable ip_forward permanently.",
            answer:
              "echo 'net.ipv4.ip_forward = 1' >> /etc/sysctl.conf; sysctl -p",
          },
          {
            question: "Allow smtp service in firewall.",
            answer:
              "firewall-cmd --permanent --add-service=smtp; firewall-cmd --reload",
          },
          {
            question: "Autofs mount formateur1 home from server2.",
            answer:
              "dnf install -y autofs; configure /etc/auto.master and /etc/auto.home; systemctl enable --now autofs",
          },
          {
            question: "Set balanced profile as default tuned profile.",
            answer:
              "dnf install -y tuned; systemctl enable --now tuned; tuned-adm profile balanced",
          },
          {
            question:
              "Create container logserver from rsyslog for student with systemd and auto-start.",
            answer:
              "su - student; podman pull rsyslog; podman run -d --name logserver rsyslog; podman generate systemd --name logserver --files --new; systemctl --user enable --now container-logserver; loginctl enable-linger student",
          },
          {
            question:
              "Persist host journal and mount journal path for container under /home/student/container_logserver.",
            answer:
              "mkdir -p /var/log/journal; set Storage=persistent in /etc/systemd/journald.conf; systemctl restart systemd-journald; mkdir -p /home/student/container_logserver; podman run -d --name logserver -v /home/student/container_logserver:/var/log/journal:Z rsyslog",
          },
          {
            question: "From container write hello tekup to logs.",
            answer: "podman exec logserver logger 'hello tekup'",
          },
        ],
        System2: [
          {
            question:
              "Create 512M ext4 partition on /dev/sdb and mount persistently at /mnt/data1.",
            answer:
              "fdisk /dev/sdb; mkfs.ext4 /dev/sdb1; mkdir -p /mnt/data1; add UUID entry in /etc/fstab; mount -a",
          },
          {
            question:
              "Create 100M swap partition on /dev/sdb and activate at boot.",
            answer:
              "fdisk /dev/sdb; mkswap /dev/sdb2; add UUID swap entry in /etc/fstab; swapon -a",
          },
          {
            question:
              "Create VG vg PE 32M, Lvol1 ext4 on /mnt/lv1 and Lvol2 xfs on /mnt/lvo2 with persistent mounts.",
            answer:
              "pvcreate /dev/sdb3; vgcreate -s 32M vg /dev/sdb3; lvcreate -L 1256M -n Lvol1 vg; lvcreate -l 10 -n Lvol2 vg; mkfs.ext4 /dev/vg/Lvol1; mkfs.xfs /dev/vg/Lvol2; add /etc/fstab entries; mount -a",
          },
          {
            question: "Reduce Lvol1 size to 500M.",
            answer:
              "umount /mnt/lv1; e2fsck -f /dev/vg/Lvol1; resize2fs /dev/vg/Lvol1 500M; lvreduce -L 500M /dev/vg/Lvol1; mount /mnt/lv1",
          },
          {
            question: "Extend Lvol2 size to 620M.",
            answer: "lvextend -L 620M /dev/vg/Lvol2; xfs_growfs /mnt/lvo2",
          },
          {
            question:
              "Create VDO class1_vdo logical 30GB, xfs on /class1_mnt persistently.",
            answer:
              "dnf install -y vdo kmod-kvdo; vdo create --name=class1_vdo --device=/dev/sdc --vdoLogicalSize=30G; mkfs.xfs -K /dev/mapper/class1_vdo; mkdir -p /class1_mnt; add /etc/fstab entry; mount -a",
          },
        ],
      },
    }),
    timeLimit: 120,
    totalQuestions: 27,
    passingScore: 70.0,
    order: 1,
  },
  {
    id: 2,
    titleEn: "EXAM2",
    titleFr: "EXAM2",
    descriptionEn: "WT-3 full Server1/Server2 practical scenario.",
    descriptionFr: scenario({
      questions: {
        Server1: [
          "Create user eric with no interactive shell and home /base/eric.",
          "Set cron for guillaume to run /bin/echo hi at 14:23.",
          "Create additional 2G swap partition at boot without affecting original swap.",
          "Create LV vo size 300M with ext4 mounted on /vo.",
          "Extend vo to a size between 319M and 323M.",
          "Create /root/backup.tar.bz2 from /usr/local using bzip2.",
          "Create LV database in datastore VG with 50 extents, PE 16M, ext3, persistent mount /mnt/database.",
          "Create /home/admins shared directory for adminuser with inherited group.",
          "Create vg0/lv1 ext4 mounted on /data/lv1 and extend from 100M to 500M without data loss.",
          "Create alex uid 1234 with password alex111 and default file permissions rw----r--.",
          "Enable SELinux boolean container_manage_cgroup permanently.",
          "Create users alice bob charles, marketing group, and /marketing permission model with charles read-only.",
          "Set timezone and configure NTP.",
          "Set password aging for charles to 60 days.",
          "Lock bob account.",
          "Find all setuid files and save list to /testresults/setuid.list.",
          "As alice schedule periodic date append job for Sundays and Wednesdays between 3 and 4am.",
          "Remove bob ability to create cron jobs.",
          "Set SELinux mode to permissive.",
          "Create firewall rule dropping all traffic from 10.10.10.0.",
          "Enable passwordless SSH from dev@server1 to dev@server2.",
        ],
        "Server 2": [
          "Set umask so new files are owner read/write only.",
          "Create Derek Tom Kenny in instructors group; Tom no shell and expire in 10 days.",
          "Configure Apache to serve /var/web on port 94.",
          "Export ACPI lines from /var/log/messages to /root/logs and archive /var/log to /tmp/log_archive.tgz.",
          "Set GRUB timeout to 1 second.",
          "Create daily cron at 16:27 for Derek writing release info to /home/derek/release.",
          "Configure time.nist.gov as only NTP server.",
          "Create 800M swap partition.",
          "Create LV-A in VG-A with 30 extents and persistent mount on /mnt.",
          "Create container logs service from rsyslog image for derek with systemd auto-start.",
          "Persist journal and automount container log path under /home/derek/container_logs.",
          "Configure YUM repos under /etc/yum.repos2 with BaseOS and AppStream.",
          "Configure static network IP 10.10.1.10/8 gateway 10.10.1.255 DNS 8.8.8.8 hostname server2.",
          "Set recommended tuned profile.",
        ],
      },
    }),
    timeLimit: 150,
    totalQuestions: 34,
    passingScore: 70.0,
    order: 2,
  },
  {
    id: 3,
    titleEn: "EXAM3",
    titleFr: "EXAM3",
    descriptionEn:
      "WT4 with Part A clientnode and Part B servernode practical scenario.",
    descriptionFr: scenario({
      questions: {
        "Partie A : clientnode.example.com": [
          "Set multi-user target default, reboot, then switch to graphical target for session.",
          "Configure hostname and network 172.24.40.40/24 gw 172.24.40.1 dns 172.24.40.1.",
          "Create /home/teachers with group teacher and SGID behavior with restricted permissions.",
          "Find rows containing strat from /usr/share/dict/words and write to /tmp/testfile.",
          "Create user bob with shell /bin/sh.",
          "Create user tom with home /redhat/tom.",
          "Rename bob to maninder and set uid 5460.",
          "Set account expiration 2030-06-15 for maninder.",
          "Create group pgroup with gid 3000.",
          "Set tom password expire after 20 days.",
          "Set all user passwords to expire after 500 days.",
          "Enforce password policy with one uppercase and two digits.",
          "Create leonel uid 6003 on both hosts with autofs home mount behavior.",
          "Configure BaseOS and AppStream repos.",
          "Add servernode.example.com to /etc/hosts.",
          "Configure machine as NTP client of servernode.example.com.",
          "Configure httpd to run on port 82.",
        ],
        "Partie B : servernode.example.com": [
          "Reset root password to redhat.",
          "Set SELinux enforcing.",
          "Configure hostname and network 172.24.40.42/24 gw 172.24.40.1 dns 172.24.40.1.",
          "Create /home/manager with manager group ownership and SGID policy.",
          "Create gabriel uid 4223 password redhat with requested default umask behavior; create file1 file2 dir1 dir2.",
          "Locate files owned by gabriel and copy to /root/result.",
          "Find root-owned setuid files and copy to /root/output.",
          "Compress /root/output with bzip2.",
          "Find lines containing ip from /usr/share/dict/words into /root/found.",
          "Add 512MB swap partition persistently.",
          "Create lv in vg with 5 PEs of 32MB ext4 on /mnt/lv then resize to 225M-275M.",
          "Create vol in grp with 100 PEs of 8MB mounted on /vol with vfat.",
          "Create VDO thin logical size 50GB mounted on /thin with xfs persistently.",
          "Set recommended tuned profile.",
          "Create user thomas and connect to registry.access.redhat.com.",
          "Persist host journal across reboot.",
          "Create logserver container from rsyslog image as systemd service for thomas with journal automount.",
        ],
      },
    }),
    timeLimit: 150,
    totalQuestions: 34,
    passingScore: 70.0,
    order: 3,
  },
  {
    id: 4,
    titleEn: "EXAM4",
    titleFr: "EXAM4",
    descriptionEn: "WT-RHCA Machine1/Machine2 full practical scenario.",
    descriptionFr: scenario({
      initialisation: {
        "Machine 1": {
          Hostname: "client.example.com",
          IP: "192.168.1.50/24",
          DNS: "192.168.1.1",
          GW: "192.168.1.1",
        },
        "Machine 2": {
          Hostname: "server.example.com",
          IP: "192.168.1.30/24",
          DNS: "192.168.1.1",
          GW: "192.168.1.1",
        },
      },
      questions: {
        "Machine 1": [
          "Set multi-user target as default and reboot.",
          "Extract lines containing seismic from /usr/share/dict/words into /root/wordlist.",
          "Create user David with password aging policy.",
          "Create linuxadm and dba groups with gid 5000 and add David as secondary member.",
          "Rename linuxadm to sysadm and gid 6000; set David primary group sysadm.",
          "Create /archive with owner/group full access only and create targets file.",
          "Create melinda uid 4525 gid 3200 with requested default file/dir permissions.",
          "Copy /archive to /root/archive2 and set owner/group/ACL/sticky/sgid behavior as requested.",
          "Create /root/services with root/sysadm/melinda permissions as requested.",
          "Configure default BaseOS and AppStream repos from tek-up URLs.",
          "Create /root/backup.tar.bz2 from /usr/local.",
          "Mount /data NFS share from machine2 with automount behavior on /mnt/data.",
          "As user10 configure rsyslog container-logserver with persistent journal mount and systemd auto-start.",
          "Configure web server on port 87.",
          "Write script finding files owned by user10 with size >10KB and <10M to /tmp/find1.",
          "Enable SELinux boolean use_nfs_home_dirs permanently.",
          "Configure NTP client with server.example.com.",
        ],
        "Machine 2": [
          "Enforce password complexity and minimum size 7.",
          "Write /root/backup.sh to find files <2M from /usr into /root/backup.",
          "Create nightly /etc backup script scheduled at 23:00 except Sunday.",
          "Create additional 2G swap partition at boot.",
          "Create vgfs with PE 16MB and ext4vol/xfsvol then extend xfsvol to 157M-175M.",
          "Create user30 on both machines and configure NFS/autofs home mount under /nfshome.",
          "Create VDO vdo1 logical size 16GB xfs mounted on /xfsvdo1 persistently.",
          "Set timezone and configure NTP.",
          "Create periodic tracking cron job and remove bob cron ability.",
          "Submit at job at 11:30pm on March 31 2040 redirecting output to /tmp/date.out.",
          "Set recommended tuned profile.",
        ],
      },
    }),
    timeLimit: 150,
    totalQuestions: 28,
    passingScore: 70.0,
    order: 4,
  },
  {
    id: 5,
    titleEn: "EXAM5",
    titleFr: "EXAM5",
    descriptionEn: "WT-6 host1/host2 full practical scenario replacing WT11.",
    descriptionFr: scenario({
      initialisation: {
        "Part 1 (host1)": {
          Hostname: "host1",
          IP: "192.168.55.150/24",
          DNS: "192.168.55.1",
          GW: "192.168.55.1",
        },
        "Part 2 (host2)": {
          Hostname: "host2",
          IP: "192.168.55.151/24",
          DNS: "192.168.55.1",
          GW: "192.168.55.1",
        },
      },
      questions: {
        "Part 1 (host1)": [
          "Create sysadmin group, users Natasha and Jane with sysadmin secondary group, and Eric with no interactive shell; set passwords to Ericsson.",
          "Create collaborative /redhat/cms with sysadmin group ownership and SGID-style behavior.",
          "Copy /etc/fstab to /var/tmp/fstab and set requested owner/group/ACL permissions.",
          "Set password expiration to 30 days and enforce minimum one uppercase in password policy.",
          "Create user alex; prevent password change for 5 days; allow passwordless sudo.",
          "Create tekup group with passwordless sudo.",
          "Set Natasha cron daily at 14:23 running /bin/echo ciao.",
          "Configure host1 as NTP client of host2.",
          "Create 500MB swap partition without changing existing swap.",
          "Create necola uid 1212 with password lotanecola.",
          "Locate all files/directories of user jacob and copy to /root/findfiles.",
          "Find lines with localhost in /etc/hosts and write compact output to /root/list.",
          "Create VG vol0 and LV lv0 80MB xfs mounted persistently at /cms.",
          "Create LVi with 60 extents in Vgi (16MB extents) mounted persistently on /record using ext3.",
        ],
        "Part 2 (host2)": [
          "Create user mark uid 6003 on both machines and configure autofs mount behavior for /host1/mark.",
          "Create user mano with requested default file and directory permissions.",
          "Create testers group with passwordless sudo.",
          "Create /root/backup.tar.bz2 from /usr/local using bzip2.",
          "Interrupt boot and reset root password to tekup.",
          "Create user shangrilla and configure persistent host journal with rsyslog container service and mount path /home/shangrila/container-logserver.",
          "Configure HTTP server on port 83 serving exemple.html from /rep.",
          "Create VDO class1_vdo logical 30GB xfs on /class1_mnt persistent across reboot.",
        ],
      },
    }),
    timeLimit: 120,
    totalQuestions: 22,
    passingScore: 70.0,
    order: 5,
  },
];

export const FALLBACK_EXAM_QUESTIONS: any[] = [];
