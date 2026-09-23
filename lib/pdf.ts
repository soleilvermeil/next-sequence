import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import type { SequenceState } from "./types";
import { getColumn } from "./columns";
import { getConfig } from "./configs";
import { getRowFieldValue, totalDurationMinutes } from "./sequence";
import { formatDurationShort } from "./time";

function safeFilename(title: string): string {
  return title.replace(/[^\w\s-]/g, "").trim() || "lesson-sequence";
}

function cellDisplay(value: string | number | null): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

/**
 * Export the visible configuration as a multi-page PDF.
 * Headers repeat on every page; rows are kept intact when they fit.
 */
export function exportSequenceToPdf(state: SequenceState): void {
  const config = getConfig(state.configId);
  const columns = config.columns.map(getColumn);
  const wide = columns.length >= 5;

  const doc = new jsPDF({
    orientation: wide ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 12;
  const title = state.title.trim() || "Untitled lesson";
  const durationLabel = formatDurationShort(totalDurationMinutes(state.rows));

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(title, marginX, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `${config.label} · ${state.rows.length} activit${state.rows.length === 1 ? "y" : "ies"} · ${durationLabel}`,
    marginX,
    22,
  );

  const head = [["#", ...columns.map((c) => (c.key === "duration" ? "Duration (min)" : c.label))]];

  const body = state.rows.map((row, index) => [
    String(index + 1),
    ...columns.map((col) => cellDisplay(getRowFieldValue(row, col.key))),
  ]);

  // Weight columns: activity & text fields get more space; times/numbers stay narrow.
  const totalWeight =
    0.45 +
    columns.reduce((sum, col) => {
      if (col.key === "activity") return sum + 2.4;
      if (col.kind === "textarea") return sum + 2;
      if (col.kind === "number" || col.kind === "time" || col.kind === "computed")
        return sum + 0.7;
      if (col.kind === "select") return sum + 1.2;
      return sum + 1;
    }, 0);

  const usableWidth = pageWidth - marginX * 2;
  const columnStyles: Record<number, { cellWidth: number; halign?: "left" | "center" | "right" }> =
    {
      0: {
        cellWidth: (0.45 / totalWeight) * usableWidth,
        halign: "center",
      },
    };

  columns.forEach((col, i) => {
    let weight = 1;
    if (col.key === "activity") weight = 2.4;
    else if (col.kind === "textarea") weight = 2;
    else if (col.kind === "number" || col.kind === "time" || col.kind === "computed")
      weight = 0.7;
    else if (col.kind === "select") weight = 1.2;

    columnStyles[i + 1] = {
      cellWidth: (weight / totalWeight) * usableWidth,
      halign:
        col.kind === "number" || col.kind === "time" || col.kind === "computed"
          ? "center"
          : "left",
    };
  });

  autoTable(doc, {
    head,
    body,
    startY: 26,
    margin: { left: marginX, right: marginX, top: 28, bottom: 16 },
    showHead: "everyPage",
    rowPageBreak: "avoid",
    tableWidth: usableWidth,
    styles: {
      font: "helvetica",
      fontSize: wide ? 8 : 9,
      cellPadding: { top: 2.2, right: 2, bottom: 2.2, left: 2 },
      valign: "top",
      overflow: "linebreak",
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      minCellHeight: 8,
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [71, 85, 105],
      fontStyle: "bold",
      fontSize: wide ? 7.5 : 8,
      valign: "middle",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles,
    didDrawPage: (data) => {
      const page = data.pageNumber;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("Sequence", marginX, pageHeight - 8);
      doc.text(`Page ${page}`, pageWidth - marginX, pageHeight - 8, {
        align: "right",
      });

      if (page > 1) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(title, marginX, 14);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`${config.label} (continued)`, marginX, 19);
      }
    },
  });

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(255, 255, 255);
    doc.rect(pageWidth - marginX - 32, pageHeight - 11, 32, 5, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - marginX, pageHeight - 8, {
      align: "right",
    });
  }

  doc.save(`${safeFilename(title)}.pdf`);
}
