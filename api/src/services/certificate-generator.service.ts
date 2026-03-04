import PDFDocument from "pdfkit";
import type { Response } from "express";
import path from "path";
import fs from "fs";

interface CertificateField {
  name: string;
  type: "text" | "date" | "number"; // text, date, number
  label: string;
  value: string;
}

interface CertificateData {
  certificateCode: string;
  certificateType: string;
  studentName: string;
  studentId: string;
  issueDate: string;
  fields: CertificateField[];
  rules?: string[];
}

/**
 * Generate PDF for certificate
 */
export async function generateCertificatePDF(
  data: CertificateData,
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
        },
        bufferPages: true
      });

      // Set response headers for PDF download
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="certificado-${data.certificateCode}.pdf"`
      );

      // Pipe PDF to response
      doc.pipe(res);

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

      yPos += 100;

      // Certificate title
      doc
        .fontSize(24)
        .font("Helvetica-Bold")
        .fillColor("#1a4d6d")
        .text(data.certificateType.toUpperCase(), 50, yPos, {
          align: "center"
        });

      yPos += 50;

      // Decorative line
      doc
        .moveTo(100, yPos)
        .lineTo(500, yPos)
        .strokeColor("#1a4d6d")
        .lineWidth(2)
        .stroke();

      yPos += 30;

      // Body text - greeting
      doc
        .fontSize(12)
        .fillColor("#000000")
        .font("Helvetica")
        .text("Por este medio se certifica que:", 50, yPos, { align: "center" });

      yPos += 30;

      // Student name - prominent
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .text(data.studentName.toUpperCase(), 50, yPos, {
          align: "center"
        });

      yPos += 30;

      // Dynamic fields
      doc.fontSize(11).font("Helvetica");

      for (const field of data.fields) {
        if (field.value && field.value.trim()) {
          doc
            .font("Helvetica-Bold")
            .text(`${field.label}:`, 70, yPos, { continued: true, width: 150 })
            .font("Helvetica")
            .text(` ${field.value}`);
          yPos += 20;
        }
      }

      yPos += 20;

      // Rules/conditions if any
      if (data.rules && data.rules.length > 0) {
        doc
          .fontSize(10)
          .font("Helvetica-Oblique")
          .fillColor("#333333");

        doc.text("Notas:", 50, yPos);
        yPos += 15;

        for (const rule of data.rules) {
          doc.text(`• ${rule}`, 60, yPos, { width: 430 });
          yPos += 15;
        }
      }

      yPos += 40;

      // Signature section
      doc.fontSize(11).font("Helvetica");

      // Three columns for signatures
      const col1X = 80;
      const col2X = 280;
      const col3X = 420;

      doc.text("________________________________", col1X, yPos);
      yPos += 25;
      doc.fontSize(9).text("Jefe de Bedelía", col1X, yPos, { align: "center" });

      doc.fontSize(11).text("________________________________", col2X, yPos - 25);
      yPos = yPos - 25 + 25;
      doc.fontSize(9).text("Rector/a", col2X, yPos, { align: "center" });

      doc
        .fontSize(11)
        .text("________________________________", col3X, yPos - 25);
      yPos = yPos - 25 + 25;
      doc.fontSize(9).text("Secretario/a", col3X, yPos, { align: "center" });

      yPos += 40;

      // Footer with generation date and code
      const now = new Date();
      const footerText = `Código: ${data.certificateCode} | Generado el ${now.toLocaleDateString(
        "es-AR"
      )} a las ${now.toLocaleTimeString("es-AR")}`;

      doc
        .fontSize(8)
        .fillColor("#666666")
        .text(footerText, 50, 760, { align: "center" });

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
