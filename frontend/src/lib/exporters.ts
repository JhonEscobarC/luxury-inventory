import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import type { Product } from "../types/product";
import type { OrderReport } from "../types/order";

const GOLD: [number, number, number] = [198, 161, 91];
const GOLD_ARGB = "FFC6A15B";
const ERROR_ARGB = "FFB4231F";

const STATUS_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  CONFIRMADO: "Confirmado",
  DESPACHADO: "Despachado",
  CANCELADO: "Cancelado",
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function addReportHeader(doc: jsPDF, title: string) {
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text("LUXURY - Diseno y Construccion", 14, 18);
  doc.setFontSize(11);
  doc.setTextColor(...GOLD);
  doc.text(title, 14, 25);
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generado: ${new Date().toLocaleString("es-CO")}`, 14, 30);
}

function newStyledWorkbook() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "LUXURY - Diseno y Construccion";
  workbook.created = new Date();
  return workbook;
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FF0A0A0A" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GOLD_ARGB } };
}

export function exportInventoryPdf(products: Product[]) {
  const doc = new jsPDF();
  addReportHeader(doc, "Reporte de Inventario");

  autoTable(doc, {
    startY: 36,
    head: [["Nombre", "Categoria", "Cantidad", "Unidad", "Precio (COP)", "Stock min.", "Estado"]],
    body: products.map((product) => [
      product.name,
      product.category,
      product.quantity.toString(),
      product.unit,
      product.price.toLocaleString("es-CO"),
      product.minStock.toString(),
      product.isLowStock ? "Stock bajo" : "OK",
    ]),
    headStyles: { fillColor: GOLD, textColor: [10, 10, 10] },
    styles: { fontSize: 8 },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 6 && data.cell.raw === "Stock bajo") {
        data.cell.styles.textColor = [180, 40, 40];
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  doc.save(`inventario_${Date.now()}.pdf`);
}

export async function exportInventoryExcel(products: Product[]) {
  const workbook = newStyledWorkbook();
  const sheet = workbook.addWorksheet("Inventario");

  sheet.columns = [
    { header: "Nombre", key: "name", width: 30 },
    { header: "Categoria", key: "category", width: 18 },
    { header: "Cantidad", key: "quantity", width: 12 },
    { header: "Unidad", key: "unit", width: 12 },
    { header: "Precio (COP)", key: "price", width: 16 },
    { header: "Proveedor", key: "supplier", width: 22 },
    { header: "Stock minimo", key: "minStock", width: 14 },
    { header: "Estado", key: "status", width: 14 },
  ];
  styleHeaderRow(sheet.getRow(1));

  products.forEach((product) => {
    const row = sheet.addRow({
      name: product.name,
      category: product.category,
      quantity: product.quantity,
      unit: product.unit,
      price: product.price,
      supplier: product.supplier ?? "",
      minStock: product.minStock,
      status: product.isLowStock ? "Stock bajo" : "OK",
    });
    if (product.isLowStock) {
      row.getCell("status").font = { color: { argb: ERROR_ARGB }, bold: true };
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `inventario_${Date.now()}.xlsx`,
  );
}

export function exportOrdersPdf(orders: OrderReport[]) {
  const doc = new jsPDF();
  addReportHeader(doc, "Reporte de Pedidos");

  autoTable(doc, {
    startY: 36,
    head: [["Folio", "Cliente", "Telefono", "Estado", "Origen", "Fecha", "Total (COP)"]],
    body: orders.map((order) => [
      order.id.slice(0, 8),
      order.customerName ?? "-",
      order.customerPhone ?? "-",
      STATUS_LABEL[order.status] ?? order.status,
      order.source === "WHATSAPP" ? "WhatsApp" : "Manual",
      new Date(order.createdAt).toLocaleDateString("es-CO"),
      order.total.toLocaleString("es-CO"),
    ]),
    headStyles: { fillColor: GOLD, textColor: [10, 10, 10] },
    styles: { fontSize: 8 },
  });

  doc.save(`pedidos_${Date.now()}.pdf`);
}

export async function exportOrdersExcel(orders: OrderReport[]) {
  const workbook = newStyledWorkbook();

  const summary = workbook.addWorksheet("Pedidos");
  summary.columns = [
    { header: "Folio", key: "id", width: 12 },
    { header: "Cliente", key: "customerName", width: 24 },
    { header: "Telefono", key: "customerPhone", width: 16 },
    { header: "Estado", key: "status", width: 14 },
    { header: "Origen", key: "source", width: 12 },
    { header: "Fecha", key: "createdAt", width: 18 },
    { header: "Total (COP)", key: "total", width: 16 },
  ];
  styleHeaderRow(summary.getRow(1));

  orders.forEach((order) => {
    summary.addRow({
      id: order.id.slice(0, 8),
      customerName: order.customerName ?? "-",
      customerPhone: order.customerPhone ?? "-",
      status: STATUS_LABEL[order.status] ?? order.status,
      source: order.source === "WHATSAPP" ? "WhatsApp" : "Manual",
      createdAt: new Date(order.createdAt).toLocaleString("es-CO"),
      total: order.total,
    });
  });

  const detail = workbook.addWorksheet("Detalle de productos");
  detail.columns = [
    { header: "Folio", key: "orderId", width: 12 },
    { header: "Producto", key: "productName", width: 30 },
    { header: "Cantidad", key: "quantity", width: 12 },
    { header: "Precio unitario", key: "unitPrice", width: 16 },
    { header: "Subtotal", key: "subtotal", width: 16 },
  ];
  styleHeaderRow(detail.getRow(1));

  orders.forEach((order) => {
    order.items.forEach((item) => {
      detail.addRow({
        orderId: order.id.slice(0, 8),
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
      });
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `pedidos_${Date.now()}.xlsx`,
  );
}
