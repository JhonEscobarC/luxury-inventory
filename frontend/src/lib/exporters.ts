import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import type { Product } from "../types/product";
import type { Order } from "../types/order";
import type { ObraClientes } from "../types/report";

export interface FinancieroExportRow {
  proyectoName: string;
  obraName: string;
  gastoMaterial: number;
  gastoOperacion: number;
  total: number;
}

export interface GastoPedidoExportRow {
  obraName: string;
  proveedorName: string | null;
  categoriaName: string | null;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  subtotal: number;
  createdAt: string;
}

export interface GastoContratistaExportRow {
  obraName: string;
  contratistaName: string;
  totalAmount: number;
  createdAt: string;
}

export interface GastosExportData {
  resumen: FinancieroExportRow[];
  pedidos: GastoPedidoExportRow[];
  contratistas: GastoContratistaExportRow[];
}

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

// El logo se carga una sola vez como data URL (jsPDF.addImage no acepta una ruta/URL) y
// se reutiliza en cada PDF; si falla la carga, el header cae al texto solo.
let logoDataUrlPromise: Promise<string | null> | null = null;
function getLogoDataUrl(): Promise<string | null> {
  if (!logoDataUrlPromise) {
    logoDataUrlPromise = fetch("/logo.jpg")
      .then((res) => (res.ok ? res.blob() : Promise.reject(new Error("logo not found"))))
      .then(
        (blob) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
          }),
      )
      .catch(() => null);
  }
  return logoDataUrlPromise;
}

async function addReportHeader(doc: jsPDF, title: string) {
  const logo = await getLogoDataUrl();
  let textX = 14;
  if (logo) {
    try {
      doc.addImage(logo, "JPEG", 14, 8, 20, 20);
      textX = 38;
    } catch {
      textX = 14;
    }
  }
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text("LUXURY - Diseno y Construccion", textX, 18);
  doc.setFontSize(11);
  doc.setTextColor(...GOLD);
  doc.text(title, textX, 25);
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generado: ${new Date().toLocaleString("es-CO")}`, textX, 30);
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

export async function exportInventoryPdf(products: Product[], options: ExportOptions = {}) {
  const doc = new jsPDF();
  await addReportHeader(doc, options.title ?? "Reporte de Inventario");

  autoTable(doc, {
    startY: 36,
    head: [["Nombre", "Categoria", "Obra", "Proyecto", "Cantidad", "Unidad", "Precio (COP)"]],
    body: products.map((product) => [
      product.name,
      product.categoriaName ?? "-",
      product.obraName ?? "General",
      product.proyectoName ?? "-",
      product.quantity.toString(),
      product.unit,
      product.price.toLocaleString("es-CO"),
    ]),
    headStyles: { fillColor: GOLD, textColor: [10, 10, 10] },
    styles: { fontSize: 8 },
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
  ];
  styleHeaderRow(sheet.getRow(1));

  products.forEach((product) => {
    sheet.addRow({
      name: product.name,
      category: product.categoriaName ?? "-",
      obraName: product.obraName ?? "General",
      proyectoName: product.proyectoName ?? "-",
      quantity: product.quantity,
      unit: product.unit,
      price: product.price,
      proveedorName: product.proveedorName ?? "",
    });
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

export async function exportOrdersPdf(orders: Order[], options: ExportOptions = {}) {
  const doc = new jsPDF();
  await addReportHeader(doc, options.title ?? "Reporte de Pedidos");

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

function lastAutoTableY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

function addSectionTitle(doc: jsPDF, title: string, y: number): number {
  if (y > 270) {
    doc.addPage();
    y = 20;
  }
  doc.setFontSize(11);
  doc.setTextColor(...GOLD);
  doc.text(title, 14, y);
  return y + 6;
}

export async function exportGastosPdf(data: GastosExportData, options: ExportOptions = {}) {
  const doc = new jsPDF();
  await addReportHeader(doc, options.title ?? "Reporte de Gastos");

  const totals = data.resumen.reduce(
    (acc, row) => ({
      gastoMaterial: acc.gastoMaterial + row.gastoMaterial,
      gastoOperacion: acc.gastoOperacion + row.gastoOperacion,
      total: acc.total + row.total,
    }),
    { gastoMaterial: 0, gastoOperacion: 0, total: 0 },
  );

  autoTable(doc, {
    startY: 36,
    head: [["Proyecto", "Obra", "Material", "Operacion", "Total"]],
    body: [
      ...data.resumen.map((row) => [
        row.proyectoName,
        row.obraName,
        row.gastoMaterial.toLocaleString("es-CO"),
        row.gastoOperacion.toLocaleString("es-CO"),
        row.total.toLocaleString("es-CO"),
      ]),
      [
        "",
        "Total general",
        totals.gastoMaterial.toLocaleString("es-CO"),
        totals.gastoOperacion.toLocaleString("es-CO"),
        totals.total.toLocaleString("es-CO"),
      ],
    ],
    headStyles: { fillColor: GOLD, textColor: [10, 10, 10] },
    styles: { fontSize: 8 },
    didParseCell: (data_) => {
      if (data_.row.index === data.resumen.length && data_.section === "body") {
        data_.cell.styles.fontStyle = "bold";
      }
    },
  });
  let cursorY = lastAutoTableY(doc) + 12;

  if (data.pedidos.length > 0) {
    cursorY = addSectionTitle(doc, "Detalle de pedidos", cursorY);
    autoTable(doc, {
      startY: cursorY,
      head: [["Obra", "Proveedor", "Categoria", "Material", "Cant.", "Unidad", "Precio", "Subtotal", "Fecha"]],
      body: data.pedidos.map((p) => [
        p.obraName,
        p.proveedorName ?? "-",
        p.categoriaName ?? "-",
        p.description,
        p.quantity.toString(),
        p.unit,
        p.unitPrice.toLocaleString("es-CO"),
        p.subtotal.toLocaleString("es-CO"),
        new Date(p.createdAt).toLocaleDateString("es-CO"),
      ]),
      headStyles: { fillColor: GOLD, textColor: [10, 10, 10] },
      styles: { fontSize: 7 },
    });
    cursorY = lastAutoTableY(doc) + 12;
  }

  if (data.contratistas.length > 0) {
    cursorY = addSectionTitle(doc, "Detalle de contratistas", cursorY);
    autoTable(doc, {
      startY: cursorY,
      head: [["Obra", "Contratista", "Monto", "Fecha"]],
      body: data.contratistas.map((c) => [
        c.obraName,
        c.contratistaName,
        c.totalAmount.toLocaleString("es-CO"),
        new Date(c.createdAt).toLocaleDateString("es-CO"),
      ]),
      headStyles: { fillColor: GOLD, textColor: [10, 10, 10] },
      styles: { fontSize: 8 },
    });
  }

  const prefix = options.filenamePrefix ? `gastos_${slugify(options.filenamePrefix)}` : "gastos";
  doc.save(`${prefix}_${Date.now()}.pdf`);
}

export async function exportGastosExcel(data: GastosExportData, options: ExportOptions = {}) {
  const workbook = newStyledWorkbook();

  const resumenSheet = workbook.addWorksheet("Resumen por obra");
  resumenSheet.columns = [
    { header: "Proyecto", key: "proyectoName", width: 24 },
    { header: "Obra", key: "obraName", width: 26 },
    { header: "Material (COP)", key: "gastoMaterial", width: 18 },
    { header: "Operacion (COP)", key: "gastoOperacion", width: 18 },
    { header: "Total (COP)", key: "total", width: 18 },
  ];
  styleHeaderRow(resumenSheet.getRow(1));
  data.resumen.forEach((row) => {
    resumenSheet.addRow({
      proyectoName: row.proyectoName,
      obraName: row.obraName,
      gastoMaterial: row.gastoMaterial,
      gastoOperacion: row.gastoOperacion,
      total: row.total,
    });
  });
  const totals = data.resumen.reduce(
    (acc, row) => ({
      gastoMaterial: acc.gastoMaterial + row.gastoMaterial,
      gastoOperacion: acc.gastoOperacion + row.gastoOperacion,
      total: acc.total + row.total,
    }),
    { gastoMaterial: 0, gastoOperacion: 0, total: 0 },
  );
  const totalRow = resumenSheet.addRow({
    proyectoName: "",
    obraName: "Total general",
    gastoMaterial: totals.gastoMaterial,
    gastoOperacion: totals.gastoOperacion,
    total: totals.total,
  });
  totalRow.font = { bold: true };

  if (data.pedidos.length > 0) {
    const pedidosSheet = workbook.addWorksheet("Detalle de pedidos");
    pedidosSheet.columns = [
      { header: "Obra", key: "obraName", width: 24 },
      { header: "Proveedor", key: "proveedorName", width: 22 },
      { header: "Categoria", key: "categoriaName", width: 18 },
      { header: "Material", key: "description", width: 28 },
      { header: "Cantidad", key: "quantity", width: 12 },
      { header: "Unidad", key: "unit", width: 12 },
      { header: "Precio unitario", key: "unitPrice", width: 16 },
      { header: "Subtotal", key: "subtotal", width: 16 },
      { header: "Fecha", key: "createdAt", width: 18 },
    ];
    styleHeaderRow(pedidosSheet.getRow(1));
    data.pedidos.forEach((p) => {
      pedidosSheet.addRow({
        obraName: p.obraName,
        proveedorName: p.proveedorName ?? "-",
        categoriaName: p.categoriaName ?? "-",
        description: p.description,
        quantity: p.quantity,
        unit: p.unit,
        unitPrice: p.unitPrice,
        subtotal: p.subtotal,
        createdAt: new Date(p.createdAt).toLocaleString("es-CO"),
      });
    });
  }

  if (data.contratistas.length > 0) {
    const contratistasSheet = workbook.addWorksheet("Detalle de contratistas");
    contratistasSheet.columns = [
      { header: "Obra", key: "obraName", width: 24 },
      { header: "Contratista", key: "contratistaName", width: 24 },
      { header: "Monto (COP)", key: "totalAmount", width: 18 },
      { header: "Fecha", key: "createdAt", width: 18 },
    ];
    styleHeaderRow(contratistasSheet.getRow(1));
    data.contratistas.forEach((c) => {
      contratistasSheet.addRow({
        obraName: c.obraName,
        contratistaName: c.contratistaName,
        totalAmount: c.totalAmount,
        createdAt: new Date(c.createdAt).toLocaleString("es-CO"),
      });
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const prefix = options.filenamePrefix ? `gastos_${slugify(options.filenamePrefix)}` : "gastos";
  downloadBlob(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${prefix}_${Date.now()}.xlsx`,
  );
}

export async function exportClientesPdf(obras: ObraClientes[], options: ExportOptions = {}) {
  const doc = new jsPDF();
  await addReportHeader(doc, options.title ?? "Reporte de Pagos de Clientes");

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

export interface TablaColumn {
  header: string;
  key: string;
  width?: number;
}

export interface TablaPdfSection {
  title: string;
  headers: string[];
  rows: (string | number)[][];
}

// Exportador generico para la tabla de Reportes (inventario/proveedores/contratistas/clientes):
// cada pestana define sus propias columnas para el resumen, y opcionalmente secciones de
// detalle (compras, pagos, etapas, abonos) que se agregan debajo en el mismo PDF.
export async function exportTablaPdf(
  title: string,
  headers: string[],
  rows: (string | number)[][],
  options: ExportOptions & { sections?: TablaPdfSection[] } = {},
) {
  const doc = new jsPDF();
  await addReportHeader(doc, options.title ?? title);
  autoTable(doc, {
    startY: 36,
    head: [headers],
    body: rows,
    headStyles: { fillColor: GOLD, textColor: [10, 10, 10] },
    styles: { fontSize: 8 },
  });

  let cursorY = lastAutoTableY(doc) + 12;
  for (const section of options.sections ?? []) {
    if (section.rows.length === 0) continue;
    cursorY = addSectionTitle(doc, section.title, cursorY);
    autoTable(doc, {
      startY: cursorY,
      head: [section.headers],
      body: section.rows,
      headStyles: { fillColor: GOLD, textColor: [10, 10, 10] },
      styles: { fontSize: 7 },
    });
    cursorY = lastAutoTableY(doc) + 12;
  }

  const prefix = options.filenamePrefix ? slugify(options.filenamePrefix) : slugify(title);
  doc.save(`${prefix}_${Date.now()}.pdf`);
}

export interface TablaExcelSection {
  title: string;
  columns: TablaColumn[];
  rows: Record<string, string | number>[];
}

export async function exportTablaExcel(
  title: string,
  columns: TablaColumn[],
  rows: Record<string, string | number>[],
  options: ExportOptions & { sections?: TablaExcelSection[] } = {},
) {
  const workbook = newStyledWorkbook();
  const sheet = workbook.addWorksheet(title.slice(0, 31));
  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 20 }));
  styleHeaderRow(sheet.getRow(1));
  rows.forEach((row) => sheet.addRow(row));

  for (const section of options.sections ?? []) {
    if (section.rows.length === 0) continue;
    const sectionSheet = workbook.addWorksheet(section.title.slice(0, 31));
    sectionSheet.columns = section.columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 20 }));
    styleHeaderRow(sectionSheet.getRow(1));
    section.rows.forEach((row) => sectionSheet.addRow(row));
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const prefix = options.filenamePrefix ? slugify(options.filenamePrefix) : slugify(title);
  downloadBlob(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${prefix}_${Date.now()}.xlsx`,
  );
}
