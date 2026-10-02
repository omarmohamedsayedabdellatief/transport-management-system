import { MutationNotice, QueryNotice } from "../../components/ui/MutationNotice";
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import type { User, UserRole, UserStatus } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Plus } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export const UsersPage: React.FC = () => {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    role: 'OPERATIONS_MANAGER' as UserRole,
  });

  const { data: usersData, isLoading, isError, refetch } = useQuery<{ data: User[] }>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post('/users', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsModalOpen(false);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: UserStatus }) => {
      return api.patch(`/users/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const users = usersData?.data || [];

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return t('admin');
      case 'OPERATIONS_MANAGER':
        return t('operations');
      case 'VIEWER':
        return t('auditor');
      default:
        return role;
    }
  };

  return (
    <div className="space-y-6">
      <QueryNotice failed={isError} retry={refetch} />
      <MutationNotice mutations={[createMutation, updateStatusMutation]} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('systemUserManagement')}</h1>
          <p className="text-xs text-slate-500 mt-1">
            {t('userManagementSubtitle')}
          </p>
        </div>
        <button
          onClick={() => {
            setFormData({
              fullName: '',
              email: '',
              password: '',
              phone: '',
              role: 'OPERATIONS_MANAGER',
            });
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>{t('addUser')}</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-medium">
                  <th className="py-3 px-4">{t('user')}</th>
                  <th className="py-3 px-4">{t('contact')}</th>
                  <th className="py-3 px-4">{t('assignedRole')}</th>
                  <th className="py-3 px-4">{t('accountStatus')}</th>
                  <th className="py-3 px-4">{t('registeredDate')}</th>
                  <th className="py-3 px-4 text-right rtl:text-left">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 break-words break-all">{u.fullName}</div>
                      <div className="text-[11px] text-slate-500 break-words break-all">{u.email}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{u.phone || '—'}</td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                        {getRoleLabel(u.role)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge status={u.status} />
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right rtl:text-left">
                      {u.status === 'ACTIVE' ? (
                        <button
                          onClick={() => updateStatusMutation.mutate({ id: u.id, status: 'INACTIVE' })}
                          className="text-xs font-medium text-rose-600 hover:text-rose-700"
                        >
                          {t('deactivate')}
                        </button>
                      ) : (
                        <button
                          onClick={() => updateStatusMutation.mutate({ id: u.id, status: 'ACTIVE' })}
                          className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                        >
                          {t('activate')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t('createSystemUser')}
        subtitle={t('provisionSubtitle')}
      >
        <MutationNotice mutations={[createMutation, updateStatusMutation]} />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate(formData);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-slate-700">{t('fullName')}</label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={100}
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="e.g. Sara Nabil"
              className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">{t('emailAddress')}</label>
            <input
              type="email"
              required
              maxLength={100}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="sara@tms.com"
              className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">{t('initialPassword')}</label>
              <input
                type="password"
                required
                minLength={6}
                maxLength={100}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">{t('phone')}</label>
              <input
                type="tel"
                pattern="[0-9+ ]*"
                maxLength={20}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">{t('assignedRole')}</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
            >
              <option value="OPERATIONS_MANAGER">{t('roleOpsDesc')}</option>
              <option value="VIEWER">{t('roleViewerDesc')}</option>
              <option value="ADMIN">{t('roleAdminDesc')}</option>
            </select>
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
              {createMutation.isPending ? t('creating') : t('createAccount')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};