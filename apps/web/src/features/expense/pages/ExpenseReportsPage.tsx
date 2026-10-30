import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Download,
  Filter,
  RotateCcw,
  Receipt,
  Users,
  Building2,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  useExpenseReports,
  ExpenseReportsFilter,
  ExpenseReportClaimItem,
  ExpenseReportBreakdownItem,
  ExpenseApproverPerformanceItem,
} from '../hooks/use-expenses';
import {
  useExpenseCategoriesQuery,
  useExpenseTypesQuery,
} from '../hooks/use-expense-settings';
import {
  useDepartmentOptionsQuery,
  useEmployeeOptionsQuery,
} from '@/features/organization/hooks/use-organization';

type ReportTab =
  | 'monthly'
  | 'date_range'
  | 'employee'
  | 'category'
  | 'approvals'
  | 'rejected'
  | 'reimbursement';

export const ExpenseReportsPage: React.FC = (): React.ReactElement => {
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [activeTab, setActiveTab] = useState<ReportTab>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [dateBasis, setDateBasis] = useState<'EXPENSE_DATE' | 'APPROVAL_DATE' | 'REIMBURSEMENT_DATE'>('EXPENSE_DATE');
  const [selectedDeptId, setSelectedDeptId] = useState<number | undefined>(undefined);
  const [selectedEmpId, setSelectedEmpId] = useState<number | undefined>(undefined);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined);
  const [selectedExpenseType, setSelectedExpenseType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [groupBy, setGroupBy] = useState<'category' | 'department' | 'employee'>('category');

  // Master options
  const { data: deptOptions = [] } = useDepartmentOptionsQuery();
  const { data: empOptions = [] } = useEmployeeOptionsQuery();
  const { data: categoryOptions = [] } = useExpenseCategoriesQuery();
  const { data: typeOptions = [] } = useExpenseTypesQuery();

  // Build filter object
  const reportFilter: ExpenseReportsFilter = useMemo(() => {
    const f: ExpenseReportsFilter = {
      report_type: activeTab,
      date_basis: dateBasis,
      group_by: groupBy,
    };

    if (activeTab === 'monthly') {
      f.month = selectedMonth;
    } else {
      if (fromDate) f.from_date = fromDate;
      if (toDate) f.to_date = toDate;
      if (!fromDate && !toDate) f.month = selectedMonth;
    }

    if (selectedDeptId) f.department_id = selectedDeptId;
    if (selectedEmpId) f.emp_id = selectedEmpId;
    if (selectedCategoryId) f.category_id = selectedCategoryId;
    if (selectedExpenseType) f.expense_type = selectedExpenseType;
    if (selectedStatus) f.status = selectedStatus;

    return f;
  }, [
    activeTab,
    selectedMonth,
    fromDate,
    toDate,
    dateBasis,
    groupBy,
    selectedDeptId,
    selectedEmpId,
    selectedCategoryId,
    selectedExpenseType,
    selectedStatus,
  ]);

  const { data, isLoading } = useExpenseReports(reportFilter);

  // Quick Pick date range helpers
  const handleQuickPick = (pick: 'this_month' | 'last_month' | 'this_quarter' | 'last_quarter' | 'this_fy') => {
    const d = new Date();
    const currYear = d.getFullYear();
    const currMonth = d.getMonth(); // 0-11

    if (pick === 'this_month') {
      const mStr = `${currYear}-${String(currMonth + 1).padStart(2, '0')}`;
      setSelectedMonth(mStr);
      setFromDate('');
      setToDate('');
    } else if (pick === 'last_month') {
      const prev = new Date(currYear, currMonth - 1, 1);
      const mStr = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
      setSelectedMonth(mStr);
      setFromDate('');
      setToDate('');
    } else if (pick === 'this_quarter') {
      const quarterIndex = Math.floor(currMonth / 3);
      const qStartMonth = quarterIndex * 3;
      const qStart = new Date(Date.UTC(currYear, qStartMonth, 1));
      const qEnd = new Date(Date.UTC(currYear, qStartMonth + 3, 0));
      setFromDate(qStart.toISOString().split('T')[0]);
      setToDate(qEnd.toISOString().split('T')[0]);
    } else if (pick === 'last_quarter') {
      let qYear = currYear;
      let prevQ = Math.floor(currMonth / 3) - 1;
      if (prevQ < 0) {
        prevQ = 3;
        qYear -= 1;
      }
      const qStartMonth = prevQ * 3;
      const qStart = new Date(Date.UTC(qYear, qStartMonth, 1));
      const qEnd = new Date(Date.UTC(qYear, qStartMonth + 3, 0));
      setFromDate(qStart.toISOString().split('T')[0]);
      setToDate(qEnd.toISOString().split('T')[0]);
    } else if (pick === 'this_fy') {
      // Indian Financial Year: April 1 to March 31
      let fyStartYear = currYear;
      if (currMonth < 3) {
        fyStartYear -= 1;
      }
      const fyStart = `${fyStartYear}-04-01`;
      const fyEnd = `${fyStartYear + 1}-03-31`;
      setFromDate(fyStart);
      setToDate(fyEnd);
    }
  };

  const handleClearFilters = () => {
    setSelectedMonth(currentMonthStr);
    setFromDate('');
    setToDate('');
    setDateBasis('EXPENSE_DATE');
    setSelectedDeptId(undefined);
    setSelectedEmpId(undefined);
    setSelectedCategoryId(undefined);
    setSelectedExpenseType('');
    setSelectedStatus('');
    setGroupBy('category');
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    if (!data) return;

    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let filenamePrefix = `expense-report-${activeTab}`;

    if (activeTab === 'monthly' || activeTab === 'date_range') {
      headers = [
        groupBy === 'department' ? 'Department' : groupBy === 'employee' ? 'Employee' : 'Category',
        'Claims Count',
        'Office Expense (INR)',
        'Personal Expense (INR)',
        'Total (INR)',
        'Share %',
      ];
      rows = (data.breakdown || []).map((b) => [
        b.name,
        b.claims_count,
        b.office_amount.toFixed(2),
        b.personal_amount.toFixed(2),
        b.total_amount.toFixed(2),
        `${b.share_percentage}%`,
      ]);
    } else if (activeTab === 'category') {
      headers = [
        'Category',
        'Limit per Claim',
        'Claims Count',
        'Total (INR)',
        'Avg per Claim (INR)',
        'Claims Above Limit',
      ];
      // Aggregate by category from claims
      const catMap = new Map<number, { name: string; limit: string; count: number; total: number; aboveLimit: number }>();
      (data.claims || []).forEach((c) => {
        if (!catMap.has(c.category_id)) {
          catMap.set(c.category_id, {
            name: c.category_name,
            limit: c.category_limit ? `INR ${c.category_limit}` : 'No limit',
            count: 0,
            total: 0,
            aboveLimit: 0,
          });
        }
        const st = catMap.get(c.category_id)!;
        st.count += 1;
        st.total += c.amount;
        if (c.is_above_limit) st.aboveLimit += 1;
      });

      rows = Array.from(catMap.values()).map((c) => [
        c.name,
        c.limit,
        c.count,
        c.total.toFixed(2),
        (c.count > 0 ? (c.total / c.count).toFixed(2) : '0.00'),
        c.aboveLimit,
      ]);
    } else if (activeTab === 'approvals') {
      headers = [
        'Approver',
        'Claims Decided',
        'Approved',
        'Rejected',
        'Avg Days to Decide',
        'Waiting Now',
        'Oldest Waiting (Days)',
      ];
      rows = (data.approvals_summary || []).map((a) => [
        a.approver_name,
        a.claims_decided,
        a.claims_approved,
        a.claims_rejected,
        a.avg_days_to_decide,
        a.waiting_now,
        a.oldest_waiting_days,
      ]);
    } else if (activeTab === 'rejected') {
      headers = [
        'Claim No.',
        'Employee',
        'Expense Date',
        'Category',
        'Amount (INR)',
        'Reason',
        'Remarks',
        'Approver',
        'Decided Date',
      ];
      rows = (data.claims || [])
        .filter((c) => c.status === 'REJECTED')
        .map((c) => [
          c.claim_no,
          c.employee_name,
          c.expense_date,
          c.category_name,
          c.amount.toFixed(2),
          c.rejection_reason || '',
          c.decision_remarks || '',
          c.approver_name,
          c.decided_at ? c.decided_at.split('T')[0] : '',
        ]);
    } else if (activeTab === 'reimbursement') {
      headers = [
        'Claim No.',
        'Employee',
        'Approved On',
        'Amount (INR)',
        'Payout Method',
        'Status',
        'Payment Mode',
        'Reference No.',
        'Payment Date',
      ];
      rows = (data.claims || [])
        .filter((c) => c.status === 'APPROVED' || c.status === 'REIMBURSED')
        .map((c) => [
          c.claim_no,
          c.employee_name,
          c.decided_at ? c.decided_at.split('T')[0] : '',
          c.amount.toFixed(2),
          c.reimbursement_method === 'PAYROLL' ? 'With salary' : 'Directly',
          c.status,
          c.payment_mode || '',
          c.payment_reference_no || '',
          c.payment_date || '',
        ]);
    } else {
      // Employee-wise
      headers = [
        'Claim No.',
        'Employee',
        'Expense Date',
        'Category',
        'Type',
        'Amount (INR)',
        'Status',
        'Approver',
        'Decision Date',
      ];
      rows = (data.claims || []).map((c) => [
        c.claim_no,
        c.employee_name,
        c.expense_date,
        c.category_name,
        c.expense_type,
        c.amount.toFixed(2),
        c.status,
        c.approver_name,
        c.decided_at ? c.decided_at.split('T')[0] : '',
      ]);
    }

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))].join(
        '\n',
      );

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filenamePrefix}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totals = data?.totals || {
    total_amount: 0,
    total_claims: 0,
    office_amount: 0,
    office_count: 0,
    personal_amount: 0,
    personal_count: 0,
    rejected_amount: 0,
    rejected_count: 0,
  };

  const maxTrendAmount = useMemo(() => {
    if (!data?.trend || data.trend.length === 0) return 1;
    return Math.max(...data.trend.map((t) => t.total_amount), 1);
  }, [data?.trend]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-indigo-600" />
            Expense Reports
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Analyze company expenditure, monthly spending trends, policy compliance, and approval turnaround
          </p>
        </div>

        {/* Export & Reset Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleClearFilters}
            className="px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 transition cursor-pointer shadow-sm"
            title="Reset filters"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear Filters
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV / Excel
          </button>
        </div>
      </div>

      {/* Report Tabs (BFD Section 11 Part 2) */}
      <div className="border-b border-slate-200 flex flex-wrap gap-2 text-sm font-medium">
        {[
          { key: 'monthly', label: 'Monthly Expense Report' },
          { key: 'date_range', label: 'Date-Range Report' },
          { key: 'employee', label: 'Employee-wise Claims' },
          { key: 'category', label: 'Category-wise Summary' },
          { key: 'approvals', label: 'Approvals Report' },
          { key: 'rejected', label: 'Rejected Claims Report' },
          { key: 'reimbursement', label: 'Reimbursement Report' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as ReportTab)}
            className={`pb-3 px-3 transition cursor-pointer border-b-2 flex items-center gap-2 ${
              activeTab === tab.key
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter Toolbar (BFD Section 11 Part 1 Marker 4 & Part 3) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" /> Filter Parameters
          </div>
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-400 mr-1">Quick picks:</span>
            <button
              onClick={() => handleQuickPick('this_month')}
              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition"
            >
              This Month
            </button>
            <button
              onClick={() => handleQuickPick('last_month')}
              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition"
            >
              Last Month
            </button>
            <button
              onClick={() => handleQuickPick('this_quarter')}
              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition"
            >
              This Quarter
            </button>
            <button
              onClick={() => handleQuickPick('last_quarter')}
              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition"
            >
              Last Quarter
            </button>
            <button
              onClick={() => handleQuickPick('this_fy')}
              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition"
            >
              This FY (Apr-Mar)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Month / Date Range */}
          {activeTab === 'monthly' ? (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Calendar Month</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                />
              </div>
            </>
          )}

          {/* Date Basis */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Date Basis</label>
            <select
              value={dateBasis}
              onChange={(e) => setDateBasis(e.target.value as any)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white"
            >
              <option value="EXPENSE_DATE">Expense Date</option>
              <option value="APPROVAL_DATE">Approval Date</option>
              <option value="REIMBURSEMENT_DATE">Reimbursement Date</option>
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Department</label>
            <select
              value={selectedDeptId || ''}
              onChange={(e) => setSelectedDeptId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white"
            >
              <option value="">All Departments</option>
              {deptOptions.map((d: any) => (
                <option key={d.dep_id || d.id} value={d.dep_id || d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Employee Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Employee</label>
            <select
              value={selectedEmpId || ''}
              onChange={(e) => setSelectedEmpId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white"
            >
              <option value="">All Employees</option>
              {empOptions.map((emp: any) => (
                <option key={emp.emp_id || emp.id} value={emp.emp_id || emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
            <select
              value={selectedCategoryId || ''}
              onChange={(e) => setSelectedCategoryId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white"
            >
              <option value="">All Categories</option>
              {categoryOptions.map((c: any) => (
                <option key={c.category_id} value={c.category_id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Expense Type Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Expense Type</label>
            <select
              value={selectedExpenseType}
              onChange={(e) => setSelectedExpenseType(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white"
            >
              <option value="">All Types</option>
              {typeOptions.map((t) => (
                <option key={t.type_id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Totals Metric Cards (BFD Section 11 Marker 5) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Period Spend */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Period Spend</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              ₹{totals.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{totals.total_claims} claims approved / reimbursed</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            ₹
          </div>
        </div>

        {/* Card 2: Office Expense Split */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Office Expenses</span>
            <div className="text-2xl font-bold text-emerald-700 mt-1">
              ₹{totals.office_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {totals.office_count} claims (
              {totals.total_amount > 0 ? Math.round((totals.office_amount / totals.total_amount) * 100) : 0}%)
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Personal Expense Split */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Personal Expenses</span>
            <div className="text-2xl font-bold text-blue-700 mt-1">
              ₹{totals.personal_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {totals.personal_count} claims (
              {totals.total_amount > 0 ? Math.round((totals.personal_amount / totals.total_amount) * 100) : 0}%)
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Rejected Claims */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rejected Claims</span>
            <div className="text-2xl font-bold text-rose-600 mt-1">
              ₹{totals.rejected_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5 text-rose-500" />
              <span>{totals.rejected_count} claims rejected in period</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 6-Month Spending Trend (BFD Section 11 Marker 6) */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              6-Month Spending Trend (Historical up to selected month)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click on any monthly bar to switch the active report filter to that month
            </p>
          </div>
        </div>

        <div className="grid grid-cols-6 gap-3 items-end pt-6 pb-2 border-b border-slate-100 h-44">
          {(data?.trend || []).map((t) => {
            const heightPercent = Math.max(12, Math.round((t.total_amount / maxTrendAmount) * 100));
            return (
              <div
                key={t.month}
                onClick={() => {
                  setSelectedMonth(t.month);
                  setActiveTab('monthly');
                }}
                className={`flex flex-col items-center justify-end h-full cursor-pointer group transition p-2 rounded-lg ${
                  t.is_selected ? 'bg-indigo-50/70 border border-indigo-200' : 'hover:bg-slate-50'
                }`}
                title={`Click to view ${t.label}: ₹${t.total_amount.toLocaleString('en-IN')} (${t.claim_count} claims)`}
              >
                <div className="text-[11px] font-semibold text-slate-600 mb-1 group-hover:text-indigo-600">
                  ₹{t.total_amount >= 1000 ? `${(t.total_amount / 1000).toFixed(1)}k` : t.total_amount}
                </div>
                <div className="w-full bg-slate-100 rounded-t-md overflow-hidden flex flex-col justify-end h-28">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-t-md transition-all ${
                      t.is_selected
                        ? 'bg-indigo-600 shadow-sm'
                        : 'bg-indigo-300 group-hover:bg-indigo-400'
                    }`}
                  />
                </div>
                <div
                  className={`mt-2 text-xs font-medium text-center ${
                    t.is_selected ? 'text-indigo-700 font-bold' : 'text-slate-500'
                  }`}
                >
                  {t.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Breakdown / Report Details Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              {activeTab === 'monthly' && 'Monthly Spending Breakdown'}
              {activeTab === 'date_range' && 'Date-Range Spending Breakdown'}
              {activeTab === 'employee' && 'Employee-wise Claims Report'}
              {activeTab === 'category' && 'Category-wise Performance Summary'}
              {activeTab === 'approvals' && 'Approvals Turnaround & Queue Report'}
              {activeTab === 'rejected' && 'Rejected Claims Report (Audit)'}
              {activeTab === 'reimbursement' && 'Reimbursement Payouts Report'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Period: {data?.period?.from_date} to {data?.period?.to_date} • Basis: {data?.period?.date_basis}
            </p>
          </div>

          {(activeTab === 'monthly' || activeTab === 'date_range') && (
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium">
              <span className="text-slate-500 px-2">Group by:</span>
              <button
                onClick={() => setGroupBy('category')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  groupBy === 'category' ? 'bg-white shadow-xs text-indigo-600 font-semibold' : 'text-slate-600'
                }`}
              >
                Category
              </button>
              <button
                onClick={() => setGroupBy('department')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  groupBy === 'department' ? 'bg-white shadow-xs text-indigo-600 font-semibold' : 'text-slate-600'
                }`}
              >
                Department
              </button>
              <button
                onClick={() => setGroupBy('employee')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  groupBy === 'employee' ? 'bg-white shadow-xs text-indigo-600 font-semibold' : 'text-slate-600'
                }`}
              >
                Employee
              </button>
            </div>
          )}
        </div>

        {/* Content based on Active Tab */}
        {isLoading ? (
          <div className="p-16 text-center text-slate-400">
            <div className="inline-block animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full mb-2" />
            <p className="text-xs font-medium text-slate-500">Loading expense report data...</p>
          </div>
        ) : (
          <>
            {/* =========================================================================
                TABS 1 & 2: MONTHLY & DATE-RANGE BREAKDOWN TABLES
               ========================================================================= */}
            {(activeTab === 'monthly' || activeTab === 'date_range') && (
              <>
                {(!data?.breakdown || data.breakdown.length === 0) ? (
                  <div className="p-16 text-center text-slate-400">
                    <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <h4 className="text-sm font-semibold text-slate-700">No expenses match your filters</h4>
                    <p className="text-xs text-slate-500 mt-1">Try modifying the month, date basis, or category filters.</p>
                    <button
                      onClick={handleClearFilters}
                      className="mt-3 text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer underline"
                    >
                      Clear filters
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">
                            {groupBy === 'department' ? 'Department' : groupBy === 'employee' ? 'Employee' : 'Category'}
                          </th>
                          <th className="py-3 px-4 text-center">Claims Count</th>
                          <th className="py-3 px-4 text-right">Office (₹)</th>
                          <th className="py-3 px-4 text-right">Personal (₹)</th>
                          <th className="py-3 px-4 text-right">Total (₹)</th>
                          <th className="py-3 px-4 text-right">Share %</th>
                          <th className="py-3 px-4 w-36">Spending Distribution</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.breakdown.map((row: ExpenseReportBreakdownItem) => (
                          <tr key={row.name} className="hover:bg-slate-50/70 transition">
                            <td className="py-3 px-4 font-semibold text-slate-800">{row.name}</td>
                            <td className="py-3 px-4 text-center text-slate-600">{row.claims_count}</td>
                            <td className="py-3 px-4 text-right font-medium text-emerald-700">
                              ₹{row.office_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-right font-medium text-blue-700">
                              ₹{row.personal_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-slate-900">
                              ₹{row.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-slate-700">
                              {row.share_percentage}%
                            </td>
                            <td className="py-3 px-4">
                              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                                <div
                                  style={{ width: `${Math.min(100, row.share_percentage)}%` }}
                                  className="bg-indigo-600 h-full rounded-full"
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900">
                        <tr>
                          <td className="py-3 px-4">Total Period Spend</td>
                          <td className="py-3 px-4 text-center">{totals.total_claims}</td>
                          <td className="py-3 px-4 text-right text-emerald-700">
                            ₹{totals.office_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right text-blue-700">
                            ₹{totals.personal_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right">
                            ₹{totals.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right">100%</td>
                          <td className="py-3 px-4" />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* =========================================================================
                TAB 3: EMPLOYEE-WISE CLAIMS
               ========================================================================= */}
            {activeTab === 'employee' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Claim No.</th>
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Expense Date</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4 text-right">Amount (₹)</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Approver</th>
                      <th className="py-3 px-4">Decided On</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data?.claims || []).length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-400">
                          No employee expense claims found for this period.
                        </td>
                      </tr>
                    ) : (
                      (data?.claims || []).map((c: ExpenseReportClaimItem) => (
                        <tr key={c.claim_id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-4 font-mono font-semibold text-indigo-600 flex items-center gap-1.5">
                            {c.claim_no}
                            {c.is_self_approved && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200" title="Self-approved by submitter">
                                👤 Self-Approved
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-900">{c.employee_name}</td>
                          <td className="py-3 px-4 text-slate-600">{c.expense_date}</td>
                          <td className="py-3 px-4 text-slate-700">{c.category_name}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                /office/i.test(c.expense_type)
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {c.expense_type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900">
                            ₹{c.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                c.status === 'APPROVED'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : c.status === 'REIMBURSED'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : c.status === 'REJECTED'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {c.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">{c.approver_name}</td>
                          <td className="py-3 px-4 text-slate-500">
                            {c.decided_at ? c.decided_at.split('T')[0] : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* =========================================================================
                TAB 4: CATEGORY-WISE SUMMARY
               ========================================================================= */}
            {activeTab === 'category' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Policy Limit per Claim</th>
                      <th className="py-3 px-4 text-center">Claims Count</th>
                      <th className="py-3 px-4 text-right">Total Spent (₹)</th>
                      <th className="py-3 px-4 text-right">Average per Claim (₹)</th>
                      <th className="py-3 px-4 text-center">Claims Above Limit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {categoryOptions.map((cat: any) => {
                      const claimsForCat = (data?.claims || []).filter((c) => c.category_id === cat.category_id);
                      const catTotal = claimsForCat.reduce((acc, c) => acc + c.amount, 0);
                      const catCount = claimsForCat.length;
                      const aboveLimitCount = claimsForCat.filter((c) => c.is_above_limit).length;

                      return (
                        <tr key={cat.category_id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-4 font-semibold text-slate-800">{cat.name}</td>
                          <td className="py-3 px-4 text-slate-600">
                            {cat.limit_per_claim ? `₹${Number(cat.limit_per_claim).toLocaleString('en-IN')}` : 'No limit'}
                          </td>
                          <td className="py-3 px-4 text-center text-slate-700 font-medium">{catCount}</td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900">
                            ₹{catTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-700">
                            ₹{(catCount > 0 ? catTotal / catCount : 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {aboveLimitCount > 0 ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                ⚠ {aboveLimitCount} flagged
                              </span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* =========================================================================
                TAB 5: APPROVALS REPORT (TURNAROUND & EFFICIENCY)
               ========================================================================= */}
            {activeTab === 'approvals' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Approver</th>
                      <th className="py-3 px-4 text-center">Claims Decided</th>
                      <th className="py-3 px-4 text-center text-emerald-700">Approved</th>
                      <th className="py-3 px-4 text-center text-rose-700">Rejected</th>
                      <th className="py-3 px-4 text-center">Avg Days to Decide</th>
                      <th className="py-3 px-4 text-center text-amber-700">Waiting Now</th>
                      <th className="py-3 px-4 text-center">Oldest Waiting (Days)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(!data?.approvals_summary || data.approvals_summary.length === 0) ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          No approval turnaround data recorded for this period.
                        </td>
                      </tr>
                    ) : (
                      data.approvals_summary.map((st: ExpenseApproverPerformanceItem) => (
                        <tr key={st.approver_id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-4 font-semibold text-slate-800">{st.approver_name}</td>
                          <td className="py-3 px-4 text-center font-bold text-slate-900">{st.claims_decided}</td>
                          <td className="py-3 px-4 text-center font-semibold text-emerald-600">{st.claims_approved}</td>
                          <td className="py-3 px-4 text-center font-semibold text-rose-600">{st.claims_rejected}</td>
                          <td className="py-3 px-4 text-center font-mono font-medium text-slate-700">
                            {st.avg_days_to_decide} days
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-amber-700">
                            {st.waiting_now > 0 ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px]">
                                {st.waiting_now} pending
                              </span>
                            ) : (
                              '0'
                            )}
                          </td>
                          <td className="py-3 px-4 text-center font-medium text-slate-600">
                            {st.waiting_now > 0 ? `${st.oldest_waiting_days} days` : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* =========================================================================
                TAB 6: REJECTED CLAIMS REPORT
               ========================================================================= */}
            {activeTab === 'rejected' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Claim No.</th>
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Expense Date</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-right">Amount (₹)</th>
                      <th className="py-3 px-4">Rejection Reason</th>
                      <th className="py-3 px-4">Approver Remarks</th>
                      <th className="py-3 px-4">Approver</th>
                      <th className="py-3 px-4">Rejected Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {!(data?.claims || []).some((c) => c.status === 'REJECTED') ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-400">
                          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                          No claims were rejected during this period.
                        </td>
                      </tr>
                    ) : (
                      (data?.claims || [])
                        .filter((c) => c.status === 'REJECTED')
                        .map((c: ExpenseReportClaimItem) => (
                          <tr key={c.claim_id} className="hover:bg-slate-50 transition">
                            <td className="py-3 px-4 font-mono font-semibold text-rose-600">{c.claim_no}</td>
                            <td className="py-3 px-4 font-medium text-slate-900">{c.employee_name}</td>
                            <td className="py-3 px-4 text-slate-600">{c.expense_date}</td>
                            <td className="py-3 px-4 text-slate-700">{c.category_name}</td>
                            <td className="py-3 px-4 text-right font-bold text-slate-900">
                              ₹{c.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 font-semibold text-rose-700">{c.rejection_reason}</td>
                            <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={c.decision_remarks || ''}>
                              {c.decision_remarks || '—'}
                            </td>
                            <td className="py-3 px-4 text-slate-600">{c.approver_name}</td>
                            <td className="py-3 px-4 text-slate-500">
                              {c.decided_at ? c.decided_at.split('T')[0] : '—'}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* =========================================================================
                TAB 7: REIMBURSEMENT REPORT
               ========================================================================= */}
            {activeTab === 'reimbursement' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Claim No.</th>
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Approved On</th>
                      <th className="py-3 px-4 text-right">Amount (₹)</th>
                      <th className="py-3 px-4">Payout Method</th>
                      <th className="py-3 px-4">Payment Status</th>
                      <th className="py-3 px-4">Payment Mode</th>
                      <th className="py-3 px-4">Reference No.</th>
                      <th className="py-3 px-4">Payment Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {!(data?.claims || []).some((c) => c.status === 'APPROVED' || c.status === 'REIMBURSED') ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-400">
                          No approved reimbursement claims found in this period.
                        </td>
                      </tr>
                    ) : (
                      (data?.claims || [])
                        .filter((c) => c.status === 'APPROVED' || c.status === 'REIMBURSED')
                        .map((c: ExpenseReportClaimItem) => (
                          <tr key={c.claim_id} className="hover:bg-slate-50 transition">
                            <td className="py-3 px-4 font-mono font-semibold text-indigo-600">{c.claim_no}</td>
                            <td className="py-3 px-4 font-medium text-slate-900">{c.employee_name}</td>
                            <td className="py-3 px-4 text-slate-600">
                              {c.decided_at ? c.decided_at.split('T')[0] : '—'}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-slate-900">
                              ₹{c.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-700">
                              {c.reimbursement_method === 'PAYROLL' ? (
                                <span className="text-purple-700 font-semibold">With salary</span>
                              ) : (
                                <span className="text-emerald-700 font-semibold">Directly</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                  c.status === 'REIMBURSED'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {c.status === 'REIMBURSED' ? 'Paid' : 'Pending Payout'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-700">{c.payment_mode || '—'}</td>
                            <td className="py-3 px-4 font-mono text-slate-600">{c.payment_reference_no || '—'}</td>
                            <td className="py-3 px-4 text-slate-600">{c.payment_date || '—'}</td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
