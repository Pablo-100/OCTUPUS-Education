import "dotenv/config";
import { getDb } from "./server/db.ts";
import { labs, examQuestions } from "./drizzle/schema.ts";
import { eq } from "drizzle-orm";

async function run() {
  const db = await getDb();
  if (!db) {
    console.error("Database connection failed");
    return;
  }

  console.log("Cleaning up old duplicate mock questions...");
  await db.delete(examQuestions).where(eq(examQuestions.examId, 1));
  await db.delete(examQuestions).where(eq(examQuestions.examId, 2));
  await db.delete(examQuestions).where(eq(examQuestions.examId, 3));
  await db.delete(examQuestions).where(eq(examQuestions.examId, 4));
  await db.delete(examQuestions).where(eq(examQuestions.examId, 5));

  const newQuestions = [
    // EXAM 1: Basic SysAdmin
    {
      e: 1,
      qE: "Which command shows the process tree?",
      qF: "Quelle commande affiche l'arborescence des processus ?",
      oE: ["pstree", "ps -ef", "top", "htop"],
      c: "A",
    },
    {
      e: 1,
      qE: "How do you change a user's password?",
      qF: "Comment changer le mot de passe d'un utilisateur ?",
      oE: ["chpass", "password", "passwd", "usermod"],
      c: "C",
    },
    {
      e: 1,
      qE: "Which command reveals disk space usage in human-readable format?",
      qF: "Quelle commande révèle l'utilisation de l'espace disque en format lisible ?",
      oE: ["df -h", "du -sh", "ls -l", "fdisk -l"],
      c: "A",
    },
    {
      e: 1,
      qE: "How to check available system memory?",
      qF: "Comment vérifier la mémoire système disponible ?",
      oE: ["meminfo", "free -m", "sysstat", "cat /proc/cpuinfo"],
      c: "B",
    },
    {
      e: 1,
      qE: "Which command copies a directory and its contents?",
      qF: "Quelle commande copie un répertoire et son contenu ?",
      oE: ["cp -d", "cp -a", "cp -r", "cp -c"],
      c: "C",
    },
    {
      e: 1,
      qE: "How to create a hard link to a file?",
      qF: "Comment créer un lien physique vers un fichier ?",
      oE: ["ln -s file link", "ln file link", "link file", "mklink file"],
      c: "B",
    },
    {
      e: 1,
      qE: "Find files larger than 10MB in /home?",
      qF: "Trouver les fichiers de plus de 10Mo dans /home ?",
      oE: [
        "find /home -size +10M",
        "find /home -size -10M",
        "search /home > 10M",
        "locate /home 10M",
      ],
      c: "A",
    },
    {
      e: 1,
      qE: "Command to show the running kernel version?",
      qF: "Commande pour afficher la version du noyau en cours ?",
      oE: ["uname -a", "uname -r", "kernel --version", "cat /etc/os-release"],
      c: "B",
    },
    {
      e: 1,
      qE: "How to list loaded kernel modules?",
      qF: "Comment lister les modules du noyau chargés ?",
      oE: ["listmod", "modprobe", "lsmod", "kmod"],
      c: "C",
    },
    {
      e: 1,
      qE: "Which command creates a compressed tar archive?",
      qF: "Quelle commande crée une archive tar compressée ?",
      oE: [
        "tar -cvf archive.tar dir",
        "tar -czvf archive.tar.gz dir",
        "tar -xzvf archive.tar.gz",
        "zip archive ",
      ],
      c: "B",
    },

    // EXAM 2: Networking
    {
      e: 2,
      qE: "Which command shows IP addresses on all interfaces?",
      qF: "Quelle commande affiche les adresses IP sur toutes les interfaces ?",
      oE: ["ifconfig -a", "ip addr show", "netstat -i", "nmcli ip"],
      c: "B",
    },
    {
      e: 2,
      qE: "Command to add a new connection via NetworkManager?",
      qF: "Commande pour ajouter une nouvelle connexion via NetworkManager ?",
      oE: ["nmcli net add", "nmcli con add", "ip link add", "net-add"],
      c: "B",
    },
    {
      e: 2,
      qE: "How to reload firewalld rules without losing state?",
      qF: "Comment recharger les règles firewalld sans perdre l'état ?",
      oE: [
        "firewall-cmd --reload",
        "systemctl reload firewalld",
        "firewall-cmd --restart",
        "firewall --update",
      ],
      c: "A",
    },
    {
      e: 2,
      qE: "Check currently active firewall zones?",
      qF: "Vérifier les zones de pare-feu actuellement actives ?",
      oE: [
        "firewall-cmd --get-zones",
        "firewall-cmd --get-active-zones",
        "firewall-cmd --list-all",
        "firewall-cmd --zone=active",
      ],
      c: "B",
    },
    {
      e: 2,
      qE: "Which command displays listening network ports?",
      qF: "Quelle commande affiche les ports réseau en écoute ?",
      oE: ["ss -tulpn", "netstat -an", "ip port show", "ports -l"],
      c: "A",
    },
    {
      e: 2,
      qE: "Command to perform DNS lookup?",
      qF: "Commande pour effectuer une résolution DNS ?",
      oE: ["nsresolve", "lookup", "dig", "ip dns"],
      c: "C",
    },
    {
      e: 2,
      qE: "How to persistently change the hostname?",
      qF: "Comment changer le nom d'hôte de manière persistante ?",
      oE: [
        "hostname newname",
        "hostnamectl set-hostname newname",
        "echo newname > /etc/hostname",
        "Both B and C",
      ],
      c: "D",
    },
    {
      e: 2,
      qE: "How to bring up a network interface named eth0?",
      qF: "Comment activer une interface réseau nommée eth0 ?",
      oE: [
        "ip link start eth0",
        "nmcli con up eth0",
        "ifup eth0",
        "All of the above",
      ],
      c: "D",
    },
    {
      e: 2,
      qE: "Command to view the routing table?",
      qF: "Commande pour afficher la table de routage ?",
      oE: ["ip route", "route show", "netstat -r", "ip path"],
      c: "A",
    },
    {
      e: 2,
      qE: "How to add a port to public zone permanently?",
      qF: "Comment ajouter un port à la zone publique de façon permanente ?",
      oE: [
        "firewall-cmd --zone=public --add-port=80/tcp --permanent",
        "firewall-cmd --port=80",
        "iptables -A INPUT -p tcp",
        "firewall-add 80",
      ],
      c: "A",
    },

    // EXAM 3: Security & SELinux
    {
      e: 3,
      qE: "Which command shows the current SELinux enforcing mode?",
      qF: "Quelle commande affiche le mode SELinux actuel ?",
      oE: ["sestatus", "getenforce", "Both A and B", "selinux-mode"],
      c: "C",
    },
    {
      e: 3,
      qE: "How to change a file's SELinux context temporarily?",
      qF: "Comment changer temporairement le contexte SELinux d'un fichier ?",
      oE: ["semanage", "chcon", "restorecon", "setcon"],
      c: "B",
    },
    {
      e: 3,
      qE: "How to restore default SELinux context of a directory?",
      qF: "Comment restaurer le contexte SELinux par défaut d'un répertoire ?",
      oE: [
        "restorecon -R /dir",
        "chcon --default /dir",
        "semanage --restore /dir",
        "setsebool /dir",
      ],
      c: "A",
    },
    {
      e: 3,
      qE: "Which command persistently maps a path to an SELinux context?",
      qF: "Quelle commande mappe de manière persistante un chemin à un contexte SELinux ?",
      oE: ["semanage fcontext -a", "chcon -P", "restorecon -p", "setsebool -t"],
      c: "A",
    },
    {
      e: 3,
      qE: "How to toggle an SELinux boolean permanently?",
      qF: "Comment basculer un booléen SELinux de façon permanente ?",
      oE: [
        "setsebool -P bool 1",
        "semanage boolean bool 1",
        "echo 1 > /selinux/bool",
        "chcon bool 1",
      ],
      c: "A",
    },
    {
      e: 3,
      qE: "Which tool parses audit.log to suggest SELinux policy rules?",
      qF: "Quel outil analyse audit.log pour suggérer des règles SELinux ?",
      oE: ["audit2allow", "sepolicy", "sealert", "ausearch"],
      c: "A",
    },
    {
      e: 3,
      qE: "How to switch SELinux to permissive mode temporarily?",
      qF: "Comment passer SELinux en mode permissif temporairement ?",
      oE: ["setenforce 0", "getenforce 0", "semanage permissive", "selinux 0"],
      c: "A",
    },
    {
      e: 3,
      qE: "Where are SSH login attempts logged?",
      qF: "Où sont enregistrées les tentatives de connexion SSH ?",
      oE: [
        "/var/log/messages",
        "/var/log/audit",
        "/var/log/secure",
        "/var/log/auth",
      ],
      c: "C",
    },
    {
      e: 3,
      qE: "Which command lists all SELinux booleans?",
      qF: "Quelle commande liste tous les booléens SELinux ?",
      oE: ["getsebool -a", "semanage boolean -l", "Both A and B", "lssebool"],
      c: "C",
    },
    {
      e: 3,
      qE: "To configure key-based SSH authentication, you must use...",
      qF: "Pour configurer l'authentification SSH par clé, vous devez utiliser...",
      oE: [
        "ssh-copy-id",
        "scp",
        "ssh-keygen",
        "Both ssh-keygen and ssh-copy-id",
      ],
      c: "D",
    },

    // EXAM 4: Storage
    {
      e: 4,
      qE: "Command to initialize a partition for LVM?",
      qF: "Commande pour initialiser une partition pour LVM ?",
      oE: ["pvcreate", "vgcreate", "lvcreate", "lvm init"],
      c: "A",
    },
    {
      e: 4,
      qE: "How to format a logical volume with XFS?",
      qF: "Comment formater un volume logique en XFS ?",
      oE: ["mkxfs", "format.xfs", "mkfs.xfs", "fsck.xfs"],
      c: "C",
    },
    {
      e: 4,
      qE: "Command to resize an EXT4 filesystem after logical volume extension?",
      qF: "Commande pour redimensionner un système de fichiers EXT4 ?",
      oE: ["xfs_growfs", "resize2fs", "fsck", "extendfs"],
      c: "B",
    },
    {
      e: 4,
      qE: "How to view block devices and their mount points cleanly?",
      qF: "Comment voir les périphériques blocs et leurs points de montage proprement ?",
      oE: ["fdisk", "parted", "lsblk", "blkid"],
      c: "C",
    },
    {
      e: 4,
      qE: "Which file is edited to mount filesystems automatically at boot?",
      qF: "Quel fichier modifier pour un montage automatique au boot ?",
      oE: ["/etc/mounts", "/etc/fstab", "/etc/mtab", "/etc/bootmount"],
      c: "B",
    },
    {
      e: 4,
      qE: "How to find the UUID of a partition?",
      qF: "Comment trouver l'UUID d'une partition ?",
      oE: ["uuidgen", "blkid", "ls-uuid", "cat /etc/uuid"],
      c: "B",
    },
    {
      e: 4,
      qE: "Command to extend a volume group with a new disk?",
      qF: "Commande pour étendre un groupe de volumes avec un nouveau disque ?",
      oE: ["vgextend", "lvextend", "pvgrow", "lvm extend"],
      c: "A",
    },
    {
      e: 4,
      qE: "Command to create a logical volume of 10G?",
      qF: "Commande pour créer un volume logique de 10G ?",
      oE: [
        "lvcreate -L 10G -n mylv myvg",
        "lvcreate -s 10G mylv myvg",
        "vgcreate 10G mylv",
        "make-lv 10G",
      ],
      c: "A",
    },
    {
      e: 4,
      qE: "What does VDO stand for?",
      qF: "Que signifie VDO ?",
      oE: [
        "Virtual Data Optimizer",
        "Volume Disk Operator",
        "Virtual Device Origin",
        "Volume Data Organizer",
      ],
      c: "A",
    },
    {
      e: 4,
      qE: "How to check free physical extents in a VG?",
      qF: "Comment vérifier les extents physiques libres dans un VG ?",
      oE: ["vgdisplay", "pvdisplay", "vgs", "All of the above"],
      c: "D",
    },

    // EXAM 5: Full Simulation
    {
      e: 5,
      qE: "Which tool is best for finding the bottleneck during high CPU usage?",
      qF: "Quel outil est le meilleur pour trouver le problème lors d'une forte utilisation CPU ?",
      oE: ["top", "free", "df", "iostat"],
      c: "A",
    },
    {
      e: 5,
      qE: "How to restart a systemd service?",
      qF: "Comment redémarrer un service systemd ?",
      oE: [
        "systemctl restart service",
        "service restart",
        "systemd restart",
        "init 6",
      ],
      c: "A",
    },
    {
      e: 5,
      qE: "In chrony, chronyc sources command is used to...",
      qF: "Dans chrony, la commande chronyc sources sert à...",
      oE: [
        "View NTP peers and synchronization status",
        "Add a new source",
        "Remove a source",
        "Set the timezone",
      ],
      c: "A",
    },
    {
      e: 5,
      qE: "Cron expression `0 2 * * 1` means?",
      qF: "L'expression cron `0 2 * * 1` signifie ?",
      oE: [
        "2 AM every day",
        "2 AM every Monday",
        "Every 2 hours on Monday",
        "Midnight on Tuesday",
      ],
      c: "B",
    },
    {
      e: 5,
      qE: "How to run a container in background using Podman?",
      qF: "Comment exécuter un conteneur en arrière-plan avec Podman ?",
      oE: [
        "podman run -b",
        "podman run -d",
        "podman start bg",
        "podman run --daemon",
      ],
      c: "B",
    },
    {
      e: 5,
      qE: "Command to list available module streams in DNF?",
      qF: "Commande pour lister les flux de modules DNF ?",
      oE: [
        "dnf list modules",
        "dnf module list",
        "dnf streams",
        "dnf find modules",
      ],
      c: "B",
    },
    {
      e: 5,
      qE: "How to set special SGID permission on a directory?",
      qF: "Comment définir la permission spéciale SGID sur un répertoire ?",
      oE: ["chmod g+s dir", "chmod 2770 dir", "Both A and B", "chown g+s dir"],
      c: "C",
    },
    {
      e: 5,
      qE: "Command to undo the last dnf transaction?",
      qF: "Commande pour annuler la dernière transaction dnf ?",
      oE: [
        "dnf undo",
        "dnf rollback",
        "dnf history undo last",
        "none of the above",
      ],
      c: "C",
    },
    {
      e: 5,
      qE: "How to append the string 'server' to a file using bash?",
      qF: "Comment ajouter la chaîne 'server' à un fichier via bash ?",
      oE: [
        "echo 'server' > file",
        "echo 'server' >> file",
        "cat 'server' > file",
        "append 'server' file",
      ],
      c: "B",
    },
    {
      e: 5,
      qE: "During password recovery, what must be done after changing root password to ensure SELinux policy is applied to /etc/shadow?",
      qF: "Lors de la récupération du mdp, que faire après pour qu'SELinux relabellise ?",
      oE: [
        "touch /.autorelabel",
        "setenforce 1",
        "semanage rebuild",
        "restorecon -R /",
      ],
      c: "A",
    },
  ];

  let qIdBase = 1000;
  for (const q of newQuestions) {
    await db.insert(examQuestions).values({
      id: qIdBase++,
      examId: q.e,
      questionEn: q.qE,
      questionFr: q.qF,
      optionsEn: JSON.stringify(q.oE),
      optionsFr: JSON.stringify(q.oE),
      correctAnswer: q.c,
      explanationEn: "Correct answer is " + q.c,
      explanationFr: "La bonne réponse est " + q.c,
      difficulty: "medium",
      order: qIdBase,
    });
  }
  console.log("Inserted custom EXAM questions.");

  // ================= LABS FIX =================
  const labSteps: Record<number, any[]> = {
    1: [
      {
        t: "Create User",
        d: "Add a new user named 'johndoe'",
        c: "useradd johndoe",
      },
      {
        t: "Set Password",
        d: "Set the password for 'johndoe' to 'redhat'",
        c: "passwd johndoe",
      },
      {
        t: "Create Directory",
        d: "Create a directory under /data",
        c: "mkdir -p /data",
      },
      {
        t: "Change Ownership",
        d: "Make johndoe the owner of /data",
        c: "chown johndoe /data",
      },
      {
        t: "Set Permissions",
        d: "Ensure only the owner has read/write/execute rights",
        c: "chmod 700 /data",
      },
    ],
    2: [
      { t: "Navigate", d: "Change directory to /var/tmp", c: "cd /var/tmp" },
      {
        t: "Create File",
        d: "Touch a new file called 'practice.txt'",
        c: "touch practice.txt",
      },
      {
        t: "Copy File",
        d: "Copy this file to /tmp",
        c: "cp practice.txt /tmp/",
      },
      {
        t: "List Contents",
        d: "Verify the file is in /tmp",
        c: "ls -l /tmp/practice.txt",
      },
      {
        t: "Remove File",
        d: "Delete the original file in /var/tmp",
        c: "rm practice.txt",
      },
    ],
    3: [
      {
        t: "Create PV",
        d: "Initialize physical volume on /dev/vdb",
        c: "pvcreate /dev/vdb",
      },
      {
        t: "Create VG",
        d: "Create volume group 'vg_data' from /dev/vdb",
        c: "vgcreate vg_data /dev/vdb",
      },
      {
        t: "Create LV",
        d: "Create a 1GB logical volume named 'lv_data'",
        c: "lvcreate -n lv_data -L 1G vg_data",
      },
      {
        t: "Format FS",
        d: "Format the logical volume as ext4",
        c: "mkfs.ext4 /dev/vg_data/lv_data",
      },
      {
        t: "Mount FS",
        d: "Mount the filesystem on /mnt/data",
        c: "mkdir /mnt/data; mount /dev/vg_data/lv_data /mnt/data",
      },
    ],
    4: [
      {
        t: "Create Snapshot",
        d: "Create a snapshot 'lv_snap' of 'lv_data'",
        c: "lvcreate -s -n lv_snap -L 500M /dev/vg_data/lv_data",
      },
      {
        t: "Mount Snapshot",
        d: "Mount the snapshot to verify data",
        c: "mkdir /mnt/snap; mount /dev/vg_data/lv_snap /mnt/snap",
      },
      {
        t: "Verify Snapshot",
        d: "List the contents inside the snapshot",
        c: "ls -lah /mnt/snap",
      },
      {
        t: "Unmount Snapshot",
        d: "Unmount the snapshot",
        c: "umount /mnt/snap",
      },
      {
        t: "Remove Snapshot",
        d: "Remove the snapshot logical volume",
        c: "lvremove -y /dev/vg_data/lv_snap",
      },
    ],
    5: [
      {
        t: "Check Service",
        d: "Check the status of httpd",
        c: "systemctl status httpd",
      },
      {
        t: "Start Service",
        d: "Start the httpd service",
        c: "systemctl start httpd",
      },
      {
        t: "Enable Service",
        d: "Enable httpd to start at boot",
        c: "systemctl enable httpd",
      },
      {
        t: "List Timers",
        d: "View all active system systemd timers",
        c: "systemctl list-timers",
      },
      {
        t: "Mask Service",
        d: "Mask firewalld to prevent it from starting",
        c: "systemctl mask firewalld",
      },
    ],
    6: [
      {
        t: "Show Connections",
        d: "Display all NetworkManager connections",
        c: "nmcli con show",
      },
      {
        t: "Add Connection",
        d: "Add an ethernet connection for interface eth1",
        c: "nmcli con add type ethernet con-name eth1 ifname eth1",
      },
      {
        t: "Set IP",
        d: "Set static IP 192.168.50.10/24",
        c: "nmcli con mod eth1 ipv4.addresses 192.168.50.10/24",
      },
      {
        t: "Set Manual",
        d: "Set network method to manual",
        c: "nmcli con mod eth1 ipv4.method manual",
      },
      { t: "Activate", d: "Bring the connection up", c: "nmcli con up eth1" },
    ],
    7: [
      {
        t: "Check Zone",
        d: "Get the active default zone",
        c: "firewall-cmd --get-default-zone",
      },
      {
        t: "Open Port",
        d: "Open port 8080/tcp permanently",
        c: "firewall-cmd --add-port=8080/tcp --permanent",
      },
      {
        t: "Add Service",
        d: "Allow https service permanently",
        c: "firewall-cmd --add-service=https --permanent",
      },
      {
        t: "Reload Rules",
        d: "Reload firewalld configuration",
        c: "firewall-cmd --reload",
      },
      {
        t: "List Rules",
        d: "List all active rules",
        c: "firewall-cmd --list-all",
      },
    ],
    8: [
      { t: "Status Check", d: "Check current SELinux mode", c: "getenforce" },
      {
        t: "Define Context",
        d: "Set default context for /custom as web content",
        c: "semanage fcontext -a -t httpd_sys_content_t '/custom(/.*)?'",
      },
      {
        t: "Apply Context",
        d: "Apply the context to /custom",
        c: "restorecon -R -v /custom",
      },
      {
        t: "Set Boolean",
        d: "Allow httpd network connection permanently",
        c: "setsebool -P httpd_can_network_connect 1",
      },
      {
        t: "Verify Boolean",
        d: "Check the state of the boolean",
        c: "getsebool httpd_can_network_connect",
      },
    ],
    9: [
      {
        t: "Run Container",
        d: "Start a detached nginx container",
        c: "podman run -d --name web -p 8080:80 nginx",
      },
      { t: "List Containers", d: "Check running containers", c: "podman ps" },
      {
        t: "Stop Container",
        d: "Stop the web container",
        c: "podman stop web",
      },
      {
        t: "Remove Container",
        d: "Remove the web container",
        c: "podman rm web",
      },
      {
        t: "List Images",
        d: "Check downloaded podman images",
        c: "podman images",
      },
    ],
    10: [
      {
        t: "Systemd Generate",
        d: "Generate systemd unit file for podman container",
        c: "podman generate systemd --new --name web > ~/.config/systemd/user/container-web.service",
      },
      {
        t: "Reload Daemon",
        d: "Reload systemd user daemon",
        c: "systemctl --user daemon-reload",
      },
      {
        t: "Enable Container",
        d: "Enable container service at boot",
        c: "systemctl --user enable --now container-web.service",
      },
      {
        t: "Linger",
        d: "Enable linger for current user so container runs without login",
        c: "loginctl enable-linger $USER",
      },
      {
        t: "Check Linger",
        d: "Verify linger status",
        c: "ls /var/lib/systemd/linger",
      },
    ],
    11: [
      {
        t: "Install",
        d: "Install stratisd and stratis-cli",
        c: "dnf install stratisd stratis-cli",
      },
      {
        t: "Start Service",
        d: "Enable and start stratisd",
        c: "systemctl enable --now stratisd",
      },
      {
        t: "Create Pool",
        d: "Create stratis pool 'pool1' on disk /dev/vdc",
        c: "stratis pool create pool1 /dev/vdc",
      },
      {
        t: "Create FS",
        d: "Create filesystem 'fs1' inside pool1",
        c: "stratis filesystem create pool1 fs1",
      },
      {
        t: "Mount FS",
        d: "Mount the stratis filesystem",
        c: "mkdir /mnt/stratis; mount /stratis/pool1/fs1 /mnt/stratis",
      },
    ],
    12: [
      {
        t: "Install VDO",
        d: "Install VDO packages",
        c: "dnf install vdo kmod-kvdo",
      },
      {
        t: "Create Volume",
        d: "Create a 50G logical VDO volume on a 10G physical disk",
        c: "vdo create --name=vdo1 --device=/dev/vdd --vdoLogicalSize=50G",
      },
      {
        t: "Format Volume",
        d: "Make XFS file system on the VDO device",
        c: "mkfs.xfs -K /dev/mapper/vdo1",
      },
      {
        t: "Check Stats",
        d: "Check the VDO volume statistics",
        c: "vdostats --human-readable",
      },
      {
        t: "Mount",
        d: "Mount the volume to /vdo",
        c: "mkdir /vdo; mount /dev/mapper/vdo1 /vdo",
      },
    ],
    13: [
      { t: "Edit Cron", d: "Add a cron job for current user", c: "crontab -e" },
      { t: "View Cron", d: "List user cron jobs", c: "crontab -l" },
      {
        t: "Schedule At",
        d: "Schedule a job in 5 minutes with at",
        c: "echo 'logger Backup done' | at now + 5 minutes",
      },
      { t: "View At", d: "List pending 'at' jobs", c: "atq" },
      {
        t: "System Cron",
        d: "View the system-wide crontab file",
        c: "cat /etc/crontab",
      },
    ],
    14: [
      {
        t: "Search Package",
        d: "Search for the apache package",
        c: "dnf search httpd",
      },
      { t: "Install Package", d: "Install httpd", c: "dnf install -y httpd" },
      {
        t: "List Modules",
        d: "List available software modules for python",
        c: "dnf module list python39",
      },
      {
        t: "View History",
        d: "View DNF transaction history",
        c: "dnf history",
      },
      {
        t: "Undo History",
        d: "Undo the last DNF transaction",
        c: "dnf history undo last",
      },
    ],
    15: [
      {
        t: "System Stats",
        d: "Check CPU/Memory continuously 3 times",
        c: "vmstat 1 3",
      },
      { t: "I/O Stats", d: "Check disk I/O performance", c: "iostat -x 1 3" },
      {
        t: "Process Tree",
        d: "Display the process tree with PIDs",
        c: "pstree -p",
      },
      {
        t: "Top Usage",
        d: "Run top command in batch mode to print once",
        c: "top -n 1 -b",
      },
      {
        t: "Kill Process",
        d: "Terminate a rogue process (example PID 1234)",
        c: "kill -9 1234",
      },
    ],
    16: [
      {
        t: "Read Logs",
        d: "Tail the last 20 lines of messages log",
        c: "tail -n 20 /var/log/messages",
      },
      {
        t: "Query Journal",
        d: "Query journald for sshd logs",
        c: "journalctl -u sshd",
      },
      {
        t: "Persist Journal",
        d: "Create directory to make journal logs persistent",
        c: "mkdir -p /var/log/journal",
      },
      {
        t: "Reload Journald",
        d: "Reload configuration to apply persistence",
        c: "systemctl restart systemd-journald",
      },
      {
        t: "Query Time",
        d: "Query journald for errors in the last hour",
        c: "journalctl -p err --since '1 hour ago'",
      },
    ],
    17: [
      {
        t: "Generate Key",
        d: "Generate an SSH key pair",
        c: "ssh-keygen -t rsa -N '' -f ~/.ssh/id_rsa",
      },
      {
        t: "Copy Key",
        d: "Copy public key to target server (assume serverB)",
        c: "ssh-copy-id user@serverB",
      },
      {
        t: "Disable Root",
        d: "Edit sshd_config to disable root login",
        c: "sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config",
      },
      {
        t: "Disable PW Auth",
        d: "Disable password-based login in sshd_config",
        c: "sed -i 's/^PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config",
      },
      {
        t: "Restart SSH",
        d: "Restart SSH daemon to apply changes",
        c: "systemctl restart sshd",
      },
    ],
    18: [
      {
        t: "Interrupt Boot",
        d: "Press 'e' on GRUB menu and add rd.break to linux line",
        c: "# Press 'e' on boot",
      },
      {
        t: "Remount Sysroot",
        d: "Remount root filesystem as read/write",
        c: "mount -o remount,rw /sysroot",
      },
      { t: "Chroot", d: "Change root into the sysroot", c: "chroot /sysroot" },
      { t: "Change Password", d: "Reset the root password", c: "passwd root" },
      {
        t: "Autorelabel",
        d: "Create file to trigger SELinux relabeling",
        c: "touch /.autorelabel",
      },
    ],
    19: [
      {
        t: "Set ACL",
        d: "Give user 'student' read and write access to /data/file",
        c: "setfacl -m u:student:rw /data/file",
      },
      {
        t: "View ACL",
        d: "Verify the ACL rules on the file",
        c: "getfacl /data/file",
      },
      {
        t: "Set SGID",
        d: "Set SGID permission on /shared directory",
        c: "chmod g+s /shared",
      },
      {
        t: "Verify SGID",
        d: "Verify the sticky bit letter 's' appears in permissions",
        c: "ls -ld /shared",
      },
      {
        t: "Remove ACL",
        d: "Remove all extended ACL entries from the file",
        c: "setfacl -b /data/file",
      },
    ],
    20: [
      {
        t: "Install Chrony",
        d: "Ensure chrony is installed",
        c: "dnf install chrony",
      },
      {
        t: "Set Timezone",
        d: "Set the system timezone to Europe/Paris",
        c: "timedatectl set-timezone Europe/Paris",
      },
      {
        t: "Edit Conf",
        d: "Add a specific NTP server pool in configuration",
        c: "echo 'server pool.ntp.org iburst' >> /etc/chrony.conf",
      },
      {
        t: "Restart Chronyd",
        d: "Restart the time sync daemon",
        c: "systemctl restart chronyd",
      },
      {
        t: "Verify Sync",
        d: "Verify that chrony is synchronized",
        c: "chronyc sources -v",
      },
    ],
    21: [
      {
        t: "Comprehensive 1",
        d: "Create user 'admin', set password, and add to 'wheel' group",
        c: "useradd -G wheel admin; echo 'redhat' | passwd --stdin admin",
      },
      {
        t: "Comprehensive 2",
        d: "Create 2GB LVM partition, mount to /app, and add to fstab",
        c: "lvcreate -n lv_app -L 2G vg_sys; mkfs.xfs /dev/vg_sys/lv_app; echo '/dev/vg_sys/lv_app /app xfs defaults 0 0' >> /etc/fstab",
      },
      {
        t: "Comprehensive 3",
        d: "Install, start httpd, open firewall for web",
        c: "dnf install httpd; systemctl enable --now httpd; firewall-cmd --add-service=http --permanent; firewall-cmd --reload",
      },
      {
        t: "Comprehensive 4",
        d: "Set SELinux context for /app to web content",
        c: "semanage fcontext -a -t httpd_sys_content_t '/app(/.*)?'; restorecon -R -v /app",
      },
      {
        t: "Comprehensive 5",
        d: "Configure cron to log 'System OK' every 5 minutes",
        c: "echo '*/5 * * * * logger System OK' > /var/spool/cron/root",
      },
    ],
  };

  for (let i = 1; i <= 21; i++) {
    const steps = labSteps[i] || labSteps[1]; // fallback to 1 if not exists

    // Transform arrays to proper objects expected by our Lab UI
    const formattedSteps = steps.map((s, idx) => ({
      title: `Step ${idx + 1}: ${s.t}`,
      description: s.d,
      command: `$ ${s.c}`,
      hint: "Follow the objective carefully.",
    }));

    // Update the DB
    await db
      .update(labs)
      .set({
        instructionsEn: JSON.stringify(formattedSteps, null, 2),
        instructionsFr: JSON.stringify(formattedSteps, null, 2),
      })
      .where(eq(labs.id, i));
  }
  console.log("Updated LAB instructions with distinct specific steps.");

  process.exit(0);
}

run().catch(console.error);
