/**
 * ============================================
 * EXPENSE TRACKER DASHBOARD - JAVASCRIPT
 * Fully Functional with LocalStorage & Charts
 * ============================================
 */

// ============================================
// GLOBAL STATE
// ============================================

// Transactions array - main data store
let transactions = [];

// Chart instances
let expensePieChart = null;
let incomeExpenseBarChart = null;

// DOM Elements
const elements = {
    // Summary cards
    totalIncome: document.getElementById('totalIncome'),
    totalExpenses: document.getElementById('totalExpenses'),
    balance: document.getElementById('balance'),
    balanceTrend: document.getElementById('balanceTrend'),
    
    // Transaction list
    transactionList: document.getElementById('transactionList'),
    emptyState: document.getElementById('emptyState'),
    
    // Filters
    searchInput: document.getElementById('searchInput'),
    categoryFilter: document.getElementById('categoryFilter'),
    monthFilter: document.getElementById('monthFilter'),
    chartMonthFilter: document.getElementById('chartMonthFilter'),
    
    // Modal
    transactionModal: document.getElementById('transactionModal'),
    transactionForm: document.getElementById('transactionForm'),
    modalClose: document.getElementById('modalClose'),
    cancelBtn: document.getElementById('cancelBtn'),
    addTransactionBtn: document.getElementById('addTransactionBtn'),
    
    // Form elements
    transactionType: document.getElementById('transactionType'),
    description: document.getElementById('description'),
    amount: document.getElementById('amount'),
    category: document.getElementById('category'),
    date: document.getElementById('date'),
    typeBtns: document.querySelectorAll('.type-btn'),
    
    // Theme
    themeToggle: document.getElementById('themeToggle'),
    sidebarToggle: document.getElementById('sidebarToggle'),
    sidebar: document.getElementById('sidebar'),
    
    // Export
    exportBtn: document.getElementById('exportBtn'),
    
    // Date display
    currentDate: document.getElementById('currentDate'),
    
    // Toast
    toastContainer: document.getElementById('toastContainer')
};

// Category colors for charts
const categoryColors = {
    Food: '#f59e0b',
    Travel: '#3b82f6',
    Bills: '#ef4444',
    Salary: '#10b981',
    Shopping: '#8b5cf6',
    Other: '#64748b'
};

// Category icons
const categoryIcons = {
    Food: 'fa-utensils',
    Travel: 'fa-plane',
    Bills: 'fa-file-invoice-dollar',
    Salary: 'fa-money-bill-wave',
    Shopping: 'fa-shopping-bag',
    Other: 'fa-ellipsis-h'
};

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize the application
 */
function init() {
    // Load data from LocalStorage
    loadFromLocalStorage();
    
    // Set current date in header
    updateCurrentDate();
    
    // Set today's date in form
    elements.date.valueAsDate = new Date();
    
    // Load theme preference
    loadThemePreference();
    
    // Initialize charts
    initCharts();
    
    // Update UI
    updateUI();
    
    // Bind events
    bindEvents();
    
    // Show welcome toast
    showToast('Welcome back!', 'Your finances are ready to track.', 'info');
}

/**
 * Bind all event listeners
 */
function bindEvents() {
    // Modal events
    elements.addTransactionBtn.addEventListener('click', openModal);
    elements.modalClose.addEventListener('click', closeModal);
    elements.cancelBtn.addEventListener('click', closeModal);
    elements.transactionModal.querySelector('.modal-overlay').addEventListener('click', closeModal);
    
    // Form submission
    elements.transactionForm.addEventListener('submit', handleFormSubmit);
    
    // Type toggle buttons
    elements.typeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.typeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            elements.transactionType.value = btn.dataset.type;
        });
    });
    
    // Filter events
    elements.searchInput.addEventListener('input', debounce(updateUI, 300));
    elements.categoryFilter.addEventListener('change', updateUI);
    elements.monthFilter.addEventListener('change', updateUI);
    elements.chartMonthFilter.addEventListener('change', updateCharts);
    
    // Theme toggle
    elements.themeToggle.addEventListener('click', toggleTheme);
    
    // Sidebar toggle
    elements.sidebarToggle.addEventListener('click', toggleSidebar);
    
    // Export button
    elements.exportBtn.addEventListener('click', exportToCSV);
    
    // Transaction list - Event delegation for delete buttons
    elements.transactionList.addEventListener('click', handleTransactionActions);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Window resize for responsive charts
    window.addEventListener('resize', debounce(() => {
        if (expensePieChart) expensePieChart.resize();
        if (incomeExpenseBarChart) incomeExpenseBarChart.resize();
    }, 250));
}

// ============================================
// DATA MANAGEMENT
// ============================================

/**
 * Load transactions from LocalStorage
 */
function loadFromLocalStorage() {
    try {
        const stored = localStorage.getItem('expenseTracker_transactions');
        if (stored) {
            transactions = JSON.parse(stored);
        }
    } catch (error) {
        console.error('Error loading from LocalStorage:', error);
        transactions = [];
    }
}

/**
 * Save transactions to LocalStorage
 */
function saveToLocalStorage() {
    try {
        localStorage.setItem('expenseTracker_transactions', JSON.stringify(transactions));
    } catch (error) {
        console.error('Error saving to LocalStorage:', error);
        showToast('Error', 'Failed to save data', 'error');
    }
}

/**
 * Add a new transaction
 */
function addTransaction(transaction) {
    transactions.unshift(transaction);
    saveToLocalStorage();
    updateUI();
    showToast('Success', 'Transaction added successfully', 'success');
}

/**
 * Delete a transaction by ID
 */
function deleteTransaction(id) {
    const index = transactions.findIndex(t => t.id === id);
    if (index !== -1) {
        const transaction = transactions[index];
        transactions.splice(index, 1);
        saveToLocalStorage();
        updateUI();
        showToast('Deleted', `${transaction.description} has been removed`, 'info');
    }
}

/**
 * Generate unique ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ============================================
// FORM HANDLING
// ============================================

/**
 * Handle form submission
 */
function handleFormSubmit(e) {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
        return;
    }
    
    // Create transaction object
    const transaction = {
        id: generateId(),
        description: elements.description.value.trim(),
        amount: parseFloat(elements.amount.value),
        type: elements.transactionType.value,
        category: elements.category.value,
        date: elements.date.value
    };
    
    // Add transaction
    addTransaction(transaction);
    
    // Close modal and reset form
    closeModal();
    resetForm();
}

/**
 * Validate form inputs
 */
function validateForm() {
    let isValid = true;
    
    // Clear previous errors
    clearErrors();
    
    // Validate description
    if (!elements.description.value.trim()) {
        showError('descriptionError', 'Description is required');
        isValid = false;
    }
    
    // Validate amount
    const amount = parseFloat(elements.amount.value);
    if (isNaN(amount) || amount <= 0) {
        showError('amountError', 'Please enter a valid positive amount');
        isValid = false;
    }
    
    // Validate category
    if (!elements.category.value) {
        showError('categoryError', 'Please select a category');
        isValid = false;
    }
    
    // Validate date
    if (!elements.date.value) {
        showError('dateError', 'Please select a date');
        isValid = false;
    }
    
    return isValid;
}

/**
 * Show error message
 */
function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
    }
}

/**
 * Clear all error messages
 */
function clearErrors() {
    document.querySelectorAll('.error-message').forEach(el => {
        el.textContent = '';
    });
}

/**
 * Reset form to default state
 */
function resetForm() {
    elements.transactionForm.reset();
    elements.date.valueAsDate = new Date();
    elements.typeBtns.forEach(btn => btn.classList.remove('active'));
    elements.typeBtns[0].classList.add('active');
    elements.transactionType.value = 'income';
    clearErrors();
}

/**
 * Open modal
 */
function openModal() {
    elements.transactionModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    elements.description.focus();
}

/**
 * Close modal
 */
function closeModal() {
    elements.transactionModal.classList.remove('active');
    document.body.style.overflow = '';
}

// ============================================
// UI UPDATES
// ============================================

/**
 * Update entire UI
 */
function updateUI() {
    const filteredTransactions = getFilteredTransactions();
    
    renderTransactionList(filteredTransactions);
    calculateSummary(filteredTransactions);
    updateCharts();
}

/**
 * Get filtered transactions based on search, category, and month
 */
function getFilteredTransactions() {
    const searchTerm = elements.searchInput.value.toLowerCase();
    const categoryFilter = elements.categoryFilter.value;
    const monthFilter = elements.monthFilter.value;
    
    return transactions.filter(transaction => {
        // Search filter
        const matchesSearch = transaction.description.toLowerCase().includes(searchTerm) ||
                             transaction.category.toLowerCase().includes(searchTerm);
        
        // Category filter
        const matchesCategory = categoryFilter === 'all' || transaction.category === categoryFilter;
        
        // Month filter
        const transactionMonth = new Date(transaction.date).getMonth().toString();
        const matchesMonth = monthFilter === 'all' || transactionMonth === monthFilter;
        
        return matchesSearch && matchesCategory && matchesMonth;
    });
}

/**
 * Render transaction list
 */
function renderTransactionList(transactionsToRender) {
    if (transactionsToRender.length === 0) {
        elements.transactionList.innerHTML = '';
        elements.emptyState.style.display = 'flex';
        return;
    }
    
    elements.emptyState.style.display = 'none';
    
    elements.transactionList.innerHTML = transactionsToRender.map(transaction => {
        const date = new Date(transaction.date);
        const formattedDate = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        
        const amountClass = transaction.type === 'income' ? 'income' : 'expense';
        const amountPrefix = transaction.type === 'income' ? '+' : '-';
        const iconClass = categoryIcons[transaction.category] || 'fa-tag';
        
        return `
            <tr data-id="${transaction.id}">
                <td>${formattedDate}</td>
                <td>
                    <div class="transaction-description">
                        <strong>${escapeHtml(transaction.description)}</strong>
                    </div>
                </td>
                <td>
                    <span class="category-badge ${transaction.category.toLowerCase()}">
                        <i class="fas ${iconClass}"></i>
                        ${transaction.category}
                    </span>
                </td>
                <td>
                    <span class="type-badge ${transaction.type}">
                        <i class="fas fa-${transaction.type === 'income' ? 'arrow-up' : 'arrow-down'}"></i>
                        ${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                    </span>
                </td>
                <td class="amount-cell ${amountClass}">
                    ${amountPrefix}$${formatNumber(transaction.amount)}
                </td>
                <td>
                    <button class="delete-btn" data-action="delete" data-id="${transaction.id}" title="Delete">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Calculate and display summary
 */
function calculateSummary(transactionsToCalculate = transactions) {
    const summary = transactionsToCalculate.reduce((acc, transaction) => {
        if (transaction.type === 'income') {
            acc.income += transaction.amount;
        } else {
            acc.expense += transaction.amount;
        }
        return acc;
    }, { income: 0, expense: 0 });
    
    const balance = summary.income - summary.expense;
    
    // Animate number changes
    animateNumber(elements.totalIncome, summary.income, '$');
    animateNumber(elements.totalExpenses, summary.expense, '$');
    animateNumber(elements.balance, balance, '$');
    
    // Update balance trend
    updateBalanceTrend(balance, summary.income);
}

/**
 * Update balance trend indicator
 */
function updateBalanceTrend(balance, totalIncome) {
    const trend = elements.balanceTrend;
    
    if (balance > 0) {
        trend.innerHTML = '<i class="fas fa-arrow-up"></i> Positive Balance';
        trend.className = 'trend positive';
    } else if (balance < 0) {
        trend.innerHTML = '<i class="fas fa-arrow-down"></i> Negative Balance';
        trend.className = 'trend negative';
    } else {
        trend.innerHTML = '<i class="fas fa-balance-scale"></i> Balanced';
        trend.className = 'trend';
    }
}

/**
 * Animate number counter
 */
function animateNumber(element, targetValue, prefix = '') {
    const startValue = parseFloat(element.textContent.replace(/[^0-9.-]/g, '')) || 0;
    const duration = 500;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        
        const currentValue = startValue + (targetValue - startValue) * easeOutQuart;
        element.textContent = prefix + formatNumber(currentValue);
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

// ============================================
// CHARTS
// ============================================

/**
 * Initialize Chart.js charts
 */
function initCharts() {
    // Expense Pie Chart
    const pieCtx = document.getElementById('expensePieChart').getContext('2d');
    expensePieChart = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: Object.values(categoryColors),
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: {
                            family: 'Inter',
                            size: 11
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: $${formatNumber(value)} (${percentage}%)`;
                        }
                    }
                }
            },
            cutout: '65%'
        }
    });
    
    // Income vs Expense Bar Chart
    const barCtx = document.getElementById('incomeExpenseBarChart').getContext('2d');
    incomeExpenseBarChart = new Chart(barCtx, {
        type: 'bar',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [
                {
                    label: 'Income',
                    data: new Array(12).fill(0),
                    backgroundColor: '#10b981',
                    borderRadius: 6,
                    borderSkipped: false
                },
                {
                    label: 'Expenses',
                    data: new Array(12).fill(0),
                    backgroundColor: '#ef4444',
                    borderRadius: 6,
                    borderSkipped: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: {
                            family: 'Inter',
                            size: 11
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: $${formatNumber(context.parsed.y)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            family: 'Inter',
                            size: 10
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        callback: function(value) {
                            return '$' + value;
                        },
                        font: {
                            family: 'Inter',
                            size: 10
                        }
                    }
                }
            }
        }
    });
}

/**
 * Update charts with current data
 */
function updateCharts() {
    const chartMonthFilter = elements.chartMonthFilter.value;
    
    // Filter transactions for charts
    let chartTransactions = transactions;
    if (chartMonthFilter !== 'all') {
        chartTransactions = transactions.filter(t => {
            return new Date(t.date).getMonth().toString() === chartMonthFilter;
        });
    }
    
    // Update Pie Chart - Expense breakdown by category
    updatePieChart(chartTransactions);
    
    // Update Bar Chart - Monthly comparison
    updateBarChart(transactions);
}

/**
 * Update expense pie chart
 */
function updatePieChart(transactionsToChart) {
    // Calculate expenses by category
    const expensesByCategory = transactionsToChart
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount;
            return acc;
        }, {});
    
    const categories = Object.keys(expensesByCategory);
    const amounts = Object.values(expensesByCategory);
    
    // Update chart data
    expensePieChart.data.labels = categories;
    expensePieChart.data.datasets[0].data = amounts;
    expensePieChart.data.datasets[0].backgroundColor = categories.map(cat => categoryColors[cat] || '#64748b');
    
    expensePieChart.update('none'); // Update without animation for better performance
}

/**
 * Update income vs expense bar chart
 */
function updateBarChart(transactionsToChart) {
    // Initialize monthly data arrays
    const monthlyIncome = new Array(12).fill(0);
    const monthlyExpense = new Array(12).fill(0);
    
    // Aggregate data by month
    transactionsToChart.forEach(t => {
        const month = new Date(t.date).getMonth();
        if (t.type === 'income') {
            monthlyIncome[month] += t.amount;
        } else {
            monthlyExpense[month] += t.amount;
        }
    });
    
    // Update chart data
    incomeExpenseBarChart.data.datasets[0].data = monthlyIncome;
    incomeExpenseBarChart.data.datasets[1].data = monthlyExpense;
    
    incomeExpenseBarChart.update('none');
}

// ============================================
// EVENT HANDLERS
// ============================================

/**
 * Handle transaction list actions (delete)
 */
function handleTransactionActions(e) {
    const deleteBtn = e.target.closest('[data-action="delete"]');
    if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        const transaction = transactions.find(t => t.id === id);
        
        if (transaction && confirm(`Are you sure you want to delete "${transaction.description}"?`)) {
            deleteTransaction(id);
        }
    }
}

/**
 * Handle keyboard shortcuts
 */
function handleKeyboardShortcuts(e) {
    // ESC to close modal
    if (e.key === 'Escape' && elements.transactionModal.classList.contains('active')) {
        closeModal();
    }
    
    // Ctrl/Cmd + N to open modal
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        openModal();
    }
}

// ============================================
// THEME & UI UTILITIES
// ============================================

/**
 * Toggle dark/light theme
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('expenseTracker_theme', newTheme);
    
    // Update icon
    const icon = elements.themeToggle.querySelector('i');
    const text = elements.themeToggle.querySelector('span');
    
    if (newTheme === 'dark') {
        icon.className = 'fas fa-sun';
        text.textContent = 'Light Mode';
    } else {
        icon.className = 'fas fa-moon';
        text.textContent = 'Dark Mode';
    }
    
    // Update charts for new theme
    updateChartTheme(newTheme);
}

/**
 * Load theme preference from LocalStorage
 */
function loadThemePreference() {
    const savedTheme = localStorage.getItem('expenseTracker_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    
    document.documentElement.setAttribute('data-theme', theme);
    
    // Update toggle button
    const icon = elements.themeToggle.querySelector('i');
    const text = elements.themeToggle.querySelector('span');
    
    if (theme === 'dark') {
        icon.className = 'fas fa-sun';
        text.textContent = 'Light Mode';
    }
}

/**
 * Update chart colors based on theme
 */
function updateChartTheme(theme) {
    const textColor = theme === 'dark' ? '#cbd5e1' : '#64748b';
    const gridColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    
    // Update bar chart
    incomeExpenseBarChart.options.scales.x.ticks.color = textColor;
    incomeExpenseBarChart.options.scales.y.ticks.color = textColor;
    incomeExpenseBarChart.options.scales.y.grid.color = gridColor;
    incomeExpenseBarChart.update('none');
}

/**
 * Toggle sidebar (mobile)
 */
function toggleSidebar() {
    elements.sidebar.classList.toggle('mobile-open');
}

/**
 * Update current date display
 */
function updateCurrentDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    elements.currentDate.textContent = new Date().toLocaleDateString('en-US', options);
}

// ============================================
// EXPORT FUNCTIONALITY
// ============================================

/**
 * Export transactions to CSV
 */
function exportToCSV() {
    if (transactions.length === 0) {
        showToast('Info', 'No transactions to export', 'info');
        return;
    }
    
    // CSV Header
    const csvHeader = ['ID', 'Date', 'Description', 'Category', 'Type', 'Amount'];
    
    // CSV Rows
    const csvRows = transactions.map(t => [
        t.id,
        t.date,
        `"${t.description.replace(/"/g, '""')}"`,
        t.category,
        t.type,
        t.amount.toFixed(2)
    ]);
    
    // Combine
    const csvContent = [csvHeader, ...csvRows]
        .map(row => row.join(','))
        .join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `expenses_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Success', 'Transactions exported to CSV', 'success');
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================

/**
 * Show toast notification
 */
function showToast(title, message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const iconMap = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `
        <i class="fas ${iconMap[type]}"></i>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format number with commas and 2 decimal places
 */
function formatNumber(num) {
    return num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Debounce function for performance
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ============================================
// INITIALIZE APP
// ============================================

// Start the application when DOM is ready
document.addEventListener('DOMContentLoaded', init);

// Add CSS animation for toast fade out
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from { opacity: 1; transform: translateX(0); }
        to { opacity: 0; transform: translateX(100%); }
    }
`;
document.head.appendChild(style);
