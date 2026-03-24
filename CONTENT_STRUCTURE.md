# RHCSA Learning Platform - Content Structure

## 12 RHCSA Chapters Overview

### Chapter 1: System Administration Fundamentals

- User and group management
- File permissions and ownership
- Basic system administration concepts

### Chapter 2: User and Group Management

- Creating and managing users
- Creating and managing groups
- User authentication and sudo

### Chapter 3: File Systems and Storage

- Partition management with parted/fdisk
- LVM (Logical Volume Management)
- File system creation and mounting
- Disk quotas

### Chapter 4: Boot Process and Bootloader

- GRUB configuration
- Boot process understanding
- Kernel parameters
- Rescue mode

### Chapter 5: Networking Configuration

- Network interface configuration
- DNS and hostname configuration
- Network troubleshooting tools
- Firewall basics

### Chapter 6: SELinux (Security Enhanced Linux)

- SELinux contexts and policies
- SELinux modes and booleans
- Troubleshooting SELinux issues
- File and process contexts

### Chapter 7: System Services and Daemons

- systemd service management
- Service enabling and disabling
- Service status and logs
- Creating custom services

### Chapter 8: Package Management

- YUM/DNF package manager
- Repository configuration
- Package installation and updates
- Kernel updates

### Chapter 9: System Performance and Monitoring

- System monitoring tools
- Process management
- System resource analysis
- Performance tuning

### Chapter 10: Logging and Log Analysis

- System logging with rsyslog
- Log rotation
- Journal management
- Log analysis tools

### Chapter 11: Bash Scripting and Automation

- Shell scripting basics
- Variables and operators
- Control structures
- Functions and automation

### Chapter 12: Advanced Topics and Troubleshooting

- Kernel compilation
- System recovery
- Disaster recovery planning
- Advanced troubleshooting techniques

---

## 125+ Essential Linux Commands

### User and Group Management (12 commands)

1. useradd - Create new user accounts
2. userdel - Delete user accounts
3. usermod - Modify user account properties
4. passwd - Change user passwords
5. groupadd - Create new groups
6. groupdel - Delete groups
7. groupmod - Modify group properties
8. id - Display user and group IDs
9. whoami - Display current user
10. who - Show logged-in users
11. w - Show logged-in users with details
12. last - Show login history

### File and Directory Management (15 commands)

13. ls - List directory contents
14. cd - Change directory
15. pwd - Print working directory
16. mkdir - Create directories
17. rmdir - Remove empty directories
18. rm - Remove files and directories
19. cp - Copy files and directories
20. mv - Move/rename files
21. touch - Create empty files
22. find - Search for files
23. locate - Find files by name
24. which - Locate command executables
25. whereis - Locate command sources
26. file - Determine file type
27. stat - Display file statistics

### File Permissions and Ownership (8 commands)

28. chmod - Change file permissions
29. chown - Change file owner
30. chgrp - Change file group
31. umask - Set default permissions
32. getfacl - Display ACL permissions
33. setfacl - Set ACL permissions
34. sudo - Execute as superuser
35. visudo - Edit sudoers file

### Text Processing (12 commands)

36. cat - Display file contents
37. less - View file contents paginated
38. more - View file contents paginated
39. head - Display first lines
40. tail - Display last lines
41. grep - Search text patterns
42. sed - Stream editor
43. awk - Text processing language
44. cut - Extract columns
45. sort - Sort lines
46. uniq - Remove duplicates
47. wc - Count lines/words/characters

### Disk and Storage Management (15 commands)

48. fdisk - Partition table editor
49. parted - Partition editor
50. lsblk - List block devices
51. blkid - Display block device attributes
52. mkfs - Create file systems
53. mount - Mount file systems
54. umount - Unmount file systems
55. df - Display disk space usage
56. du - Display directory size
57. fsck - File system check
58. tune2fs - Adjust ext file systems
59. lvm - Logical volume management
60. pvcreate - Create physical volumes
61. vgcreate - Create volume groups
62. lvcreate - Create logical volumes

### Network Configuration (15 commands)

63. ip - Show/manipulate routing
64. ifconfig - Configure network interfaces
65. nmcli - Network Manager CLI
66. nmtui - Network Manager TUI
67. hostname - Display/set hostname
68. hostnamectl - Manage hostname
69. ping - Test network connectivity
70. traceroute - Trace network path
71. netstat - Network statistics
72. ss - Socket statistics
73. nslookup - DNS lookup
74. dig - DNS query
75. host - DNS lookup
76. curl - Transfer data with URLs
77. wget - Download files

### System Information and Monitoring (15 commands)

78. uname - System information
79. uptime - System uptime
80. top - Process monitor
81. htop - Interactive process monitor
82. ps - Process status
83. pgrep - Process grep
84. kill - Terminate processes
85. killall - Kill processes by name
86. nice - Set process priority
87. renice - Adjust process priority
88. free - Memory usage
89. vmstat - Virtual memory statistics
90. iostat - I/O statistics
91. sar - System activity reporter
92. dmesg - Display kernel messages

### SELinux Management (8 commands)

93. getenforce - Get SELinux mode
94. setenforce - Set SELinux mode
95. getsebool - Get SELinux boolean
96. setsebool - Set SELinux boolean
97. semanage - SELinux policy management
98. restorecon - Restore SELinux contexts
99. chcon - Change SELinux context
100.  seinfo - SELinux policy information

### Package Management (10 commands)

101. yum - Package manager
102. dnf - Package manager
103. rpm - RPM package manager
104. apt - Package manager (Debian)
105. dpkg - Debian package manager
106. yum-config-manager - Manage YUM repos
107. subscription-manager - Manage subscriptions
108. repoquery - Query package repositories
109. rpm2cpio - Convert RPM to CPIO
110. alien - Convert package formats

### System Services and Daemons (12 commands)

111. systemctl - Manage systemd services
112. systemd-analyze - Analyze systemd
113. journalctl - Query systemd journal
114. service - Manage services
115. chkconfig - Manage service runlevels
116. update-rc.d - Manage service runlevels
117. runlevel - Display current runlevel
118. init - Change runlevel
119. telinit - Change runlevel
120. systemd-nspawn - Container management
121. timedatectl - Manage time and date
122. localectl - Manage locale

### Advanced System Tools (8 commands)

123. tar - Archive files
124. gzip - Compress files
125. zip - Create ZIP archives
126. unzip - Extract ZIP archives
127. cron - Schedule tasks
128. at - Schedule one-time tasks
129. watch - Execute command repeatedly
130. screen - Terminal multiplexer

---

## 20+ Progressive Labs (Easy → Hard)

### Easy Labs (5)

1. **Lab 1**: User Creation and Basic Permissions
2. **Lab 2**: File System Navigation and Manipulation
3. **Lab 3**: Basic Networking Configuration
4. **Lab 4**: Package Installation and Management
5. **Lab 5**: Simple Bash Scripting

### Medium Labs (8)

6. **Lab 6**: LVM Configuration and Management
7. **Lab 7**: SELinux Policy Management
8. **Lab 8**: systemd Service Creation
9. **Lab 9**: Network Troubleshooting
10. **Lab 10**: Disk Quota Implementation
11. **Lab 11**: Advanced User Management
12. **Lab 12**: Firewall Configuration
13. **Lab 13**: Log Analysis and Rotation

### Hard Labs (7)

14. **Lab 14**: Complete System Recovery
15. **Lab 15**: Complex Network Configuration
16. **Lab 16**: SELinux Custom Policy
17. **Lab 17**: Performance Tuning and Optimization
18. **Lab 18**: Disaster Recovery Planning
19. **Lab 19**: System Hardening
20. **Lab 20**: Kernel Compilation and Configuration
21. **Lab 21**: Advanced Troubleshooting Scenario

---

## 5 Complete Exam Simulations

### Exam 1: Basic System Administration

- 20 questions covering Chapters 1-3
- Time limit: 60 minutes
- Focus: User management, file systems, basic administration

### Exam 2: Networking and Services

- 20 questions covering Chapters 5, 7, 8
- Time limit: 60 minutes
- Focus: Network configuration, services, packages

### Exam 3: Security and SELinux

- 20 questions covering Chapters 6, 10, 11
- Time limit: 60 minutes
- Focus: SELinux, logging, scripting

### Exam 4: Advanced Topics

- 20 questions covering Chapters 4, 9, 12
- Time limit: 60 minutes
- Focus: Boot process, performance, troubleshooting

### Exam 5: Full RHCSA Simulation

- 50 questions covering all 12 chapters
- Time limit: 120 minutes
- Focus: Comprehensive RHCSA exam simulation

---

## Troubleshooting Hub Categories

### Common Issues (15 scenarios)

1. User cannot login
2. File permission denied errors
3. Network connectivity issues
4. DNS resolution failures
5. Service won't start
6. Package installation failures
7. SELinux denials
8. Disk space issues
9. Memory leaks
10. High CPU usage
11. Boot failures
12. Mount failures
13. Permission denied on sudo
14. SSH connection issues
15. Firewall blocking traffic

### Advanced Troubleshooting (10 scenarios)

16. Kernel panic recovery
17. Corrupted file system
18. LVM issues
19. GRUB corruption
20. systemd failures
21. Journal corruption
22. Repository issues
23. Dependency conflicts
24. Performance degradation
25. Security breach response

---

## Cheatsheet Sections

Each chapter will have a downloadable PDF cheatsheet containing:

- Essential commands for the chapter
- Common options and flags
- Practical examples
- Quick reference tables
- Tips and tricks

---

## Content Metadata Structure

Each command will include:

- **Name**: Command name
- **Description**: What it does
- **Syntax**: Basic syntax
- **Options**: Common flags and options
- **Examples**: Real-world usage examples
- **Output**: Example command output
- **Related Commands**: Similar or related commands
- **Chapter**: Which chapter it belongs to
- **Difficulty**: Beginner/Intermediate/Advanced

Each lab will include:

- **Title**: Lab name
- **Difficulty**: Easy/Medium/Hard
- **Duration**: Estimated time
- **Objectives**: Learning goals
- **Prerequisites**: Required knowledge
- **Instructions**: Step-by-step guide
- **Validation**: How to verify completion
- **Solutions**: Detailed solutions

Each exam question will include:

- **Question**: The question text
- **Options**: Multiple choice options
- **Correct Answer**: The right answer
- **Explanation**: Why this is correct
- **Related Topics**: Relevant chapters
- **Difficulty**: Easy/Medium/Hard

---

## Database Schema Overview

### Tables Required

1. **users** - User accounts and profiles
2. **chapters** - Course chapters
3. **commands** - Linux commands database
4. **labs** - Lab exercises
5. **exams** - Exam definitions
6. **exam_questions** - Exam questions
7. **exam_answers** - User exam responses
8. **user_progress** - User progress tracking
9. **lab_submissions** - Lab submission tracking
10. **troubleshooting_scenarios** - Troubleshooting content
11. **certificates** - User certificates
12. **notifications** - User notifications

---

## Frontend Routes

- `/` - Home/Dashboard
- `/chapters` - All chapters list
- `/chapters/:id` - Chapter details and content
- `/commands` - Commands database
- `/commands/:id` - Command details
- `/terminal` - Interactive terminal
- `/labs` - Labs list
- `/labs/:id` - Lab details
- `/exams` - Exams list
- `/exams/:id` - Exam interface
- `/exams/:id/results` - Exam results
- `/troubleshooting` - Troubleshooting hub
- `/certificates` - User certificates
- `/profile` - User profile and progress
- `/settings` - User settings

---

## i18n Keys Structure

All content will be organized with i18n keys:

- `chapters.{chapterNumber}.title`
- `chapters.{chapterNumber}.description`
- `commands.{commandId}.name`
- `commands.{commandId}.description`
- `labs.{labId}.title`
- `exams.{examId}.title`
- And more...
