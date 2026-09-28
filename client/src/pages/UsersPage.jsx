import React, { useState, useEffect } from 'react';
import { useAuth, ROLES } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Users,
  ShieldCheck,
  Building,
  Mail,
  UserCheck,
  RefreshCw,
  Edit2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit role modal
  const [editingUser, setEditingUser] = useState(null);
  const [newDesignation, setNewDesignation] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const availableRoles = [
    ROLES.PI,
    ROLES.COORDINATOR,
    ROLES.MONITOR,
    ROLES.ETHICS,
    ROLES.PV,
    ROLES.ADMIN,
    ROLES.REGULATOR
  ];

  const departments = [
    'Kayachikitsa',
    'Panchakarma',
    'Dravyaguna',
    'Clinical Research',
    'Pharmacovigilance',
    'Shalya Tantra',
    'Shalakya Tantra',
    'Prasuti & Stri Roga',
    'Kaumarbhritya (Pediatrics)',
    'Rasa Shastra & Bhaishajya Kalpana',
    'Institutional Ethics Committee',
    'Administration & Regulatory Directorate'
  ];

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.getUsers();
      setUsers(res.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleEditClick = (u) => {
    setEditingUser(u);
    setNewDesignation(u.designation);
    setNewDepartment(u.department);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    setSubmitting(true);
    try {
      await api.updateUserRole(editingUser.id, {
        designation: newDesignation,
        department: newDepartment
      });
      setEditingUser(null);
      loadUsers();
    } catch (err) {
      alert(err.message || 'Failed to update user designation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2">
            <Users className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
            <span>Institutional User Registry & Access Control</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Admin oversight of role-based credentials, institutional investigators and safety committee delegates
          </p>
        </div>

        <div className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {users.length} Active Staff Accounts
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden text-xs">
        {loading ? (
          <div className="p-8 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-800 mb-2" />
            Loading staff registry...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-3">Name</th>
                  <th className="py-3 px-3">Official Email</th>
                  <th className="py-3 px-3">Designation / Role</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3">Organization</th>
                  <th className="py-3 px-3 text-center">Assigned Studies</th>
                  <th className="py-3 px-3 text-center">Safety Reports</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                      {u.full_name}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {u.email}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300">
                        {u.designation}
                      </span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">
                      {u.department}
                    </td>
                    <td className="py-3 px-3 text-slate-500 truncate max-w-xs">
                      {u.organization}
                    </td>
                    <td className="py-3 px-3 text-center font-bold font-mono">
                      {u.assigned_trials_count}
                    </td>
                    <td className="py-3 px-3 text-center font-bold font-mono">
                      {u.reported_ae_count}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleEditClick(u)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-50 rounded border border-emerald-300 inline-flex items-center space-x-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit Role</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Role Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Modify Role / Designation
              </h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="mt-3 p-2 rounded bg-slate-50 dark:bg-slate-800 text-xs">
              <div className="font-semibold text-slate-900 dark:text-white">{editingUser.full_name}</div>
              <div className="font-mono text-slate-500 text-[11px]">{editingUser.email}</div>
            </div>

            <form onSubmit={handleUpdateUser} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Assigned Designation</label>
                <select
                  value={newDesignation}
                  onChange={(e) => setNewDesignation(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  {availableRoles.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Department</label>
                <select
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  {departments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3 py-1.5 rounded bg-emerald-800 hover:bg-emerald-900 text-white font-semibold"
                >
                  {submitting ? 'Saving...' : 'Update Designation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
