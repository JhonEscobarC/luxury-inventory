import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import type { Product } from "../types/product";
import type { Order } from "../types/order";
import type { ObraClientes } from "../types/report";

const GOLD: [number, number, number] = [198, 161, 91];
const GOLD_ARGB = "FFC6A15B";
const ERROR_ARGB = "FFB4231F";

const STATUS_LABEL: Record<string, string> = {
  PENDIENTE: "Solicitud",
  CONFIRMADO: "Compra",
  DESPACHADO: "Recibido",
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

export function exportInventoryPdf(products: Product[], options: ExportOptions = {}) {
  const doc = new jsPDF();
  addReportHeader(doc, options.title ?? "Reporte de Inventario");

  autoTable(doc, {
    startY: 36,
    head: [["Nombre", "Categoria", "Obra", "Proyecto", "Cantidad", "Unidad", "Precio (COP)", "Stock min.", "Estado"]],
    body: products.map((product) => [
      product.name,
      product.categoriaName ?? "-",
      product.obraName ?? "General",
      product.proyectoName ?? "-",
      product.quantity.toString(),
      product.unit,
      product.price.toLocaleString("es-CO"),
      product.minStock.toString(),
      product.isLowStock ? "Stock bajo" : "OK",
    ]),
    headStyles: { fillColor: GOLD, textColor: [10, 10, 10] },
    styles: { fontSize: 8 },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 8 && data.cell.raw === "Stock bajo") {
        data.cell.styles.textColor = [180, 40, 40];
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  const prefix = options.filenamePrefix ? `inventario_${slugify(options.filenamePrefix)}` : "inventario";
  doc.save(`${prefix}_${Date.now()}.pdf`);
}

export async function exportInventoryExcel(products: Product[], options: ExportOptions = {}) {
  const workbook = newStyledWorkbook();
  const sheet = workbook.addWorksheet("Inventario");

  sheet.columns = [
    { header: "Nombre", key: "name", width: 30 },
    { header: "Categoria", key: "category", width: 18 },
    { header: "Obra", key: "obraName", width: 22 },
    { header: "Proyecto", key: "proyectoName", width: 22 },
    { header: "Cantidad", key: "quantity", width: 12 },
    { header: "Unidad", key: "unit", width: 12 },
    { header: "Precio (COP)", key: "price", width: 16 },
    { header: "Proveedor", key: "proveedorName", width: 22 },
    { header: "Stock minimo", key: "minStock", width: 14 },
    { header: "Estado", key: "status", width: 14 },
  ];
  styleHeaderRow(sheet.getRow(1));

  products.forEach((product) => {
    const row = sheet.addRow({
      name: product.name,
      category: product.categoriaName ?? "-",
      obraName: product.obraName ?? "General",
      proyectoName: product.proyectoName ?? "-",
      quantity: product.quantity,
      unit: product.unit,
      price: product.price,
      proveedorName: product.proveedorName ?? "",
      minStock: product.minStock,
      status: product.isLowStock ? "Stock bajo" : "OK",
    });
    if (product.isLowStock) {
      row.getCell("status").font = { color: { argb: ERROR_ARGB }, bold: true };
    }
  });

  const prefix = options.filenamePrefix ? `inventario_${slugify(options.filenamePrefix)}` : "inventario";
  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${prefix}_${Date.now()}.xlsx`,
  );
}

export interface ExportOptions {
  title?: string;
  filenamePrefix?: string;
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function exportOrdersPdf(orders: Order[], options: ExportOptions = {}) {
  const doc = new jsPDF();
  addReportHeader(doc, options.title ?? "Reporte de Pedidos");

  autoTable(doc, {
    startY: 36,
    head: [["Folio", "Obra", "Proveedor", "Estado", "Fecha", "Total (COP)"]],
    body: orders.map((order) => [
      order.id.slice(0, 8),
      order.obraName,
      order.proveedorName ?? "-",
      STATUS_LABEL[order.status] ?? order.status,
      new Date(order.createdAt).toLocaleDateString("es-CO"),
      order.total !== null ? order.total.toLocaleString("es-CO") : "-",
    ]),
    headStyles: { fillColor: GOLD, textColor: [10, 10, 10] },
    styles: { fontSize: 8 },
  });

  const prefix = options.filenamePrefix ? `pedidos_${slugify(options.filenamePrefix)}` : "pedidos";
  doc.save(`${prefix}_${Date.now()}.pdf`);
}

export async function exportOrdersExcel(orders: Order[], options: ExportOptions = {}) {
  const workbook = newStyledWorkbook();

  const summary = workbook.addWorksheet("Pedidos");
  summary.columns = [
    { header: "Folio", key: "id", width: 12 },
    { header: "Obra", key: "obraName", width: 24 },
    { header: "Proveedor", key: "proveedorName", width: 22 },
    { header: "Estado", key: "status", width: 14 },
    { header: "Pedido por", key: "createdByName", width: 20 },
    { header: "Fecha", key: "createdAt", width: 18 },
    { header: "Total (COP)", key: "total", width: 16 },
  ];
  styleHeaderRow(summary.getRow(1));

  orders.forEach((order) => {
    summary.addRow({
      id: order.id.slice(0, 8),
      obraName: order.obraName,
      proveedorName: order.proveedorName ?? "-",
      status: STATUS_LABEL[order.status] ?? order.status,
      createdByName: order.createdByName,
      createdAt: new Date(order.createdAt).toLocaleString("es-CO"),
      total: order.total ?? 0,
    });
  });

  const detail = workbook.addWorksheet("Detalle de materiales");
  detail.columns = [
    { header: "Folio", key: "orderId", width: 12 },
    { header: "Material", key: "description", width: 30 },
    { header: "Cantidad", key: "quantity", width: 12 },
    { header: "Unidad", key: "unit", width: 12 },
    { header: "Precio unitario", key: "unitPrice", width: 16 },
    { header: "Subtotal", key: "subtotal", width: 16 },
  ];
  styleHeaderRow(detail.getRow(1));

  orders.forEach((order) => {
    order.items.forEach((item) => {
      detail.addRow({
        orderId: order.id.slice(0, 8),
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice ?? 0,
        subtotal: item.subtotal ?? 0,
      });
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const prefix = options.filenamePrefix ? `pedidos_${slugify(options.filenamePrefix)}` : "pedidos";
  downloadBlob(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${prefix}_${Date.now()}.xlsx`,
  );
}

export function exportClientesPdf(obras: ObraClientes[], options: ExportOptions = {}) {
  const doc = new jsPDF();
  addReportHeader(doc, options.title ?? "Reporte de Pagos de Clientes");

  autoTable(doc, {
    startY: 36,
    head: [["Obra", "Comprador", "Precio de venta", "Abonado", "Saldo"]],
    body: obras.map((obra) => [
      obra.obraName,
      obra.client ?? "-",
      obra.precioVenta !== null ? obra.precioVenta.toLocaleString("es-CO") : "-",
      obra.totalAbonado.toLocaleString("es-CO"),
      obra.saldo !== null ? obra.saldo.toLocaleString("es-CO") : "-",
    ]),
    headStyles: { fillColor: GOLD, textColor: [10, 10, 10] },
    styles: { fontSize: 8 },
  });

  const prefix = options.filenamePrefix ? `pagos_clientes_${slugify(options.filenamePrefix)}` : "pagos_clientes";
  doc.save(`${prefix}_${Date.now()}.pdf`);
}

export async function exportClientesExcel(obras: ObraClientes[], options: ExportOptions = {}) {
  const workbook = newStyledWorkbook();
  const sheet = workbook.addWorksheet("Pagos de clientes");

  sheet.columns = [
    { header: "Obra", key: "obraName", width: 26 },
    { header: "Comprador", key: "client", width: 24 },
    { header: "Precio de venta", key: "precioVenta", width: 18 },
    { header: "Abonado", key: "totalAbonado", width: 18 },
    { header: "Saldo", key: "saldo", width: 18 },
  ];
  styleHeaderRow(sheet.getRow(1));

  obras.forEach((obra) => {
    const row = sheet.addRow({
      obraName: obra.obraName,
      client: obra.client ?? "",
      precioVenta: obra.precioVenta,
      totalAbonado: obra.totalAbonado,
      saldo: obra.saldo,
    });
    if (obra.saldo !== null && obra.saldo > 0) {
      row.getCell("saldo").font = { color: { argb: ERROR_ARGB }, bold: true };
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const prefix = options.filenamePrefix ? `pagos_clientes_${slugify(options.filenamePrefix)}` : "pagos_clientes";
  downloadBlob(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${prefix}_${Date.now()}.xlsx`,
  );
}
