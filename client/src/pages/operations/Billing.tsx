import { Link } from "react-router-dom";
import React, { useState } from "react";
import {
  Download,
  Printer,
  FileText,
  Building2,
  Users,
  CreditCard,
  Plus,
  Trash2,
  Layers,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Receipt,
  Wallet,
  Calendar,
  Search,
  CheckSquare,
  Square,
  ArrowRight,
  Filter,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import {
  useWords,
  useData,
  useAction,
  Page,
  DataTable,
  Dialog,
  Field,
  Button,
  AddButton,
  Status,
  Loading,
  today,
  money,
  dateText,
  exportCsv,
  Panel,
} from "./ui";

export function Billing() {
  const w = useWords();
  const { user } = useAuth();
  const canEdit = ["ADMIN", "ACCOUNTANT"].includes(user?.role || "");

  const [activeTab, setActiveTab] = useState<"CLIENTS" | "SUPPLIERS" | "DOCUMENTS">("CLIENTS");
  const [selectedPeriod, setSelectedPeriod] = useState<string>(today().slice(0, 7));
  const [searchQuery, setSearchQuery] = useState("");

  // Queries
  const partiesQuery = useData(`/billing/parties-summary?period=${selectedPeriod}&kind=ALL`);
  const documentsQuery = useData("/documents");
  const treasuryQuery = useData("/treasury", canEdit);
  const lookup = useData("/bootstrap", canEdit);

  const a = useAction();

  // Modals
  const [inspectParty, setInspectParty] = useState<{ id: string; name: string; kind: "INVOICE" | "SETTLEMENT" } | null>(null);
  const [batchModal, setBatchModal] = useState(false);
  const [customDocModal, setCustomDocModal] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  // Custom Doc Form
  const [customForm, setCustomForm] = useState({
    kind: "INVOICE",
    partyId: "",
    period: selectedPeriod,
    dueDate: today(),
    notes: "",
  });
  const [customLines, setCustomLines] = useState<Array<{ description: string; amount: number }>>([
    { description: "", amount: 0 },
  ]);

  // Batch Form
  const [batchForm, setBatchForm] = useState({
    period: selectedPeriod,
    dueDate: today(),
    notes: "",
  });

  const parties = partiesQuery.data || [];
  const documents = documentsQuery.data || [];

  // Categorized Parties
  const clientParties = parties.filter((p: any) => p.kind === "CLIENT");
  const supplierParties = parties.filter((p: any) => p.kind === "SUPPLIER");

  // Summary Metrics
  const totalClientRevenue = clientParties.reduce((s: number, p: any) => s + (p.totalAmount || 0), 0);
  const totalClientBilled = clientParties.reduce((s: number, p: any) => s + (p.billedAmount || 0), 0);
  const totalClientUnbilled = clientParties.reduce((s: number, p: any) => s + (p.unbilledAmount || 0), 0);
  const totalClientTrips = clientParties.reduce((s: number, p: any) => s + (p.totalTrips || 0), 0);

  const totalSupplierDues = supplierParties.reduce((s: number, p: any) => s + (p.totalAmount || 0), 0);
  const totalSupplierBilled = supplierParties.reduce((s: number, p: any) => s + (p.billedAmount || 0), 0);
  const totalSupplierUnbilled = supplierParties.reduce((s: number, p: any) => s + (p.unbilledAmount || 0), 0);
  const totalSupplierTrips = supplierParties.reduce((s: number, p: any) => s + (p.totalTrips || 0), 0);

  const selectedDoc = documents.find((d: any) => d.id === selectedDocId);

  // Filtered lists
  const filteredClients = clientParties.filter((p: any) =>
    !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.contactPerson || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSuppliers = supplierParties.filter((p: any) =>
    !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.contactPerson || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDocs = documents.filter((d: any) => {
    const partyName = (d.client?.companyName || d.partner?.name || "").toLowerCase();
    const docNumber = (d.number || "").toLowerCase();
    return !searchQuery || partyName.includes(searchQuery.toLowerCase()) || docNumber.includes(searchQuery.toLowerCase());
  });

  async function handleBatchGenerate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await a.run("/documents/generate-batch", batchForm);
      setBatchModal(false);
      partiesQuery.refetch();
      documentsQuery.refetch();
    } catch {}
  }

  async function handleCreateCustomDoc(e: React.FormEvent) {
    e.preventDefault();
    try {
      const validLines = customLines.filter((l) => l.description.trim() && l.amount > 0);
      const res = await a.run("/documents", {
        ...customForm,
        customLines: validLines.length > 0 ? validLines : undefined,
      });
      setCustomDocModal(false);
      setSelectedDocId(res.id);
      partiesQuery.refetch();
      documentsQuery.refetch();
    } catch {}
  }

  return (
    <Page
      title={w("Billing & Supplier Settlements", "الفواتير ومستحقات الموردين")}
      description={w(
        "Track completed trips per client company and transport supplier, generate itemized invoices, and settle balances directly to treasury safes & bank accounts.",
        "متابعة الرحلات وسجل تشغيل كل شركة ومورد، وإصدار الفواتير وكشوف المستحقات التفصيلية، وتسجيل التحصيل والسداد الفعلي بالخزائن والبنوك."
      )}
      actions={
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <Button
            secondary
            onClick={() =>
              exportCsv(
                `billing_${selectedPeriod}`,
                (activeTab === "CLIENTS" ? clientParties : activeTab === "SUPPLIERS" ? supplierParties : documents).map((r: any) => ({
                  ...r,
                  party: r.name || r.client?.companyName || r.partner?.name,
                })),
                activeTab === "DOCUMENTS"
                  ? [
                      { key: "number", label: "Document #" },
                      { key: "kind", label: "Type" },
                      { key: "party", label: "Party" },
                      { key: "period", label: "Period" },
                      { key: "total", label: "Total EGP" },
                      { key: "status", label: "Status" },
                    ]
                  : [
                      { key: "name", label: "Party Name" },
                      { key: "totalTrips", label: "Total Trips" },
                      { key: "totalAmount", label: "Total Amount EGP" },
                      { key: "billedAmount", label: "Billed EGP" },
                      { key: "unbilledAmount", label: "Unbilled EGP" },
                    ]
              )
            }
          >
            <Download size={16} />
            {w("Export", "تصدير")}
          </Button>

          {canEdit && (
            <>
              <Button
                secondary
                onClick={() => {
                  a.clear();
                  setBatchForm({ period: selectedPeriod, dueDate: today(), notes: "" });
                  setBatchModal(true);
                }}
              >
                <Layers size={16} />
                {w("Batch Monthly Invoices", "توليد فواتير الشهر للكل")}
              </Button>

              <AddButton
                onClick={() => {
                  a.clear();
                  setCustomForm({
                    kind: "INVOICE",
                    partyId: "",
                    period: selectedPeriod,
                    dueDate: today(),
                    notes: "",
                  });
                  setCustomLines([{ description: "", amount: 0 }]);
                  setCustomDocModal(true);
                }}
              >
                {w("New Custom Invoice", "إنشاء مستند / فاتورة مخصصة")}
              </AddButton>
            </>
          )}
        </div>
      }
    >
      {/* Top Filter Bar: Period and Search */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "14px",
          background: "#ffffff",
          padding: "12px 16px",
          borderRadius: "10px",
          border: "1px solid #e2e8f0",
          marginBottom: "16px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Calendar size={18} color="#2563eb" />
          <span style={{ fontWeight: 600, fontSize: "14px", color: "#334155" }}>
            {w("Service Month:", "شهر الخدمة / التشغيل:")}
          </span>
          <input
            type="month"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              fontWeight: 600,
              fontSize: "14px",
              color: "#1e293b",
            }}
          />
        </div>

        <div style={{ flex: 1, maxWidth: "360px", minWidth: "220px" }}>
          <div style={{ position: "relative" }}>
            <Search size={16} style={{ position: "absolute", top: "10px", right: "10px", color: "#94a3b8" }} />
            <input
              type="text"
              placeholder={w("Search company or supplier...", "بحث باسم الشركة أو المورد...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 34px 8px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
              }}
            />
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          borderBottom: "2px solid #e2e8f0",
          marginBottom: "16px",
        }}
      >
        <button
          onClick={() => setActiveTab("CLIENTS")}
          style={{
            padding: "10px 18px",
            border: "none",
            borderBottom: activeTab === "CLIENTS" ? "3px solid #2563eb" : "3px solid transparent",
            background: "transparent",
            fontWeight: 700,
            fontSize: "15px",
            color: activeTab === "CLIENTS" ? "#2563eb" : "#64748b",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Building2 size={18} />
          {w("Client Companies & Invoices", "فواتير ومطالبات الشركات")}
          <span
            style={{
              background: activeTab === "CLIENTS" ? "#dbeafe" : "#f1f5f9",
              color: activeTab === "CLIENTS" ? "#1d4ed8" : "#64748b",
              padding: "2px 8px",
              borderRadius: "12px",
              fontSize: "12px",
            }}
          >
            {clientParties.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("SUPPLIERS")}
          style={{
            padding: "10px 18px",
            border: "none",
            borderBottom: activeTab === "SUPPLIERS" ? "3px solid #7c3aed" : "3px solid transparent",
            background: "transparent",
            fontWeight: 700,
            fontSize: "15px",
            color: activeTab === "SUPPLIERS" ? "#7c3aed" : "#64748b",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Users size={18} />
          {w("Supplier Dues & Settlements", "مستحقات وسجل رحلات الموردين")}
          <span
            style={{
              background: activeTab === "SUPPLIERS" ? "#ede9fe" : "#f1f5f9",
              color: activeTab === "SUPPLIERS" ? "#6d28d9" : "#64748b",
              padding: "2px 8px",
              borderRadius: "12px",
              fontSize: "12px",
            }}
          >
            {supplierParties.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("DOCUMENTS")}
          style={{
            padding: "10px 18px",
            border: "none",
            borderBottom: activeTab === "DOCUMENTS" ? "3px solid #059669" : "3px solid transparent",
            background: "transparent",
            fontWeight: 700,
            fontSize: "15px",
            color: activeTab === "DOCUMENTS" ? "#059669" : "#64748b",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <FileText size={18} />
          {w("Issued Documents & Invoices", "كافة الفواتير والمستندات المصدرة")}
          <span
            style={{
              background: activeTab === "DOCUMENTS" ? "#d1fae5" : "#f1f5f9",
              color: activeTab === "DOCUMENTS" ? "#047857" : "#64748b",
              padding: "2px 8px",
              borderRadius: "12px",
              fontSize: "12px",
            }}
          >
            {documents.length}
          </span>
        </button>
      </div>

      {/* KPI Cards for the active tab */}
      {activeTab === "CLIENTS" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          <div style={{ background: "#ffffff", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>{w("Total Completed Trips", "إجمالي رحلات الشهر")}</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#1e293b", marginTop: "4px" }}>{totalClientTrips} {w("Trips", "رحلة")}</div>
          </div>
          <div style={{ background: "#ffffff", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>{w("Total Corporate Billing", "إجمالي قيمة الخدمات")}</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#2563eb", marginTop: "4px" }}>{money(totalClientRevenue)}</div>
          </div>
          <div style={{ background: "#ffffff", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>{w("Invoiced", "المفوتر رسميًا")}</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#10b981", marginTop: "4px" }}>{money(totalClientBilled)}</div>
          </div>
          <div style={{ background: "#ffffff", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>{w("Unbilled (Pending Invoice)", "غير مفوتر (مستحق عمل فاتورة)")}</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: totalClientUnbilled > 0 ? "#ea580c" : "#10b981", marginTop: "4px" }}>
              {money(totalClientUnbilled)}
            </div>
          </div>
        </div>
      )}

      {activeTab === "SUPPLIERS" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          <div style={{ background: "#ffffff", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>{w("Supplier Executed Trips", "رحلات الموردين المنفذة")}</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#1e293b", marginTop: "4px" }}>{totalSupplierTrips} {w("Trips", "رحلة")}</div>
          </div>
          <div style={{ background: "#ffffff", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>{w("Total Supplier Dues", "إجمالي مستحقات الموردين")}</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#7c3aed", marginTop: "4px" }}>{money(totalSupplierDues)}</div>
          </div>
          <div style={{ background: "#ffffff", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>{w("Settled / Invoiced", "كشوف المستحقات المعتمدة")}</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#10b981", marginTop: "4px" }}>{money(totalSupplierBilled)}</div>
          </div>
          <div style={{ background: "#ffffff", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>{w("Unsettled Dues", "مستحق إصدار كشف تسوية")}</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: totalSupplierUnbilled > 0 ? "#e11d48" : "#10b981", marginTop: "4px" }}>
              {money(totalSupplierUnbilled)}
            </div>
          </div>
        </div>
      )}

      {!partiesQuery.data && !documentsQuery.data ? (
        <Loading query={partiesQuery} />
      ) : (
        <>
          {/* TAB 1: CLIENT COMPANIES */}
          {activeTab === "CLIENTS" && (
            <DataTable
              rows={filteredClients}
              columns={[
                {
                  key: "name",
                  label: w("Client Company", "الشركة"),
                  render: (r: any) => (
                    <div>
                      <strong>{r.name}</strong>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>
                        {r.contactPerson} · {r.phone}
                      </div>
                    </div>
                  ),
                },
                {
                  key: "totalTrips",
                  label: w("Trips Count", "عدد الرحلات"),
                  render: (r: any) => (
                    <span>
                      <strong>{r.totalTrips}</strong> {w("trips", "رحلة")}
                    </span>
                  ),
                },
                {
                  key: "totalAmount",
                  label: w("Total Value", "إجمالي القيمة"),
                  render: (r: any) => money(r.totalAmount),
                },
                {
                  key: "billedAmount",
                  label: w("Invoiced", "المفوتر"),
                  render: (r: any) => <span style={{ color: "#10b981", fontWeight: 600 }}>{money(r.billedAmount)}</span>,
                },
                {
                  key: "unbilledAmount",
                  label: w("Unbilled", "غير المفوتر"),
                  render: (r: any) => (
                    <span style={{ color: r.unbilledAmount > 0 ? "#ea580c" : "#64748b", fontWeight: 700 }}>
                      {money(r.unbilledAmount)}
                    </span>
                  ),
                },
                {
                  key: "status",
                  label: w("Status", "الحالة"),
                  render: (r: any) =>
                    r.unbilledTripsCount > 0 ? (
                      <span style={{ background: "#ffedd5", color: "#c2410c", padding: "4px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: 600 }}>
                        {r.unbilledTripsCount} {w("unbilled trips", "رحلات غير مفوترة")}
                      </span>
                    ) : (
                      <span style={{ background: "#dcfce7", color: "#15803d", padding: "4px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: 600 }}>
                        {w("All Billed", "مفوتر بالكامل")}
                      </span>
                    ),
                },
              ]}
              actions={(r: any) => (
                <Button
                  secondary
                  onClick={() =>
                    setInspectParty({
                      id: r.id,
                      name: r.name,
                      kind: "INVOICE",
                    })
                  }
                >
                  <FileText size={15} />
                  {w("View Trips & Invoice", "سجل الرحلات وعمل فاتورة")}
                </Button>
              )}
            />
          )}

          {/* TAB 2: SUPPLIERS */}
          {activeTab === "SUPPLIERS" && (
            <DataTable
              rows={filteredSuppliers}
              columns={[
                {
                  key: "name",
                  label: w("Supplier Partner", "المورد"),
                  render: (r: any) => (
                    <div>
                      <strong>{r.name}</strong>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>
                        {r.contactPerson} · {r.phone}
                      </div>
                    </div>
                  ),
                },
                {
                  key: "totalTrips",
                  label: w("Executed Trips", "الرحلات المنفذة"),
                  render: (r: any) => (
                    <span>
                      <strong>{r.totalTrips}</strong> {w("trips", "رحلة")}
                    </span>
                  ),
                },
                {
                  key: "totalAmount",
                  label: w("Total Due", "إجمالي المستحق"),
                  render: (r: any) => money(r.totalAmount),
                },
                {
                  key: "billedAmount",
                  label: w("Settled", "المعتمد"),
                  render: (r: any) => <span style={{ color: "#10b981", fontWeight: 600 }}>{money(r.billedAmount)}</span>,
                },
                {
                  key: "unbilledAmount",
                  label: w("Unsettled", "مستحق غير معتمد"),
                  render: (r: any) => (
                    <span style={{ color: r.unbilledAmount > 0 ? "#e11d48" : "#64748b", fontWeight: 700 }}>
                      {money(r.unbilledAmount)}
                    </span>
                  ),
                },
                {
                  key: "status",
                  label: w("Status", "الحالة"),
                  render: (r: any) =>
                    r.unbilledTripsCount > 0 ? (
                      <span style={{ background: "#fee2e2", color: "#b91c1c", padding: "4px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: 600 }}>
                        {r.unbilledTripsCount} {w("unsettled trips", "رحلات بدون كشف")}
                      </span>
                    ) : (
                      <span style={{ background: "#dcfce7", color: "#15803d", padding: "4px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: 600 }}>
                        {w("Fully Settled", "معتمد بالكامل")}
                      </span>
                    ),
                },
              ]}
              actions={(r: any) => (
                <Button
                  secondary
                  onClick={() =>
                    setInspectParty({
                      id: r.id,
                      name: r.name,
                      kind: "SETTLEMENT",
                    })
                  }
                >
                  <FileText size={15} />
                  {w("View Trips & Settle", "سجل الرحلات وعمل كشف")}
                </Button>
              )}
            />
          )}

          {/* TAB 3: ISSUED DOCUMENTS */}
          {activeTab === "DOCUMENTS" && (
            <DataTable
              rows={filteredDocs}
              columns={[
                {
                  key: "number",
                  label: w("Document", "المستند"),
                  render: (d: any) => (
                    <>
                      <strong>{d.number}</strong>
                      <small>
                        {d.kind === "INVOICE" ? w("Client Invoice", "فاتورة عميل") : w("Supplier Settlement", "مستحقات مورد")}
                      </small>
                    </>
                  ),
                },
                {
                  key: "party",
                  label: w("Company / Supplier", "الشركة / المورد"),
                  render: (d: any) => (
                    <div>
                      <strong>{d.client?.companyName || d.partner?.name}</strong>
                      {d.lines && (
                        <div style={{ fontSize: "11px", color: "#64748b" }}>
                          {d.lines.length} {w("line items", "بند")}
                        </div>
                      )}
                    </div>
                  ),
                },
                { key: "period", label: w("Period", "الفترة") },
                {
                  key: "total",
                  label: w("Total", "الإجمالي"),
                  render: (d: any) => money(d.total),
                },
                {
                  key: "balance",
                  label: w("Outstanding", "المتبقي"),
                  render: (d: any) => {
                    const pd = (d.payments || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
                    const rem = Math.max(0, Number(d.total || 0) - pd);
                    return d.status === "VOID" ? "—" : <span style={{ color: rem > 0 ? "#ea580c" : "#10b981", fontWeight: 700 }}>{money(rem)}</span>;
                  },
                },
                {
                  key: "status",
                  label: w("Status", "الحالة"),
                  render: (d: any) => <Status value={d.status} />,
                },
                {
                  key: "dueDate",
                  label: w("Due Date", "تاريخ الاستحقاق"),
                  render: (d: any) => dateText(d.dueDate),
                },
              ]}
              actions={(d: any) => (
                <Button secondary onClick={() => setSelectedDocId(d.id)}>
                  <FileText size={16} />
                  {w("Open", "فتح")}
                </Button>
              )}
            />
          )}
        </>
      )}

      {/* TRIP LOG & INVOICE GENERATOR MODAL */}
      {inspectParty && (
        <PartyTripsModal
          partyId={inspectParty.id}
          partyName={inspectParty.name}
          kind={inspectParty.kind}
          period={selectedPeriod}
          onClose={() => setInspectParty(null)}
          onGenerated={(docId: string) => {
            setInspectParty(null);
            setSelectedDocId(docId);
            partiesQuery.refetch();
            documentsQuery.refetch();
          }}
        />
      )}

      {/* BATCH GENERATION MODAL */}
      {batchModal && (
        <Dialog
          title={w("Batch Generate Monthly Invoices & Settlements", "توليد فواتير ومستحقات الشهر دفعة واحدة")}
          onClose={() => setBatchModal(false)}
        >
          <form onSubmit={handleBatchGenerate}>
            {a.feedback}
            <p className="ops-help">
              {w(
                "Scans all completed trips and operations for this month and automatically generates draft invoices for all clients and settlement documents for all suppliers in 1 click.",
                "يقوم بفحص كافة الرحلات والتشغيلات المكتملة للشهر المحدد، وإنشاء مسودة فاتورة لكل شركة ومستند مستحقات لكل مورد بنقرة واحدة."
              )}
            </p>
            <div className="ops-form-grid">
              <Field label={w("Service Month", "شهر الخدمة")}>
                <input
                  type="month"
                  required
                  value={batchForm.period}
                  onChange={(e) => setBatchForm({ ...batchForm, period: e.target.value })}
                />
              </Field>
              <Field label={w("Payment Due Date", "موعد الاستحقاق")}>
                <input
                  type="date"
                  required
                  value={batchForm.dueDate}
                  onChange={(e) => setBatchForm({ ...batchForm, dueDate: e.target.value })}
                />
              </Field>
            </div>
            <Field label={w("Notes / Reference", "ملاحظات عامة")}>
              <textarea
                value={batchForm.notes}
                placeholder={w("e.g. Monthly corporate dispatch billing", "مثال: تشغيلات وانتقالات الشركات الشهرية")}
                onChange={(e) => setBatchForm({ ...batchForm, notes: e.target.value })}
              />
            </Field>
            <div className="ops-form-footer">
              <Button type="button" secondary onClick={() => setBatchModal(false)}>
                {w("Cancel", "إلغاء")}
              </Button>
              <Button disabled={a.busy}>
                <Layers size={16} />
                {w("Generate Documents Now", "بدء التوليد الآن")}
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* CUSTOM INVOICE MODAL */}
      {customDocModal && (
        <Dialog title={w("Create Custom Document", "إنشاء مستند / فاتورة مخصصة")} onClose={() => setCustomDocModal(false)}>
          <form onSubmit={handleCreateCustomDoc}>
            {a.feedback}
            <div className="ops-form-grid">
              <Field label={w("Document Type", "نوع المستند")}>
                <select
                  value={customForm.kind}
                  onChange={(e) => setCustomForm({ ...customForm, kind: e.target.value, partyId: "" })}
                >
                  <option value="INVOICE">{w("Client Invoice", "فاتورة عميل")}</option>
                  <option value="SETTLEMENT">{w("Supplier Settlement", "مستحقات مورد")}</option>
                </select>
              </Field>
              <Field label={customForm.kind === "INVOICE" ? w("Client Company", "الشركة العميل") : w("Supplier", "المورد")}>
                <select
                  required
                  value={customForm.partyId}
                  onChange={(e) => setCustomForm({ ...customForm, partyId: e.target.value })}
                >
                  <option value="">{w("Select Party...", "اختر الطرف...")}</option>
                  {(customForm.kind === "INVOICE"
                    ? lookup.data?.clients
                    : lookup.data?.partners.filter((p: any) => p.kind !== "STAFFING")
                  )?.map((r: any) => (
                    <option key={r.id} value={r.id}>
                      {r.companyName || r.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={w("Service Month", "شهر الخدمة")}>
                <input
                  type="month"
                  required
                  value={customForm.period}
                  onChange={(e) => setCustomForm({ ...customForm, period: e.target.value })}
                />
              </Field>
              <Field label={w("Due Date", "موعد السداد")}>
                <input
                  type="date"
                  required
                  value={customForm.dueDate}
                  onChange={(e) => setCustomForm({ ...customForm, dueDate: e.target.value })}
                />
              </Field>
            </div>

            {/* Line items */}
            <div style={{ marginTop: "14px", padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <strong>{w("Custom Line Items", "بنود المستند / الفاتورة")}</strong>
                <Button
                  type="button"
                  secondary
                  onClick={() => setCustomLines([...customLines, { description: "", amount: 0 }])}
                >
                  <Plus size={14} />
                  {w("Add Line", "إضافة بند")}
                </Button>
              </div>
              {customLines.map((line, idx) => (
                <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 130px 36px", gap: "8px", marginBottom: "8px" }}>
                  <input
                    type="text"
                    required
                    placeholder={w("Description / Service / Route details", "وصف الخدمة / تفاصيل الخط أو الرحلة")}
                    value={line.description}
                    onChange={(e) => {
                      const next = [...customLines];
                      next[idx].description = e.target.value;
                      setCustomLines(next);
                    }}
                    style={{ padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder={w("Amount EGP", "المبلغ")}
                    value={line.amount || ""}
                    onChange={(e) => {
                      const next = [...customLines];
                      next[idx].amount = Number(e.target.value);
                      setCustomLines(next);
                    }}
                    style={{ padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                  />
                  {customLines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setCustomLines(customLines.filter((_, i) => i !== idx))}
                      style={{ background: "#fee2e2", border: "none", color: "#ef4444", borderRadius: "6px", cursor: "pointer" }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <Field label={w("Notes", "ملاحظات إضافية")}>
              <textarea
                value={customForm.notes}
                onChange={(e) => setCustomForm({ ...customForm, notes: e.target.value })}
              />
            </Field>

            <div className="ops-form-footer">
              <Button type="button" secondary onClick={() => setCustomDocModal(false)}>
                {w("Cancel", "إلغاء")}
              </Button>
              <Button disabled={a.busy}>
                {w("Create Document", "إنشاء المستند")}
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* DOCUMENT DETAIL VIEW */}
      {selectedDoc && (
        <DocumentDetail
          doc={selectedDoc}
          canEdit={canEdit}
          treasuryAccounts={treasuryQuery.data?.accounts || []}
          onClose={() => setSelectedDocId(null)}
          onUpdated={() => {
            documentsQuery.refetch();
            partiesQuery.refetch();
          }}
        />
      )}
    </Page>
  );
}

// ----------------------------------------------------------------------
// MODAL: PARTY TRIPS LOG & ITEM-BY-ITEM INVOICE BUILDER
// ----------------------------------------------------------------------
function PartyTripsModal({ partyId, partyName, kind, period, onClose, onGenerated }: any) {
  const w = useWords();
  const a = useAction();
  const tripsQuery = useData(`/billing/party-trips?partyId=${partyId}&kind=${kind}&period=${period}`);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dueDate, setDueDate] = useState(today());
  const [notes, setNotes] = useState("");

  const items = tripsQuery.data?.items || [];
  const unbilledItems = items.filter((it: any) => !it.isBilled);

  // Initialize selected trips to all unbilled items once loaded
  React.useEffect(() => {
    if (items.length > 0) {
      const initial = new Set<string>();
      items.filter((it: any) => !it.isBilled).forEach((it: any) => initial.add(it.id));
      setSelectedIds(initial);
    }
  }, [items]);

  const toggleTrip = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    const next = new Set<string>();
    unbilledItems.forEach((it: any) => next.add(it.id));
    setSelectedIds(next);
  };

  const deselectAll = () => setSelectedIds(new Set());

  const selectedTrips = items.filter((it: any) => selectedIds.has(it.id));
  const selectedTotal = selectedTrips.reduce((s: number, it: any) => s + Number(it.rate || 0), 0);

  async function handleGenerate() {
    if (selectedIds.size === 0) return;
    try {
      // Build lines
      const customLines = selectedTrips.map((it: any) => ({
        description: `${it.date} · ${it.routeName} (${it.driverName} - ${it.vehiclePlate}) · ${it.tripCount || 1} رحلة`,
        amount: Number(it.rate),
      }));

      const res = await a.run("/documents", {
        kind,
        partyId,
        period,
        dueDate,
        notes: notes || `فاتورة خدمات شهرية (${period}) - عدد ${selectedTrips.length} رحلة`,
        customLines,
      });

      onGenerated(res.id);
    } catch {}
  }

  return (
    <Dialog
      title={
        kind === "INVOICE"
          ? `${w("Company Trips Log & Billing:", "سجل رحلات وفواتير الشركة:")} ${partyName}`
          : `${w("Supplier Trips Log & Settlement:", "سجل رحلات ومستحقات المورد:")} ${partyName}`
      }
      onClose={onClose}
    >
      <div style={{ maxWidth: "900px" }}>
        {a.feedback}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px",
            background: "#f1f5f9",
            borderRadius: "8px",
            marginBottom: "14px",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div>
            <span style={{ fontSize: "13px", color: "#64748b" }}>{w("Service Month:", "شهر الخدمة:")}</span>{" "}
            <strong>{period}</strong> ·{" "}
            <span style={{ fontSize: "13px", color: "#64748b" }}>{w("Total Trips in Month:", "إجمالي الرحلات:")}</span>{" "}
            <strong>{items.length}</strong>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <Button type="button" secondary onClick={selectAll}>
              <CheckSquare size={15} />
              {w("Select All Unbilled", "تحديد كل غير المفوتر")}
            </Button>
            <Button type="button" secondary onClick={deselectAll}>
              <Square size={15} />
              {w("Deselect All", "إلغاء التحديد")}
            </Button>
          </div>
        </div>

        {!tripsQuery.data ? (
          <Loading query={tripsQuery} />
        ) : items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
            {w("No trips found for this party in the selected month.", "لا توجد رحلات مسجلة لهذا الطرف في هذا الشهر.")}
          </div>
        ) : (
          <div style={{ maxHeight: "360px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "right" }}>
                  <th style={{ padding: "10px 12px", width: "40px" }}></th>
                  <th style={{ padding: "10px 12px" }}>{w("Date", "التاريخ")}</th>
                  <th style={{ padding: "10px 12px" }}>{w("Trip #", "كود الرحلة")}</th>
                  <th style={{ padding: "10px 12px" }}>{w("Route", "الخط")}</th>
                  <th style={{ padding: "10px 12px" }}>{w("Vehicle & Driver", "السيارة والسائق")}</th>
                  <th style={{ padding: "10px 12px" }}>{w("Rate EGP", "القيمة")}</th>
                  <th style={{ padding: "10px 12px" }}>{w("Status", "الحالة")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it: any) => {
                  const isSelected = selectedIds.has(it.id);
                  return (
                    <tr
                      key={it.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        background: isSelected ? "#eff6ff" : it.isBilled ? "#fafafa" : "#ffffff",
                        cursor: it.isBilled ? "default" : "pointer",
                      }}
                      onClick={() => !it.isBilled && toggleTrip(it.id)}
                    >
                      <td style={{ padding: "8px 12px", textAlign: "center" }}>
                        {it.isBilled ? (
                          <span style={{ color: "#10b981", fontSize: "11px", fontWeight: 700 }}>✓</span>
                        ) : (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleTrip(it.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                      </td>
                      <td style={{ padding: "8px 12px" }}>{it.date}</td>
                      <td style={{ padding: "8px 12px", fontWeight: 600 }}>{it.tripNumber}</td>
                      <td style={{ padding: "8px 12px" }}>{it.routeName}</td>
                      <td style={{ padding: "8px 12px", color: "#64748b" }}>
                        {it.vehiclePlate} · {it.driverName}
                      </td>
                      <td style={{ padding: "8px 12px", fontWeight: 700, color: "#1e293b" }}>{money(it.rate)}</td>
                      <td style={{ padding: "8px 12px" }}>
                        {it.isBilled ? (
                          <span style={{ background: "#dcfce7", color: "#15803d", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", fontWeight: 600 }}>
                            {w("Billed: ", "مفوتر: ")} {it.documentNumber}
                          </span>
                        ) : (
                          <span style={{ background: "#ffedd5", color: "#c2410c", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", fontWeight: 600 }}>
                            {w("Unbilled", "غير مفوتر")}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Invoice Generation Controls */}
        <div
          style={{
            marginTop: "16px",
            padding: "16px",
            background: "#f8fafc",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <span style={{ fontSize: "14px", color: "#64748b" }}>{w("Selected for Invoice:", "المحدد للفاتورة:")}</span>{" "}
              <strong style={{ fontSize: "16px", color: "#2563eb" }}>{selectedIds.size}</strong> {w("trips", "رحلة")}
            </div>
            <div>
              <span style={{ fontSize: "14px", color: "#64748b" }}>{w("Invoice Total Amount:", "إجمالي قيمة الفاتورة:")}</span>{" "}
              <strong style={{ fontSize: "18px", color: "#10b981" }}>{money(selectedTotal)}</strong>
            </div>
          </div>

          <div className="ops-form-grid" style={{ marginBottom: "12px" }}>
            <Field label={w("Payment Due Date", "موعد الاستحقاق")}>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </Field>
            <Field label={w("Invoice Notes", "ملاحظات الفاتورة")}>
              <input
                type="text"
                placeholder={w("e.g. Monthly shift trips billing", "مثال: تشغيل ورديات شهر سبتمبر")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
            <Button secondary type="button" onClick={onClose}>
              {w("Close", "إغلاق")}
            </Button>
            <Button
              disabled={selectedIds.size === 0 || a.busy}
              onClick={handleGenerate}
            >
              <CheckCircle2 size={16} />
              {kind === "INVOICE"
                ? `${w("Issue Invoice for", "إصدار فاتورة بالرحلات (")} ${money(selectedTotal)} )`
                : `${w("Issue Settlement for", "إصدار كشف مستحقات (")} ${money(selectedTotal)} )`}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

// ----------------------------------------------------------------------
// DOCUMENT DETAIL COMPONENT
// ----------------------------------------------------------------------
function DocumentDetail({ doc, canEdit, treasuryAccounts, onClose, onUpdated }: any) {
  const w = useWords();
  const a = useAction();
  const [payment, setPayment] = useState<any>(null);
  const [confirm, setConfirm] = useState("");

  const paid = (doc.payments || []).reduce((s: number, p: any) => s + Number(p.amount), 0);
  const remaining = Math.max(0, Math.round((Number(doc.total) - paid) * 100) / 100);

  async function run(action: string, body: any = {}) {
    try {
      await a.run(`/documents/${doc.id}/` + action, body);
      setPayment(null);
      setConfirm("");
      onUpdated();
    } catch {}
  }

  return (
    <Dialog title={doc.number} onClose={onClose}>
      <div className="ops-print-document">
        <div className="ops-invoice-header">
          <div>
            <span className="ops-eyebrow">ON TIME TRANSPORTATION</span>
            <h2>
              {doc.kind === "INVOICE"
                ? w("Service Invoice", "فاتورة خدمات نقل")
                : w("Supplier Settlement", "كشف مستحقات مورد")}
            </h2>
            <p style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b", marginTop: "4px" }}>
              {doc.client?.companyName || doc.partner?.name}
            </p>
          </div>
          <div style={{ textAlign: "left" }}>
            <Status value={doc.status} />
            <p style={{ marginTop: "6px", color: "#64748b" }}>
              {w("Period: ", "الفترة: ")} <strong>{doc.period}</strong> · {w("Due: ", "الاستحقاق: ")} <strong>{dateText(doc.dueDate)}</strong>
            </p>
          </div>
        </div>

        {a.feedback}

        <DataTable
          printAll
          rows={doc.lines || []}
          columns={[
            {
              key: "description",
              label: w("Service Item / Trip", "بند الخدمة / الرحلة"),
              render: (r: any) => <span>{r.description}</span>,
            },
            {
              key: "amount",
              label: w("Amount", "المبلغ"),
              render: (r: any) => money(r.amount),
            },
          ]}
        />

        <div className="ops-invoice-totals">
          <span>
            {w("Total", "الإجمالي")} <strong>{money(doc.total)}</strong>
          </span>
          <span>
            {w("Paid", "المدفوع")} <strong style={{ color: "#10b981" }}>{money(paid)}</strong>
          </span>
          <span>
            {w("Outstanding", "المتبقي")}{" "}
            <strong style={{ color: remaining > 0 ? "#ea580c" : "#10b981" }}>
              {money(doc.status === "VOID" ? 0 : remaining)}
            </strong>
          </span>
        </div>

        {doc.notes && (
          <div style={{ padding: "10px", background: "#f8fafc", borderRadius: "6px", marginTop: "12px", border: "1px solid #e2e8f0" }}>
            <small style={{ color: "#64748b" }}>{w("Notes:", "ملاحظات:")}</small>
            <p style={{ margin: "2px 0 0" }}>{doc.notes}</p>
          </div>
        )}

        <div className="ops-actions ops-no-print" style={{ marginTop: "16px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Button secondary onClick={() => window.print()}>
            <Printer size={16} />
            {w("Print / Save PDF", "طباعة / حفظ PDF")}
          </Button>

          {canEdit && doc.status === "DRAFT" && (
            <>
              <Button disabled={a.busy} onClick={() => setConfirm("issue")}>
                <CheckCircle2 size={16} />
                {w("Approve & Issue", "اعتماد وإصدار المستند")}
              </Button>
              <Button
                secondary
                danger
                disabled={a.busy}
                onClick={() => setConfirm("discard")}
              >
                {w("Discard Draft", "إلغاء المسودة")}
              </Button>
            </>
          )}

          {canEdit && (doc.status === "ISSUED" || (doc.status === "PAID" && remaining > 0)) && (
            <Button
              onClick={() =>
                setPayment({
                  amount: remaining,
                  accountId: treasuryAccounts[0]?.id || "",
                  date: today(),
                  reference: `${doc.kind === "INVOICE" ? "REC" : "PAY"}-${doc.number}`,
                  requestKey: crypto.randomUUID(),
                })
              }
            >
              <CreditCard size={16} />
              {doc.kind === "INVOICE"
                ? w("Record Receipt (Deposit to Safe/Bank)", "تسجيل تحصيل وتوريد للخزينة / البنك")
                : w("Record Payment (Disburse from Safe/Bank)", "تسجيل سداد وصرف من الخزينة / البنك")}
            </Button>
          )}
        </div>

        {confirm && (
          <Panel title={w("Confirm Document Action", "تأكيد الإجراء")}>
            <p className="ops-help">
              {confirm === "issue"
                ? w(
                    "Issuing locks this document, publishes it to statements, and posts it to the general accounts ledger.",
                    "الإصدار يقفل المستند، ويسجل المديونية أو الاستحقاق رسمياً في كشف حساب العميل / المورد ودفتر الأستاذ العام."
                  )
                : w(
                    "Discarding cancels this draft document and releases the service items.",
                    "الإلغاء يحذف المسودة ويعيد إتاحة الخدمات لتوليد فاتورة أخرى."
                  )}
            </p>
            <div className="ops-form-footer">
              <Button secondary onClick={() => setConfirm("")}>
                {w("Back", "رجوع")}
              </Button>
              <Button disabled={a.busy} onClick={() => run(confirm)}>
                {w("Confirm Action", "تأكيد الآن")}
              </Button>
            </div>
          </Panel>
        )}

        {payment && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run("payments", payment);
            }}
            className="ops-payment-form"
            style={{ marginTop: "16px", padding: "14px", background: "#f1f5f9", borderRadius: "8px" }}
          >
            <h4 style={{ margin: "0 0 10px", color: "#1e293b" }}>
              {doc.kind === "INVOICE"
                ? w("Receive Client Payment into Treasury Safe / Bank Account", "تسجيل تحصيل وتوريد نقدية إلى الخزينة أو البنك")
                : w("Disburse Supplier Payment from Treasury Safe / Bank Account", "تسجيل سداد وصرف نقدية للمورد من الخزينة أو البنك")}
            </h4>
            <p className="ops-help" style={{ margin: "0 0 12px" }}>
              {w("Select the treasury safe or bank account to record this real cash movement.", "حدد الخزينة أو الحساب البنكي لتسجيل حركة النقدية الفعلية.")}{" "}
              <Link to="/treasury" style={{ color: "#2563eb", fontWeight: 600 }}>
                {w("Manage Treasury", "إدارة الخزائن")}
              </Link>
            </p>
            <div className="ops-form-grid">
              <Field label={doc.kind === "INVOICE" ? w("Receive into Safe/Bank", "التحصيل والتوريد إلى") : w("Pay from Safe/Bank", "السداد والصرف من")}>
                <select
                  required
                  value={payment.accountId}
                  onChange={(e) => setPayment({ ...payment, accountId: e.target.value })}
                >
                  <option value="">{w("Select Safe / Bank Account...", "اختر الخزينة أو الحساب البنكي...")}</option>
                  {treasuryAccounts.map((acc: any) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.kind === "BANK" ? w("Bank", "حساب بنكي") : w("Cash Safe", "خزينة كاش")}) - {w("Balance: ", "الرصيد: ")}{money(acc.balance || 0)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={w("Amount (EGP)", "المبلغ المحصل / المسدد (جنيه)")}>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={remaining}
                  required
                  value={payment.amount}
                  onChange={(e) => setPayment({ ...payment, amount: Number(e.target.value) })}
                />
              </Field>
              <Field label={w("Payment Date", "تاريخ الحركة")}>
                <input
                  type="date"
                  required
                  max={today()}
                  value={payment.date}
                  onChange={(e) => setPayment({ ...payment, date: e.target.value })}
                />
              </Field>
              <Field label={w("Receipt / Bank Reference", "رقم الإيصال أو مرجع البنك / الشيك")}>
                <input
                  required
                  placeholder={w("e.g. REC-10023 or Cheque #4921", "مثال: إيصال توريد رقم 492 / تحويل بنكي")}
                  value={payment.reference}
                  onChange={(e) => setPayment({ ...payment, reference: e.target.value })}
                />
              </Field>
            </div>
            <div className="ops-form-footer">
              <Button type="button" secondary onClick={() => setPayment(null)}>
                {w("Cancel", "إلغاء")}
              </Button>
              <Button disabled={a.busy || !payment.accountId}>
                <CheckCircle2 size={16} />
                {w("Save Payment & Update Treasury", "حفظ وتحديث رصيد الخزينة")}
              </Button>
            </div>
          </form>
        )}

        {/* Payments History */}
        {!!(doc.payments && doc.payments.length) && (
          <div style={{ marginTop: "20px" }}>
            <h4 style={{ margin: "0 0 8px", color: "#1e293b" }}>{w("Recorded Payments & Treasury Movements", "سجل المدفوعات وحركات الخزينة")}</h4>
            <DataTable
              printAll
              rows={doc.payments}
              columns={[
                {
                  key: "date",
                  label: w("Payment date", "تاريخ الدفع"),
                  render: (p: any) => dateText(p.date),
                },
                { key: "reference", label: w("Reference", "رقم الإيصال / المرجع") },
                {
                  key: "account",
                  label: w("Treasury Safe / Bank", "الخزينة / الحساب البنكي"),
                  render: (p: any) =>
                    p.treasuryEntry?.account?.name ||
                    treasuryAccounts.find((a: any) => a.id === p.treasuryEntry?.accountId)?.name ||
                    w("Treasury Allocated", "تم التوريد للخزينة"),
                },
                {
                  key: "amount",
                  label: w("Amount", "المبلغ"),
                  render: (p: any) => money(p.amount),
                },
              ]}
            />
          </div>
        )}
      </div>
    </Dialog>
  );
}
