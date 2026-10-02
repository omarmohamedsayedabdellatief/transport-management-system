import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import {
  useWords,
  useData,
  useAction,
  Page,
  Panel,
  Field,
  Button,
  DataTable,
  Loading,
  Status,
  Dialog,
} from "./ui";
import { recordLabel } from "./Records";

export function OperationsSettings() {
  const w = useWords();
  const { isAdmin, canManage } = useAuth();
  const q = useData("/bootstrap");
  const a = useAction();
  const users = useQuery({
    queryKey: ["users"],
    queryFn: async () => (await api.get("/users")).data.data,
    enabled: isAdmin,
  });
  const [resource, setResource] = useState({
    resource: "vehicle",
    id: "",
    supplierId: "",
  });
  const [payer, setPayer] = useState({ contractId: "", billToClientId: "" });
  const [access, setAccess] = useState<any>(null);
  async function run(path: string, body: any) {
    try {
      await a.run(path, body);
      setAccess(null);
    } catch {}
  }
  if (!q.data) return <Loading query={q} />;
  const d = q.data;
  return (
    <Page
      title={w("Workspace settings", "إعدادات التشغيل")}
      description={w(
        "Set resource ownership, billing responsibility, and access to the company portals.",
        "حدد ملكية الموارد ومسؤولية الفوترة وصلاحيات بوابات الشركات.",
      )}
    >
      {a.feedback}
      {canManage && (
        <div className="ops-two-col">
          <Panel
            title={w("Vehicle & driver suppliers", "موردو المركبات والسائقين")}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                run("/resources/supplier", resource);
              }}
              className="ops-padded"
            >
              <Field label={w("Resource type", "نوع المورد")}>
                <select
                  value={resource.resource}
                  onChange={(e) =>
                    setResource({
                      ...resource,
                      resource: e.target.value,
                      id: "",
                    })
                  }
                >
                  <option value="vehicle">{w("Vehicle", "مركبة")}</option>
                  <option value="driver">{w("Driver", "سائق")}</option>
                </select>
              </Field>
              <Field label={w("Resource", "المورد")}>
                <select
                  required
                  value={resource.id}
                  onChange={(e) =>
                    setResource({ ...resource, id: e.target.value })
                  }
                >
                  <option value="">{w("Select", "اختر")}</option>
                  {(resource.resource === "vehicle"
                    ? d.vehicles
                    : d.drivers
                  ).map((r: any) => (
                    <option key={r.id} value={r.id}>
                      {recordLabel(r)} ·{" "}
                      {r.supplier?.name || w("Company owned", "تابع للشركة")}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={w("Supplier / employer", "المورد أو جهة العمل")}>
                <select
                  value={resource.supplierId}
                  onChange={(e) =>
                    setResource({ ...resource, supplierId: e.target.value })
                  }
                >
                  <option value="">
                    {w(
                      "Company owned / employed",
                      "مملوك للشركة / موظف بالشركة",
                    )}
                  </option>
                  {d.partners
                    .filter((p: any) => p.kind !== "STAFFING" && p.active)
                    .map((r: any) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Button disabled={a.busy}>
                {w("Save assignment", "حفظ التعيين")}
              </Button>
            </form>
          </Panel>
          <Panel title={w("Who receives the invoice?", "من يستلم الفاتورة؟")}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                run("/contracts/payer", payer);
              }}
              className="ops-padded"
            >
              <p className="ops-help">
                {w(
                  "The receiving client is the default payer. Add a separate billing company under Clients when a staffing company pays instead. Changes apply to newly generated trips.",
                  "العميل المستفيد هو جهة السداد الافتراضية. أضف جهة فوترة ضمن العملاء إذا كانت شركة التوظيف هي المسؤولة عن الدفع. التغيير يطبق على الرحلات الجديدة.",
                )}
              </p>
              <Field label={w("Contract", "العقد")}>
                <select
                  required
                  value={payer.contractId}
                  onChange={(e) =>
                    setPayer({ ...payer, contractId: e.target.value })
                  }
                >
                  <option value="">{w("Select", "اختر")}</option>
                  {d.contracts.map((r: any) => (
                    <option key={r.id} value={r.id}>
                      {r.contractNumber}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={w("Invoice recipient", "جهة الفوترة")}>
                <select
                  required
                  value={payer.billToClientId}
                  onChange={(e) =>
                    setPayer({ ...payer, billToClientId: e.target.value })
                  }
                >
                  <option value="">{w("Select", "اختر")}</option>
                  {d.clients.map((r: any) => (
                    <option key={r.id} value={r.id}>
                      {r.companyName}
                    </option>
                  ))}
                </select>
              </Field>
              <Button disabled={a.busy}>
                {w("Save payer", "حفظ جهة السداد")}
              </Button>
            </form>
          </Panel>
        </div>
      )}
      {isAdmin && (
        <Panel
          title={w("Portal access", "صلاحيات البوابات")}
          actions={
            <Link to="/users" className="ops-text-link">
              {w("Create / disable users", "إنشاء / تعطيل مستخدمين")}
            </Link>
          }
        >
          <p className="ops-help ops-padded">
            {w(
              "Drivers see assigned trips. Clients see their trips and issued invoices. Suppliers see their work and issued settlements. Access changes end existing sessions.",
              "يرى السائق رحلاته، والعميل رحلاته وفواتيره المعتمدة، والمورد أعماله ومستحقاته. تغيير الصلاحيات ينهي الجلسات الحالية.",
            )}
          </p>
          {users.data ? (
            <DataTable
              rows={users.data}
              columns={[
                { key: "fullName", label: w("User", "المستخدم") },
                { key: "email", label: w("Email", "البريد") },
                { key: "role", label: w("Role", "الدور") },
                {
                  key: "scope",
                  label: w("Scope", "النطاق"),
                  render: (u: any) =>
                    d.clients.find((c: any) => c.id === u.clientScopeId)
                      ?.companyName ||
                    d.partners.find((p: any) => p.id === u.partnerScopeId)
                      ?.name ||
                    d.drivers.find((p: any) => p.id === u.driverScopeId)
                      ?.fullName ||
                    w("Internal workspace", "مساحة العمل الداخلية"),
                },
                {
                  key: "status",
                  label: w("Status", "الحالة"),
                  render: (u: any) => <Status value={u.status} />,
                },
              ]}
              actions={(u: any) => (
                <Button
                  secondary
                  onClick={() => setAccess({ ...u, userId: u.id })}
                >
                  {w("Set access", "تحديد الصلاحيات")}
                </Button>
              )}
            />
          ) : (
            <Loading query={users} />
          )}
        </Panel>
      )}
      {access && (
        <Dialog
          title={w("User access: ", "صلاحيات: ") + access.fullName}
          onClose={() => setAccess(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run("/users/scope", access);
            }}
          >
            {a.feedback}
            <div className="ops-form-grid">
              <Field label={w("Role", "الدور")}>
                <select
                  value={access.role}
                  onChange={(e) =>
                    setAccess({ ...access, role: e.target.value })
                  }
                >
                  {[
                    "ADMIN",
                    "OPERATIONS_MANAGER",
                    "ACCOUNTANT",
                    "VIEWER",
                    "DRIVER",
                    "CLIENT",
                    "SUPPLIER",
                  ].map((r) => (
                    <option key={r} value={r}>
                      {w(
                        r,
                        (
                          {
                            ADMIN: "مدير النظام",
                            OPERATIONS_MANAGER: "مدير التشغيل",
                            ACCOUNTANT: "محاسب",
                            VIEWER: "مشاهد",
                            DRIVER: "سائق",
                            CLIENT: "عميل",
                            SUPPLIER: "مورد",
                          } as any
                        )[r],
                      )}
                    </option>
                  ))}
                </select>
              </Field>
              {["CLIENT", "SUPPLIER", "DRIVER"].includes(access.role) && (
                <Field label={w("Allowed records", "السجلات المسموح بها")}>
                  <select
                    required
                    value={
                      access[
                        access.role === "CLIENT"
                          ? "clientScopeId"
                          : access.role === "SUPPLIER"
                            ? "partnerScopeId"
                            : "driverScopeId"
                      ] || ""
                    }
                    onChange={(e) =>
                      setAccess({
                        ...access,
                        [access.role === "CLIENT"
                          ? "clientScopeId"
                          : access.role === "SUPPLIER"
                            ? "partnerScopeId"
                            : "driverScopeId"]: e.target.value,
                      })
                    }
                  >
                    <option value="">{w("Select scope", "اختر النطاق")}</option>
                    {(access.role === "CLIENT"
                      ? d.clients
                      : access.role === "SUPPLIER"
                        ? d.partners
                        : d.drivers
                    ).map((r: any) => (
                      <option value={r.id} key={r.id}>
                        {recordLabel(r)}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </div>
            <div className="ops-form-footer">
              <Button disabled={a.busy}>
                {w("Save access", "حفظ الصلاحيات")}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </Page>
  );
}
export function AuditLog() {
  const w = useWords();
  const q = useData("/audit");
  return (
    <Page
      title={w("Activity log", "سجل النشاط")}
      description={w(
        "The latest 200 recorded operations, financial actions, and access changes.",
        "آخر ٢٠٠ إجراء مسجل للتشغيل والحسابات والصلاحيات.",
      )}
    >
      {q.data ? (
        <DataTable
          rows={q.data}
          columns={[
            {
              key: "createdAt",
              label: w("Time", "الوقت"),
              render: (r: any) => new Date(r.createdAt).toLocaleString(),
            },
            { key: "action", label: w("Action", "الإجراء") },
            { key: "entity", label: w("Record type", "نوع السجل") },
            { key: "entityId", label: w("Record", "السجل") },
            {
              key: "detail",
              label: w("Details", "التفاصيل"),
              render: (r: any) => (
                <details>
                  <summary>{w("View details", "عرض التفاصيل")}</summary>
                  <pre className="ops-json">
                    {JSON.stringify(JSON.parse(r.detail), null, 2)}
                  </pre>
                </details>
              ),
            },
          ]}
        />
      ) : (
        <Loading query={q} />
      )}
    </Page>
  );
}
