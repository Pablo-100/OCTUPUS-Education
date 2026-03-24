const fs = require('fs');

let content = fs.readFileSync('./client/src/pages/ChapterDetail.tsx', 'utf-8');

const importPdf = "import jsPDF from 'jspdf';\nimport 'jspdf-autotable';";
content = content.replace('import { useState } from "react";', "import { useState } from \"react\";\n" + importPdf);

const pdfLogic = 
  const handleDownloadCheatsheet = () => {
    if (!chapter || !commands) return;
    
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text(\RHCSA Chapter \ Cheatsheet\, 14, 22);
    doc.setFontSize(16);
    doc.text(chapter.titleEn, 14, 32);
    
    // @ts-ignore
    doc.autoTable({
      startY: 40,
      head: [['Command', 'Description', 'Syntax']],
      body: commands.map(c => [c.nameEn, c.descriptionEn, c.syntax]),
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 30, fontStyle: 'bold' },
        1: { cellWidth: 80 },
        2: { cellWidth: 'auto', font: 'courier' }
      }
    });
    
    doc.save(\hcsa-chapter-\-cheatsheet.pdf\);
  };
;

content = content.replace(/const handleDownloadCheatsheet = \(\) => \{[\s\S]*?URL\.revokeObjectURL\(url\);\n  \};/, pdfLogic);

fs.writeFileSync('./client/src/pages/ChapterDetail.tsx', content);
console.log('Fixed PDF in ChapterDetail.tsx');
