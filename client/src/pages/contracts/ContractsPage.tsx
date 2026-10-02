import { MutationNotice, QueryNotice } from "../../components/ui/MutationNotice";
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import type { Contract, Client } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { FileText, Plus, Calendar, Bus, Edit3, Trash2, AlertTriangle } from 'lucide-react';

export const ContractsPage: React.FC = () => {
  const { canManage } = useAuth();
  const { t, lang } = useLanguage();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [deletingContract, setDeletingContract] = useState<Contract | null>(null);

  const [formData, setFormData] = useState({
    clientId: '',
    contractNumber: '',
    startDate: '',
    endDate: '',
    assignedVehicleCount: 1,
    pricingModel: 'MONTHLY_FIXED',
    monthlyValue: '',
    notes: '',
  });

  const [editFormData, setEditFormData] = useState({
    clientId: '',
    contractNumber: '',
    startDate: '',
    endDate: '',
    status: 'ACTIVE',
    assignedVehicleCount: 1,
    pricingModel: 'MONTHLY_FIXED',
    monthlyValue: '',
    notes: '',
  });

  const { data: contractsData, isLoading, isError, refetch } = useQuery<{ data: Contract[] }>({
    queryKey: ['contracts'],
    queryFn: async () => {
      const res = await api.get('/contracts');
      return res.data;
    },
  });

  const { data: clientsData } = useQuery<{ data: Client[] }>({
    queryKey: ['clients'],
    queryFn: async () => {
      const res = await api.get('/clients');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post('/contracts', {
        ...payload,
        assignedVehicleCount: Number(payload.assignedVehicleCount),
        monthlyValue: Number(payload.monthlyValue),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      setIsModalOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      return api.put(`/contracts/${id}`, {
        ...payload,
        assignedVehicleCount: Number(payload.assignedVehicleCount),
        monthlyValue: Number(payload.monthlyValue),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      setEditingContract(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/contracts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      setDeletingContract(null);
    },
  });

  const openEditModal = (c: Contract) => {
    setEditingContract(c);
    setEditFormData({
      clientId: c.clientId,
      contractNumber: c.contractNumber,
      startDate: new Date(c.startDate).toISOString().split('T')[0],
      endDate: new Date(c.endDate).toISOString().split('T')[0],
      status: c.status,
      assignedVehicleCount: c.assignedVehicleCount,
      pricingModel: c.pricingModel,
      monthlyValue: String(c.monthlyValue),
      notes: c.notes || '',
    });
  };

  const contracts = contractsData?.data || [];
  const clients = clientsData?.data || [];

  return (
    <div className="space-y-6">
      <QueryNotice failed={isError} retry={refetch} />
      <MutationNotice mutations={[createMutation, updateMutation, deleteMutation]} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('navContracts')}</h1>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'ar'
              ? 'متابعة الشروط التجارية، كوتة الحافلات المخصصة، القيمة الشهرية، وتواريخ التجديد'
              : 'Track commercial terms, dedicated vehicle quotas, billing values, and renewal dates'}
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => {
              setFormData({
                clientId: '',
                contractNumber: '',
                startDate: new Date().toISOString().split('T')[0],
                endDate: '',
                assignedVehicleCount: 1,
                pricingModel: 'MONTHLY_FIXED',
                monthlyValue: '',
                notes: '',
              });
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>{lang === 'ar' ? 'إنشاء عقد جديد' : 'Create Contract'}</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : contracts.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200/80">
          <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-600">
            {lang === 'ar' ? 'لا توجد عقود مسجلة' : 'No contracts registered'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-medium">
                  <th className="py-3 px-4">{lang === 'ar' ? 'رقم العقد' : 'Contract #'}</th>
                  <th className="py-3 px-4">{t('clientFactory')}</th>
                  <th className="py-3 px-4">{lang === 'ar' ? 'مدة وسريان العقد' : 'Term Dates'}</th>
                  <th className="py-3 px-4">{lang === 'ar' ? 'كوتة الحافلات' : 'Vehicle Quota'}</th>
                  <th className="py-3 px-4">{lang === 'ar' ? 'نموذج التسعير' : 'Pricing Model'}</th>
                  <th className="py-3 px-4">{lang === 'ar' ? 'القيمة الشهرية' : 'Monthly Value'}</th>
                  <th className="py-3 px-4">{t('status')}</th>
                  {canManage && <th className="py-3 px-4 text-end">{t('actions')}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                      {contract.contractNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{contract.client?.companyName}</div>
                      <div className="text-[11px] text-slate-500">{contract.client?.contactPerson}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <div className="flex items-center gap-1.5 font-mono">
                        <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>
                          {new Date(contract.startDate).toLocaleDateString()} –{' '}
                          {new Date(contract.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 font-medium text-slate-800">
                        <Bus className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        <span>{contract.assignedVehicleCount} {lang === 'ar' ? 'حافلات' : 'Vehicles'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-600">
                      {lang === 'ar'
                        ? contract.pricingModel === 'MONTHLY_FIXED'
                          ? 'قيمة شهرية ثابتة'
                          : contract.pricingModel === 'PER_TRIP'
                          ? 'حسب الرحلة'
                          : 'مختلط'
                        : contract.pricingModel.replace('_', ' ')}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900 font-mono">
                      EGP {Number(contract.monthlyValue).toLocaleString()} {contract.pricingModel === 'MONTHLY_FIXED' ? (lang === 'ar' ? '/ شهرياً' : '/ month') : (lang === 'ar' ? '/ رحلة (مرجعي)' : '/ trip (reference)')}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge status={contract.status} />
                    </td>
                    {canManage && (
                      <td className="py-3.5 px-4 text-end">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(contract)}
                            title={t('edit')}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeletingContract(contract)}
                            title={t('delete')}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Contract Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={lang === 'ar' ? 'إنشاء عقد نقل جديد' : 'Create New Transportation Contract'}
        subtitle={lang === 'ar' ? 'تحديد التزامات الأسطول ونموذج المحاسبة المالي' : 'Establish client billing and fleet commitment'}
      >
        <MutationNotice mutations={[createMutation, updateMutation, deleteMutation]} />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate(formData);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-slate-700">{t('clientFactory')}</label>
            <select
              required
              value={formData.clientId}
              onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
            >
                <option value="">{lang === "ar" ? "اختر…" : "Choose…"}</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName} ({c.contactPerson})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">{lang === 'ar' ? 'رقم أو كود العقد' : 'Contract Number / Reference'}</label>
            <input
              type="text"
              required
              value={formData.contractNumber}
              onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">{lang === 'ar' ? 'تاريخ البدء' : 'Start Date'}</label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">{lang === 'ar' ? 'تاريخ الانتهاء' : 'End Date'}</label>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">{lang === 'ar' ? 'عدد الحافلات المخصصة' : 'Assigned Vehicle Quota'}</label>
              <input
                type="number"
                min={1}
                required
                value={formData.assignedVehicleCount}
                onChange={(e) => setFormData({ ...formData, assignedVehicleCount: Number(e.target.value) })}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">{lang === 'ar' ? 'طريقة التسعير' : 'Pricing model'}
                <select aria-label={lang === 'ar' ? 'طريقة التسعير' : 'Pricing model'} value={formData.pricingModel} onChange={(e) => setFormData({ ...formData, pricingModel: e.target.value })} className="mt-1 mb-3 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs">
                  <option value="MONTHLY_FIXED">{lang === 'ar' ? 'قيمة شهرية ثابتة' : 'Fixed monthly amount'}</option>
                  <option value="PER_TRIP">{lang === 'ar' ? 'سعر لكل رحلة' : 'Per trip'}</option>
                </select>
              </label>
              <label className="block text-xs font-medium text-slate-700">{formData.pricingModel === 'PER_TRIP' ? (lang === 'ar' ? 'سعر الرحلة المرجعي (EGP)' : 'Reference trip rate (EGP)') : (lang === 'ar' ? 'القيمة الشهرية (EGP)' : 'Monthly amount (EGP)')}</label>
              <input
                type="number"
                min={0.01}
                step="0.01"
                required
                value={formData.monthlyValue}
                onChange={(e) => setFormData({ ...formData, monthlyValue: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-xs font-medium text-slate-600 rounded-lg hover:bg-slate-50"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50"
            >
              {createMutation.isPending ? t('authenticating') : t('save')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Contract Modal */}
      <Modal
        isOpen={!!editingContract}
        onClose={() => setEditingContract(null)}
        title={t('editContract')}
        subtitle={`${lang === 'ar' ? 'العقد' : 'Contract'}: ${editingContract?.contractNumber}`}
      >
        <MutationNotice mutations={[createMutation, updateMutation, deleteMutation]} />
        {editingContract && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate({ id: editingContract.id, payload: editFormData });
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-medium text-slate-700">{t('clientFactory')}</label>
              <select
                required
                value={editFormData.clientId}
                onChange={(e) => setEditFormData({ ...editFormData, clientId: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              >
                <option value="">{lang === 'ar' ? '-- اختر العميل --' : '-- Select Client --'}</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName} ({c.contactPerson})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">{lang === 'ar' ? 'رقم أو كود العقد' : 'Contract Number / Reference'}</label>
                <input
                  type="text"
                  required
                  value={editFormData.contractNumber}
                  onChange={(e) => setEditFormData({ ...editFormData, contractNumber: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">{t('status')}</label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value="ACTIVE">{t('ACTIVE')}</option>
                  <option value="PENDING_RENEWAL">{lang === 'ar' ? 'بانتظار التجديد' : 'Pending Renewal'}</option>
                  <option value="EXPIRED">{t('EXPIRED')}</option>
                  <option value="TERMINATED">{t('TERMINATED')}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">{lang === 'ar' ? 'تاريخ البدء' : 'Start Date'}</label>
                <input
                  type="date"
                  required
                  value={editFormData.startDate}
                  onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">{lang === 'ar' ? 'تاريخ الانتهاء' : 'End Date'}</label>
                <input
                  type="date"
                  required
                  value={editFormData.endDate}
                  onChange={(e) => setEditFormData({ ...editFormData, endDate: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">{lang === 'ar' ? 'عدد الحافلات المخصصة' : 'Assigned Vehicle Quota'}</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={editFormData.assignedVehicleCount}
                  onChange={(e) => setEditFormData({ ...editFormData, assignedVehicleCount: Number(e.target.value) })}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">{lang === 'ar' ? 'طريقة التسعير' : 'Pricing model'}
                <select aria-label={lang === 'ar' ? 'طريقة التسعير' : 'Pricing model'} value={editFormData.pricingModel} onChange={(e) => setEditFormData({ ...editFormData, pricingModel: e.target.value })} className="mt-1 mb-3 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs">
                  <option value="MONTHLY_FIXED">{lang === 'ar' ? 'قيمة شهرية ثابتة' : 'Fixed monthly amount'}</option>
                  <option value="PER_TRIP">{lang === 'ar' ? 'سعر لكل رحلة' : 'Per trip'}</option>
                </select>
              </label>
              <label className="block text-xs font-medium text-slate-700">{editFormData.pricingModel === 'PER_TRIP' ? (lang === 'ar' ? 'سعر الرحلة المرجعي (EGP)' : 'Reference trip rate (EGP)') : (lang === 'ar' ? 'القيمة الشهرية (EGP)' : 'Monthly amount (EGP)')}</label>
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  required
                  value={editFormData.monthlyValue}
                  onChange={(e) => setEditFormData({ ...editFormData, monthlyValue: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">{lang === 'ar' ? 'ملاحظات' : 'Notes'}</label>
              <textarea
                rows={2}
                value={editFormData.notes}
                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingContract(null)}
                className="px-4 py-2 border border-slate-200 text-xs font-medium text-slate-600 rounded-lg hover:bg-slate-50"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50"
              >
                {updateMutation.isPending ? t('authenticating') : t('save')}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Contract Confirmation Modal */}
      <Modal
        isOpen={!!deletingContract}
        onClose={() => setDeletingContract(null)}
        title={t('deleteContract')}
        subtitle={`${t('deleteContractConfirm')} "${deletingContract?.contractNumber}"`}
      >
        <MutationNotice mutations={[createMutation, updateMutation, deleteMutation]} />
        <div className="space-y-4">
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-lg text-xs flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{t('deleteWarningText')}</p>
              <p className="mt-1 text-rose-700">
                {lang === 'ar'
                  ? 'سيتم إلغاء وحذف كافة سجلات تخصيص الحافلات والرحلات المرتبطة بهذا العقد بأمان.'
                  : 'All associated vehicle allocations and linked trip schedules will be safely removed.'}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setDeletingContract(null)}
              className="px-4 py-2 border border-slate-200 text-xs font-medium text-slate-600 rounded-lg hover:bg-slate-50"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              disabled={deleteMutation.isPending}
              onClick={() => deletingContract && deleteMutation.mutate(deletingContract.id)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50"
            >
              {deleteMutation.isPending ? t('authenticating') : t('delete')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};