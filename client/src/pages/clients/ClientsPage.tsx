import { MutationNotice, QueryNotice } from "../../components/ui/MutationNotice";
import React, { useState, useDeferredValue } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import type { Client } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Building2, Plus, Search, Mail, Phone, MapPin, FileText, Edit3, Trash2, AlertTriangle } from 'lucide-react';

export const ClientsPage: React.FC = () => {
  const { can, canManage } = useAuth();
  const { t, lang } = useLanguage();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);

  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    taxId: '',
    notes: '',
  });

  const { data, isLoading, isError, refetch } = useQuery<{ data: Client[] }>({
    queryKey: ['clients', deferredSearch],
    queryFn: async () => {
      const res = await api.get(`/clients?search=${deferredSearch}`);
      return res.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingClient) {
        return api.put(`/clients/${editingClient.id}`, payload);
      }
      return api.post('/clients', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setIsModalOpen(false);
      setEditingClient(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/clients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      setDeletingClient(null);
    },
  });

  const openCreateModal = () => {
    setEditingClient(null);
    setFormData({
      companyName: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      taxId: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (c: Client) => {
    setEditingClient(c);
    setFormData({
      companyName: c.companyName,
      contactPerson: c.contactPerson,
      phone: c.phone,
      email: c.email,
      address: c.address,
      taxId: c.taxId || '',
      notes: c.notes || '',
    });
    setIsModalOpen(true);
  };

  const clients = data?.data || [];

  return (
    <div className="space-y-6">
      <QueryNotice failed={isError} retry={refetch} />
      <MutationNotice mutations={[saveMutation, deleteMutation]} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('navClients')}</h1>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'ar'
              ? 'إدارة عقود الشركات، مقرات المصانع، وشركاء خدمات نقل الموظفين'
              : 'Manage corporate contracts, factory sites, and employee transit partners'}
          </p>
        </div>
        {can('clients.create') && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>{lang === 'ar' ? 'إضافة شركة / مصنع' : 'Add New Client'}</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
        <Search className="h-4 w-4 text-slate-400 rtl:mr-1 ltr:ml-1" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={lang === 'ar' ? 'البحث عن شركة بالاسم أو الشخص المسؤول أو البريد...' : 'Search clients by company name, contact, or email...'}
          className="w-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : clients.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200/80">
          <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-600">
            {lang === 'ar' ? 'لم يتم العثور على شركات مسجلة' : 'No client companies found'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {clients.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-sm text-slate-900 leading-snug break-words break-all line-clamp-2 min-w-0 flex-1" title={c.companyName}>{c.companyName}</h3>
                  <Badge status={c.status} />
                </div>
                <div className="text-xs text-slate-500 mt-1 font-medium break-words break-all">{c.contactPerson}</div>

                <div className="mt-4 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono">{c.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{c.email}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2 break-words break-all">{c.address}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <FileText className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  <span>{c._count?.contracts || 0} {lang === 'ar' ? 'عقود نشطة' : 'Active Contracts'}</span>
                </div>
                {canManage && (
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={!can('clients.edit')} onClick={() => openEditModal(c)}
                      title={t('edit')}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      disabled={!can('clients.delete')} onClick={() => setDeletingClient(c)}
                      title={t('delete')}
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClient ? (lang === 'ar' ? 'تعديل بيانات الشركة' : 'Edit Client Company') : (lang === 'ar' ? 'تسجيل شركة أو مصنع جديد' : 'Register New Client Company')}
        subtitle={lang === 'ar' ? 'بيانات الشريك التجاري لنقل الموظفين والعمال' : 'Corporate employee shuttle client details'}
      >
        <MutationNotice mutations={[saveMutation, deleteMutation]} />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate(formData);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-slate-700">{lang === 'ar' ? 'اسم الشركة / المصنع' : 'Company Name'}</label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={150}
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              placeholder={lang === 'ar' ? 'مثال: شركة أليكس للملابس الجاهزة' : 'e.g. Apex Industrial Manufacturing'}
              className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">{lang === 'ar' ? 'مسؤول الاتصال (HR / اللوجستيات)' : 'Contact Person'}</label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={100}
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">{lang === 'ar' ? 'رقم الهاتف' : 'Phone Number'}</label>
              <input
                type="tel"
                pattern="[0-9+ ]*"
                maxLength={25}
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+20 100 000 0000"
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">{lang === 'ar' ? 'البريد الإلكتروني الرسمي' : 'Official Email'}</label>
            <input
              type="email"
              required
              maxLength={100}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="logistics@company.com"
              className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">{lang === 'ar' ? 'عنوان المصنع / المنطقة الصناعية' : 'Physical Address / Factory Zone'}</label>
            <textarea
              required
              maxLength={250}
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
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
              disabled={saveMutation.isPending}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50"
            >
              {saveMutation.isPending ? t('authenticating') : editingClient ? t('update') : t('save')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Client Confirmation Modal */}
      <Modal
        isOpen={!!deletingClient}
        onClose={() => setDeletingClient(null)}
        title={t('deleteClient')}
        subtitle={`${t('deleteClientConfirm')} "${deletingClient?.companyName}"`}
      >
        <MutationNotice mutations={[saveMutation, deleteMutation]} />
        <div className="space-y-4">
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-lg text-xs flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{t('deleteWarningText')}</p>
              <p className="mt-1 text-rose-700">
                {lang === 'ar'
                  ? 'ملاحظة: سيتم حذف العقود وخطوط السير والرحلات المرتبطة بهذه الشركة.'
                  : 'Note: Contracts, routes, and trips linked to this client will be removed.'}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setDeletingClient(null)}
              className="px-4 py-2 border border-slate-200 text-xs font-medium text-slate-600 rounded-lg hover:bg-slate-50"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              disabled={deleteMutation.isPending}
              onClick={() => deletingClient && deleteMutation.mutate(deletingClient.id)}
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