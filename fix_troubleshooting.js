const fs = require('fs');
let content = fs.readFileSync('./client/src/pages/Troubleshooting.tsx', 'utf-8');

content = content.replace(/const { t } = useTranslation\(\);/, "const { t, language } = useTranslation();");

content = content.replace(/title: "User cannot login"/g, "title: language === 'fr' ? 'L\\'utilisateur ne peut pas se connecter' : 'User cannot login'");
content = content.replace(/symptoms: "Authentication failed, permission denied"/g, "symptoms: language === 'fr' ? 'Échec d\\'authentification, permission refusée' : 'Authentication failed, permission denied'");
content = content.replace(/solution: "Check user account status, verify password, check sudoers file"/g, "solution: language === 'fr' ? 'Vérifiez l\\'état du compte, le mot de passe, le fichier sudoers' : 'Check user account status, verify password, check sudoers file'");

content = content.replace(/title: "File permission denied"/g, "title: language === 'fr' ? 'Permission au fichier refusée' : 'File permission denied'");
content = content.replace(/symptoms: "Cannot read\/write file despite being owner"/g, "symptoms: language === 'fr' ? 'Impossible de lire/écrire le fichier malgré la propriété' : 'Cannot read/write file despite being owner'");
content = content.replace(/solution: "Use chmod to fix permissions, check SELinux context"/g, "solution: language === 'fr' ? 'Utilisez chmod pour corriger les permissions, vérifiez le contexte SELinux' : 'Use chmod to fix permissions, check SELinux context'");

content = content.replace(/title: "Network connectivity issues"/g, "title: language === 'fr' ? 'Problèmes de connectivité réseau' : 'Network connectivity issues'");
content = content.replace(/symptoms: "Cannot ping hosts, DNS not resolving"/g, "symptoms: language === 'fr' ? 'Impossible de pinger les hôtes, DNS non résolu' : 'Cannot ping hosts, DNS not resolving'");
content = content.replace(/solution: "Check network interface, verify DNS settings, check firewall"/g, "solution: language === 'fr' ? 'Vérifiez l\\'interface réseau, les paramètres DNS, le pare-feu' : 'Check network interface, verify DNS settings, check firewall'");

content = content.replace(/title: "Service won't start"/g, "title: language === 'fr' ? 'Le service ne démarre pas' : 'Service won\\'t start'");
content = content.replace(/symptoms: "systemctl start fails, service is inactive"/g, "symptoms: language === 'fr' ? 'systemctl start échoue, le service est inactif' : 'systemctl start fails, service is inactive'");
content = content.replace(/solution: "Check service logs, verify dependencies, check configuration"/g, "solution: language === 'fr' ? 'Vérifiez les journaux du service, les dépendances, la configuration' : 'Check service logs, verify dependencies, check configuration'");

content = content.replace(/title: "Disk space issues"/g, "title: language === 'fr' ? 'Problèmes d\\'espace disque' : 'Disk space issues'");
content = content.replace(/symptoms: "Disk full error, cannot write files"/g, "symptoms: language === 'fr' ? 'Erreur de disque plein, impossible d\\'écrire des fichiers' : 'Disk full error, cannot write files'");
content = content.replace(/solution: "Use df to check usage, find large files, clean temporary files"/g, "solution: language === 'fr' ? 'Utilisez df pour vérifier l\\'utilisation, trouvez les gros fichiers, nettoyez' : 'Use df to check usage, find large files, clean temporary files'");

content = content.replace(/title: "SELinux denials"/g, "title: language === 'fr' ? 'Refus SELinux' : 'SELinux denials'");
content = content.replace(/symptoms: "Permission denied errors in logs"/g, "symptoms: language === 'fr' ? 'Erreurs de permission refusée dans les journaux' : 'Permission denied errors in logs'");
content = content.replace(/solution: "Check audit logs, adjust SELinux policy, use semanage"/g, "solution: language === 'fr' ? 'Vérifiez les journaux d\\'audit, ajustez la politique SELinux, utilisez semanage' : 'Check audit logs, adjust SELinux policy, use semanage'");

content = content.replace(/title: "Kernel panic recovery"/g, "title: language === 'fr' ? 'Récupération après Kernel Panic' : 'Kernel panic recovery'");
content = content.replace(/symptoms: "System crashes with kernel panic message"/g, "symptoms: language === 'fr' ? 'Plantage du système avec un message de Kernel Panic' : 'System crashes with kernel panic message'");
content = content.replace(/solution: "Boot into rescue mode, check kernel logs, update kernel"/g, "solution: language === 'fr' ? 'Démarrez en mode rescue, vérifiez les journaux du noyau, mettez à jour le noyau' : 'Boot into rescue mode, check kernel logs, update kernel'");

content = content.replace(/title: "Corrupted file system"/g, "title: language === 'fr' ? 'Système de fichiers corrompu' : 'Corrupted file system'");
content = content.replace(/symptoms: "File system errors, cannot mount partition"/g, "symptoms: language === 'fr' ? 'Erreurs du système de fichiers, impossible de monter la partition' : 'File system errors, cannot mount partition'");
content = content.replace(/solution: "Run fsck in read-only mode, repair file system, restore from backup"/g, "solution: language === 'fr' ? 'Exécutez fsck en mode lecture seule, réparez le système, restaurez' : 'Run fsck in read-only mode, repair file system, restore from backup'");

content = content.replace(/title: "GRUB corruption"/g, "title: language === 'fr' ? 'Corruption de GRUB' : 'GRUB corruption'");
content = content.replace(/symptoms: "System won't boot, GRUB error"/g, "symptoms: language === 'fr' ? 'Le système ne démarre pas, erreur GRUB' : 'System won\\'t boot, GRUB error'");
content = content.replace(/solution: "Boot from live media, reinstall GRUB, verify boot configuration"/g, "solution: language === 'fr' ? 'Démarrez depuis un live CD, réinstallez GRUB, vérifiez la configuration' : 'Boot from live media, reinstall GRUB, verify boot configuration'");

content = content.replace(/title: "Performance degradation"/g, "title: language === 'fr' ? 'Dégradation des performances' : 'Performance degradation'");
content = content.replace(/symptoms: "System slow, high CPU\/memory usage"/g, "symptoms: language === 'fr' ? 'Système lent, forte utilisation CPU/mémoire' : 'System slow, high CPU/memory usage'");
content = content.replace(/solution: "Use top\/htop to identify processes, check I\/O, optimize services"/g, "solution: language === 'fr' ? 'Utilisez top/htop pour identifier les processus, vérifiez les E/S, optimisez' : 'Use top/htop to identify processes, check I/O, optimize services'");


content = content.replace(/<TabsTrigger value="common">Common Issues<\/TabsTrigger>/, '<TabsTrigger value="common">{language === \\'fr\\' ? \\'Problèmes courants\\' : \\'Common Issues\\'}</TabsTrigger>');
content = content.replace(/<TabsTrigger value="advanced">Advanced<\/TabsTrigger>/, '<TabsTrigger value="advanced">{language === \\'fr\\' ? \\'Avancé\\' : \\'Advanced\\'}</TabsTrigger>');
content = content.replace(/<TabsTrigger value="ai">AI Assistant<\/TabsTrigger>/, '<TabsTrigger value="ai">{language === \\'fr\\' ? \\'Assistant IA\\' : \\'AI Assistant\\'}</TabsTrigger>');
content = content.replace(/View Full Solution ?/, '{language === \\'fr\\' ? \\'Voir la solution complète ?\\' : \\'View Full Solution ?\\'}');
content = content.replace(/Describe your issue:/, '{language === \\'fr\\' ? \\'Décrivez votre problème :\\' : \\'Describe your issue:\\'}');
content = content.replace(/Describe your issue and get personalized troubleshooting help/, '{language === \\'fr\\' ? \\'Décrivez votre problème et obtenez de l\\\\\\'aide personnalisée\\' : \\'Describe your issue and get personalized troubleshooting help\\'}');

fs.writeFileSync('./client/src/pages/Troubleshooting.tsx', content);
console.log('Fixed Troubleshooting.tsx');
