'use strict';

/* ============================================================
   ShopFlow — المصروفات: القائمة والإضافة والتعديل والحذف
   ============================================================ */

const expensesState = { from: '', to: '', category: '', page: 1 };
let expensesCache = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (document.body.dataset.page !== 'expenses') return;

  const user = await Components.initAppPage({
    active: 'expenses',
    pageTitle: 'المصروفات',
    breadcrumb: [{ title: 'لوحة التحكم', href: 'dashboard.html' }, { title: 'المصروفات' }]
  });
  if (!user) return;

  ['expenses-from', 'expenses-to'].forEach((id) => {
    document.getElementById(id).addEventListener('change', (e) => {
      expensesState[id === 'expenses-from' ? 'from' : 'to'] = e.target.value;
      expensesState.page = 1;
      loadExpenses();
    });
  });

  document.getElementById('expenses-category').addEventListener('change', (e) => {
    expensesState.category = e.target.value;
    expensesState.page = 1;
    loadExpenses();
  });

  document.getElementById('btn-add-expense').addEventListener('click', () => openExpenseModal(null));
  document.getElementById('expenses-body').addEventListener('click', onExpenseAction);
  document.getElementById('expense-form').addEventListener('submit', submitExpenseForm);

  loadExpenses();
});

async function loadExpenses() {
  const body = document.getElementById('expenses-body');
  body.innerHTML = Components.tableSkeleton(5, 6);

  try {
    const res = await Api.get('/expenses', {
      from: expensesState.from,
      to: expensesState.to,
      category: expensesState.category,
      page: expensesState.page,
      per_page: 10
    });
    expensesCache = res.data || [];
    renderExpenses(expensesCache);
    renderExpensesSummary(res.meta && res.meta.summary);
    Components.pagination(document.getElementById('expenses-pagination'), res.meta, (p) => {
      expensesState.page = p;
      loadExpenses();
    });
  } catch (err) {
    body.innerHTML = `<tr><td colspan="5">${Components.errorState(err.message)}</td></tr>`;
  }
}

function renderExpensesSummary(summary) {
  const box = document.getElementById('expenses-summary');
  if (!summary) { box.innerHTML = ''; return; }

  box.innerHTML = [
    Components.statCard({
      icon: 'bi-wallet2', label: 'إجمالي مصروفات الفترة', value: Helpers.formatCurrency(summary.total), color: 'danger', colClass: 'col-6 col-lg-4'
    }),
    Components.statCard({
      icon: 'bi-list-ul', label: 'عدد العمليات', value: Helpers.formatNumber(summary.count), color: 'secondary', colClass: 'col-6 col-lg-4'
    }),
    Components.statCard({
      icon: 'bi-calendar-month', label: 'مصروفات هذا الشهر', value: Helpers.formatCurrency(summary.this_month), color: 'warning', colClass: 'col-12 col-lg-4'
    })
  ].join('');
}

function renderExpenses(expenses) {
  const body = document.getElementById('expenses-body');

  if (!expenses.length) {
    body.innerHTML = `<tr><td colspan="5">${Components.emptyState({
      icon: 'bi-cash-coin',
      title: 'لا توجد مصروفات',
      message: 'سجّل مصروفات المحل (إيجار، رواتب، فواتير...) لمتابعة أرباحك الحقيقية',
      actionHtml: '<button class="btn btn-primary" type="button" onclick="openExpenseModal(null)"><i class="bi bi-plus-lg me-1"></i>إضافة مصروف</button>'
    })}</td></tr>`;
    return;
  }

  body.innerHTML = expenses.map((exp) => `
    <tr>
      <td class="text-muted small">${Helpers.formatDate(exp.date)}</td>
      <td><span class="badge badge-soft-secondary">${Helpers.escapeHtml(exp.category || 'أخرى')}</span></td>
      <td class="d-none d-md-table-cell text-muted">${Helpers.escapeHtml(exp.notes || '—')}</td>
      <td class="money-out">${Helpers.formatCurrency(exp.amount)}</td>
      <td class="cell-actions">
        <button class="btn-icon text-primary" type="button" data-action="edit" data-id="${exp.id}" title="تعديل"><i class="bi bi-pencil"></i></button>
        <button class="btn-icon text-danger" type="button" data-action="delete" data-id="${exp.id}" title="حذف"><i class="bi bi-trash"></i></button>
      </td>
    </tr>`).join('');
}

function onExpenseAction(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  if (btn.dataset.action === 'edit') {
    const expense = expensesCache.find((x) => String(x.id) === String(btn.dataset.id));
    if (expense) openExpenseModal(expense);
    return;
  }

  if (btn.dataset.action === 'delete') {
    (async () => {
      const confirmed = await Components.confirm({
        title: 'حذف المصروف',
        message: 'هل أنت متأكد من حذف هذا المصروف؟',
        confirmText: 'نعم، حذف'
      });
      if (!confirmed) return;
      try {
        await Api.del(`/expenses/${btn.dataset.id}`);
        Components.toast('تم حذف المصروف بنجاح', 'success');
        loadExpenses();
      } catch (err) {
        Components.toast(err.message || 'تعذر حذف المصروف', 'error');
      }
    })();
  }
}

function openExpenseModal(expense) {
  document.getElementById('expense-id').value = expense ? expense.id : '';
  document.getElementById('expense-date').value = expense ? String(expense.date).slice(0, 10) : Helpers.toDateInput();
  document.getElementById('expense-category').value = expense ? expense.category : '';
  document.getElementById('expense-amount').value = expense ? expense.amount : '';
  document.getElementById('expense-notes').value = expense ? (expense.notes || '') : '';
  document.getElementById('expense-modal-title').innerHTML = expense
    ? '<i class="bi bi-pencil-square me-1 text-primary"></i>تعديل المصروف'
    : '<i class="bi bi-cash-coin me-1 text-primary"></i>إضافة مصروف';
  ['expense-date', 'expense-category', 'expense-amount'].forEach((id) =>
    Helpers.setFieldError(document.getElementById(id), null));
  bootstrap.Modal.getOrCreateInstance(document.getElementById('expense-modal')).show();
}

async function submitExpenseForm(e) {
  e.preventDefault();
  const { valid, data } = Helpers.validateForm(e.target);
  if (!valid) return;

  const id = document.getElementById('expense-id').value;
  const saveBtn = document.getElementById('expense-save-btn');
  setBtnLoading(saveBtn, true, 'جارٍ الحفظ...');

  const payload = {
    date: data.date,
    category: data.category,
    amount: Number(data.amount),
    notes: document.getElementById('expense-notes').value.trim()
  };

  try {
    if (id) {
      await Api.put(`/expenses/${id}`, payload);
      Components.toast('تم تحديث المصروف بنجاح', 'success');
    } else {
      await Api.post('/expenses', payload);
      Components.toast('تم إضافة المصروف بنجاح', 'success');
    }
    bootstrap.Modal.getOrCreateInstance(document.getElementById('expense-modal')).hide();
    loadExpenses();
  } catch (err) {
    Components.toast(err.message || 'تعذر حفظ المصروف', 'error');
  } finally {
    setBtnLoading(saveBtn, false);
  }
}

window.openExpenseModal = openExpenseModal;
