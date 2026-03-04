import PDFDocument from "pdfkit";
import type { Response } from "express";
import path from "path";
import fs from "fs";

interface ExamBoardPDFData {
  examBoardCode: string;
  subjectName: string;
  examDate: string;
  enrollmentOpenAt: string;
  enrollmentCloseAt: string;
  status: string;
  enrollments: Array<{
    enrollmentId: string;
    studentId: string;
    eligible: boolean;
    status: string;
  }>;
}

/**
 * Generate PDF for exam board enrollment list
 * This PDF includes institutional header, exam board details, and enrolled students table
 */
export async function generateExamBoardEnrollmentsPDF(
  data: ExamBoardPDFData,
  res: Response
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        }
      });

      // Set response headers for PDF download
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="mesa-${data.examBoardCode}.pdf"`
      );

      // Pipe PDF to response
      doc.pipe(res);

      // Track current Y position
      let yPos = 50;

      // Header - Institutional Logo
      const logoPath = path.join(__dirname, "../../882f78e51403fb66a620edda9eb68c16.jpg");
      
      if (fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, 50, yPos, { width: 60, height: 60 });
        } catch (error) {
          console.warn("Could not load logo image:", error);
        }
      }

      // Institution name
      doc
        .fontSize(16)
        .fillColor("#000000")
        .font("Helvetica-Bold")
        .text("I.S.E.F. Nro. 27 Prof. César S. Vásquez", 50, yPos + 20, {
          align: "center"
        });

      doc
        .fontSize(12)
        .font("Helvetica")
        .text("Santa Fe Capital", 50, yPos + 40, { align: "center" });

      yPos += 80;

      // Document title
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .text("LISTA DE INSCRIPTOS A MESA EXAMINADORA", 50, yPos, {
          align: "center",
          underline: true
        });

      yPos += 40;

      // Exam board details
      doc.fontSize(11).font("Helvetica");

      const details = [
        { label: "Código de Mesa:", value: data.examBoardCode },
        { label: "Materia:", value: data.subjectName },
        { label: "Fecha de Examen:", value: data.examDate },
        { label: "Período de Inscripción:", value: `${data.enrollmentOpenAt} - ${data.enrollmentCloseAt}` },
        { label: "Estado:", value: data.status },
        { label: "Total de Inscriptos:", value: String(data.enrollments.length) }
      ];

      for (const detail of details) {
        doc
          .font("Helvetica-Bold")
          .text(detail.label, 50, yPos, { continued: true, width: 200 })
          .font("Helvetica")
          .text(" " + detail.value);
        yPos += 20;
      }

      yPos += 20;

      // Enrollments table
      if (data.enrollments.length === 0) {
        doc
          .fontSize(11)
          .font("Helvetica-Oblique")
          .text("No hay inscriptos registrados para esta mesa.", 50, yPos);
      } else {
        // Table header
        const tableTop = yPos;
        const col1X = 50;
        const col2X = 200;
        const col3X = 350;
        const col4X = 450;
        const rowHeight = 25;

        doc
          .fontSize(10)
          .font("Helvetica-Bold")
          .fillColor("#000000");

        // Draw header background
        doc
          .rect(col1X, tableTop, 495, rowHeight)
          .fillAndStroke("#EEEEEE", "#000000");

        // Header text
        doc
          .fillColor("#000000")
          .text("N°", col1X + 5, tableTop + 8, { width: 40 })
          .text("Estudiante ID", col2X + 5, tableTop + 8, { width: 140 })
          .text("Elegible", col3X + 5, tableTop + 8, { width: 90 })
          .text("Estado", col4X + 5, tableTop + 8, { width: 90 });

        yPos = tableTop + rowHeight;

        // Table rows
        doc.fontSize(9).font("Helvetica");

        data.enrollments.forEach((enrollment, index) => {
          // Check if we need a new page
          if (yPos > 700) {
            doc.addPage();
            yPos = 50;
          }

          // Alternate row background
          if (index % 2 === 0) {
            doc.rect(col1X, yPos, 495, rowHeight).fill("#F9F9F9");
          }

          doc
            .fillColor("#000000")
            .text(String(index + 1), col1X + 5, yPos + 8, { width: 40 })
            .text(enrollment.studentId, col2X + 5, yPos + 8, { width: 140 })
            .text(enrollment.eligible ? "SÍ" : "NO", col3X + 5, yPos + 8, { width: 90 })
            .text(enrollment.status, col4X + 5, yPos + 8, { width: 90 });

          // Draw row border
          doc
            .strokeColor("#CCCCCC")
            .lineWidth(0.5)
            .moveTo(col1X, yPos + rowHeight)
            .lineTo(col1X + 495, yPos + rowHeight)
            .stroke();

          yPos += rowHeight;
        });
      }

      // Footer with generation date
      const now = new Date();
      const footerText = `Generado el ${now.toLocaleDateString("es-AR")} a las ${now.toLocaleTimeString("es-AR")}`;

      doc
        .fontSize(8)
        .fillColor("#666666")
        .text(footerText, 50, 770, { align: "center" });

      // Finalize PDF
      doc.end();

      doc.on("end", () => {
        resolve();
      });

      doc.on("error", (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
}
