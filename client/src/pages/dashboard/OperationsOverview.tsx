import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api from "../../services/api";
import { useLanguage } from "../../contexts/LanguageContext";
import { QueryNotice } from "../../components/ui/MutationNotice";
export function OperationsOverview() {
  const { lang } = useLanguage(),
    ar = lang === "ar";
  const q = useQuery({
    queryKey: ["operations-summary"],
    queryFn: async () => (await api.get("/operations/summary")).data.data,
  });
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">
        {ar ? "لوحة التشغيل" : "Operations overview"}
      </h1>
      <QueryNotice failed={q.isError} retry={q.refetch} />
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          [ar ? "رحلات اليوم" : "Today’s trips", q.data?.trips?.length || 0],
          [ar ? "الركاب" : "Passengers", q.data?.passengers || 0],
          [ar ? "الجداول" : "Schedules", q.data?.plans || 0],
        ].map(([label, value]) => (
          <section key={label} className="ops-panel ops-padded">
            <p>{label}</p>
            <strong className="text-3xl">{value}</strong>
          </section>
        ))}
      </div>
      <div className="flex gap-3">
        <Link className="ops-button" to="/trips">
          {ar ? "عرض التشغيل" : "Open dispatch"}
        </Link>
        <Link className="ops-button secondary" to="/vehicles">
          {ar ? "السيارات" : "Vehicles"}
        </Link>
      </div>
      <p>
        {ar
          ? "تنبيهات مستندات وصيانة السيارات"
          : "Vehicle document and maintenance alerts"}
        : {q.data?.issues || 0}
      </p>
    </div>
  );
}
