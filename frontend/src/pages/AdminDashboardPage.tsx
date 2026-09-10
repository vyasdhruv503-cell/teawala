import React, { useEffect, useState } from 'react';
import type { AuthUser, Product, Category, TableInfo, OrderRecord, CafeInfo } from '../types';
import { api } from '../services/api';
import { Sidebar } from '../components/admin/Sidebar';
import { AdminHeader } from '../components/admin/AdminHeader';
import { StatCard } from '../components/admin/StatCard';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { StatusBadge } from '../components/common/StatusBadge';
import { QRPreviewModal } from '../components/admin/QRPreviewModal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import {
  DollarSign,
  ShoppingBag,
  Clock,
  UtensilsCrossed,
  QrCode,
  Plus,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Search,
  Calendar,
  History,
  IdCard,
  Download,
  FileSpreadsheet,
  X,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import * as XLSX from 'xlsx';

// Helper to format date and time like "Aug 15, 2026 08:04 PM" matching the user's Excel template
const formatDateTime = (isoStr: string) => {
  try {
    const d = new Date(isoStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const day = d.getDate().toString().padStart(2, '0');
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hourStr = hours.toString().padStart(2, '0');
    return `${month} ${day}, ${year} ${hourStr}:${minutes} ${ampm}`;
  } catch {
    return isoStr;
  }
};

interface AdminDashboardPageProps {
  user: AuthUser;
  onLogout: () => void;
  onNavigateToKitchen: () => void;
  onNavigateToMenu?: () => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  user,
  onLogout,
  onNavigateToKitchen,
  onNavigateToMenu,
}) => {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);

  // Management State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [staff, setStaff] = useState<AuthUser[]>([]);
  const [settings, setSettings] = useState<CafeInfo | null>(null);

  // Filters & Search
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderDateFilter, setOrderDateFilter] = useState('');
  const [orderRangeFilter, setOrderRangeFilter] = useState('30days'); // Default to 1 Month History

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState(4);

  const [selectedQRTable, setSelectedQRTable] = useState<TableInfo | null>(null);

  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);

  // Confirmation Delete Dialog
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'product' | 'category' | 'staff' | 'order';
    id: string;
    name: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Download Order History Excel (.xlsx) Handler matching exact schema from user screenshot
  const handleDownloadHistoryExcel = () => {
    if (orders.length === 0) {
      alert('No orders available to download for the selected filters.');
      return;
    }

    const excelData = orders.map((o) => {
      const itemsStr = o.items
        ? o.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')
        : 'No items';

      return {
        'Order #': `#${o.orderNumber}`,
        'Date & Time': formatDateTime(o.createdAt),
        'Table': o.tableNumber || 'Table 01',
        'Customer': o.customerName || 'Guest Customer',
        'Items': itemsStr,
        'Total (₹)': `₹${Number(o.total || 0).toFixed(2)}`,
        'Status': o.orderStatus || 'COMPLETED',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set custom column widths for clean spreadsheet layout
    worksheet['!cols'] = [
      { wch: 10 }, // Order #
      { wch: 24 }, // Date & Time
      { wch: 14 }, // Table
      { wch: 18 }, // Customer
      { wch: 45 }, // Items
      { wch: 14 }, // Total (₹)
      { wch: 14 }, // Status
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Order History');

    const dateLabel = orderDateFilter ? orderDateFilter : orderRangeFilter || 'all-dates';
    XLSX.writeFile(workbook, `CafeQR_Order_History_${dateLabel}.xlsx`);
  };

  // Download Order History CSV Handler
  const handleDownloadHistoryCSV = () => {
    if (orders.length === 0) {
      alert('No orders available to download for the selected filters.');
      return;
    }

    const headers = [
      'Order #',
      'Date & Time',
      'Table',
      'Customer',
      'Items',
      'Total (₹)',
      'Status',
    ];

    const csvRows = orders.map((o) => {
      const itemsStr = o.items
        ? o.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')
        : '';

      return [
        `"#${o.orderNumber}"`,
        `"${formatDateTime(o.createdAt)}"`,
        `"${o.tableNumber || 'Table 01'}"`,
        `"${(o.customerName || 'Guest Customer').replace(/"/g, '""')}"`,
        `"${itemsStr.replace(/"/g, '""')}"`,
        `"₹${Number(o.total || 0).toFixed(2)}"`,
        `"${o.orderStatus || 'COMPLETED'}"`,
      ].join(',');
    });

    const csvString = [headers.join(','), ...csvRows].join('\r\n');
    // Prepend UTF-8 BOM (\uFEFF) so Excel and all spreadsheet software display special characters, Hindi, and columns properly
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateLabel = orderDateFilter ? orderDateFilter : orderRangeFilter || 'all-dates';
    link.setAttribute('download', `CafeQR_Order_History_${dateLabel}.csv`);
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  };

  // Load tab data dynamically
  const loadTabData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      if (currentTab === 'dashboard') {
        const res = await api.getDashboard();
        setDashboardData(res);
      } else if (currentTab === 'products') {
        const [prodRes, catRes] = await Promise.all([
          api.getAdminProducts(),
          api.getAdminCategories(),
        ]);
        setProducts(prodRes);
        setCategories(catRes);
      } else if (currentTab === 'categories') {
        const res = await api.getAdminCategories();
        setCategories(res);
      } else if (currentTab === 'tables') {
        const [tblRes, cafeRes] = await Promise.all([api.getAdminTables(), api.getSettings()]);
        setTables(tblRes);
        setSettings(cafeRes);
      } else if (currentTab === 'orders' || currentTab === 'history') {
        const res = await api.getAdminOrders(
          orderStatusFilter,
          orderSearchQuery,
          orderDateFilter,
          undefined,
          undefined,
          orderDateFilter ? undefined : orderRangeFilter
        );
        setOrders(res);
      } else if (currentTab === 'staff') {
        const res = await api.getStaff();
        setStaff(Array.isArray(res) ? res : []);
      } else if (currentTab === 'settings') {
        const res = await api.getSettings();
        setSettings(res);
      }
    } catch (err: any) {
      console.error('Error loading tab data:', err);
      setLoadError(err?.message || 'Could not connect to the server. Please make sure the backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentTab === 'kitchen') {
      onNavigateToKitchen();
    } else {
      loadTabData();
    }
  }, [currentTab, orderStatusFilter, orderSearchQuery, orderDateFilter, orderRangeFilter]);

  // Product Form Handler
  const handleSaveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      categoryId: formData.get('categoryId') as string,
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      price: parseFloat(formData.get('price') as string),
      image: formData.get('image') as string,
      isAvailable: formData.get('isAvailable') === 'on',
      isFeatured: formData.get('isFeatured') === 'on',
      isVeg: formData.get('isVeg') === 'on',
      preparationTime: parseInt(formData.get('preparationTime') as string) || 15,
    };

    if (editingProduct) {
      await api.updateProduct(editingProduct.id, data);
    } else {
      await api.createProduct(data);
    }

    setIsProductModalOpen(false);
    setEditingProduct(null);
    loadTabData();
  };

  // Category Form Handler
  const handleSaveCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      image: formData.get('image') as string,
      sortOrder: parseInt(formData.get('sortOrder') as string) || 0,
      isActive: formData.get('isActive') === 'on',
    };

    if (editingCategory) {
      await api.updateCategory(editingCategory.id, data);
    } else {
      await api.createCategory(data);
    }

    setIsCategoryModalOpen(false);
    setEditingCategory(null);
    loadTabData();
  };

  // Table Form Handler
  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableNumber) return;
    await api.createTable(newTableNumber, newTableCapacity);
    setIsTableModalOpen(false);
    setNewTableNumber('');
    loadTabData();
  };

  // Staff Form Handler
  const handleCreateStaff = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await api.createStaff({
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      role: formData.get('role') as string,
    });
    setIsStaffModalOpen(false);
    loadTabData();
  };

  // Settings Save
  const handleSaveSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await api.updateSettings({
      name: formData.get('name') as string,
      logo: formData.get('logo') as string,
      address: formData.get('address') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      taxRate: parseFloat(formData.get('taxRate') as string),
      currency: formData.get('currency') as string,
    });
    loadTabData();
  };

  // Confirm Delete Handler
  const handleExecuteDelete = async () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'product') {
      await api.deleteProduct(deleteConfirm.id);
    } else if (deleteConfirm.type === 'category') {
      await api.deleteCategory(deleteConfirm.id);
    } else if (deleteConfirm.type === 'staff') {
      await api.deleteStaff(deleteConfirm.id);
    } else if (deleteConfirm.type === 'order') {
      await api.deleteAdminOrder(deleteConfirm.id);
    }
    setDeleteConfirm(null);
    loadTabData();
  };

  return (
    <div className="flex min-h-screen bg-[#FAF7F2] text-[#1C130E] font-sans">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        user={user}
        onLogout={onLogout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader
          title={
            currentTab.charAt(0).toUpperCase() + currentTab.slice(1).replace('-', ' ') + (isLoading ? ' (Syncing...)' : '')
          }
          user={user}
          onNavigateToKitchen={onNavigateToKitchen}
          onNavigateToMenu={onNavigateToMenu}
          onOpenSidebar={() => setIsSidebarOpen(true)}
        />

        <main className="p-4 sm:p-6 lg:p-8 flex-1 overflow-y-auto">
          {/* Error Banner */}
          {loadError && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
              <div className="w-8 h-8 bg-rose-100 text-rose-700 rounded-xl flex items-center justify-center shrink-0 font-black text-sm">!</div>
              <div>
                <p className="text-sm font-bold text-rose-900">Backend Connection Error</p>
                <p className="text-xs text-rose-700 mt-0.5">{loadError}</p>
              </div>
              <button onClick={loadTabData} className="ml-auto text-xs font-bold text-rose-700 hover:text-rose-900 underline shrink-0">Retry</button>
            </div>
          )}

          {/* TAB 1: DASHBOARD */}
          {currentTab === 'dashboard' && (
            isLoading && !dashboardData ? (
              <div className="flex flex-col items-center justify-center p-12 text-stone-500 font-semibold text-sm">
                <div className="w-8 h-8 border-4 border-[#10B981] border-t-transparent rounded-full animate-spin mb-3" />
                Loading dashboard metrics...
              </div>
            ) : dashboardData ? (
              <div className="space-y-8">
                {/* Stat Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    title="Today's Revenue"
                    value={`₹${Number(dashboardData.metrics?.todaySales || 0).toFixed(2)}`}
                    subtitle={`${dashboardData.metrics?.todayOrders || 0} orders today`}
                    icon={DollarSign}
                    color="emerald"
                  />
                  <StatCard
                    title="Active Orders"
                    value={
                      (dashboardData.metrics?.pendingOrders || 0) +
                      (dashboardData.metrics?.preparingOrders || 0)
                    }
                    subtitle={`${dashboardData.metrics?.pendingOrders || 0} pending kitchen approval`}
                    icon={Clock}
                    color="amber"
                  />
                  <StatCard
                    title="Completed Orders"
                    value={dashboardData.metrics?.completedOrders || 0}
                    subtitle={`Out of ${dashboardData.metrics?.totalOrders || 0} total orders`}
                    icon={ShoppingBag}
                    color="indigo"
                  />
                  <StatCard
                    title="Menu Products"
                    value={dashboardData.metrics?.totalProducts || 0}
                    subtitle={`${dashboardData.metrics?.totalTables || 0} active QR tables`}
                    icon={UtensilsCrossed}
                    color="blue"
                  />
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* 7-Day Revenue Trend (Recharts) */}
                  <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-[#E2DCD5] shadow-xs">
                    <h3 className="text-base font-black text-[#1C130E] mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-[#10B981] rounded-full inline-block" />
                      7-Day Revenue Overview
                    </h3>
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dashboardData.salesTrend || []}>
                          <defs>
                            <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2DCD5" />
                          <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                          <YAxis stroke="#64748b" fontSize={12} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#FFFFFF',
                              borderColor: '#E2DCD5',
                              borderRadius: '16px',
                              color: '#1C130E',
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="sales"
                            stroke="#10B981"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#salesGrad)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Top Selling Products */}
                  <div className="bg-white rounded-3xl p-6 border border-[#E2DCD5] shadow-xs">
                    <h3 className="text-base font-black text-[#1C130E] mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-[#10B981] rounded-full inline-block" />
                      Top Selling Products
                    </h3>
                    <div className="space-y-3">
                      {dashboardData.popularProducts && dashboardData.popularProducts.length > 0 ? (
                        dashboardData.popularProducts.map((item: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-3.5 bg-[#FAF7F2] rounded-2xl border border-[#E2DCD5]"
                          >
                            <div>
                              <p className="text-xs font-extrabold text-stone-900">{item.name}</p>
                              <p className="text-[11px] text-stone-500 font-medium">{item.quantity} sold</p>
                            </div>
                            <span className="text-xs font-black text-[#10B981]">
                              ₹{Number(item.revenue || 0).toFixed(2)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-stone-400 italic py-6 text-center">No orders recorded yet today</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : null
          )}

          {/* TAB 2: PRODUCTS */}
          {currentTab === 'products' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-black text-[#1C130E] flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-[#10B981] rounded-full inline-block" />
                  Menu Products List
                </h2>
                <Button
                  variant="primary"
                  onClick={() => {
                    setEditingProduct(null);
                    setIsProductModalOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-1.5 font-black" />
                  <span className="hidden sm:inline">Add New Product</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </div>

              <div className="bg-white rounded-3xl border border-[#E2DCD5] shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-700 min-w-[640px]">
                  <thead className="bg-[#FAF7F2] border-b border-[#E2DCD5] uppercase font-extrabold text-stone-600">
                    <tr>
                      <th className="p-4">Item</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Price</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2DCD5] font-medium">
                    {products.map((p) => (
                      <tr key={p.id} className="hover:bg-[#FAF7F2] transition-colors">
                        <td className="p-4 flex items-center gap-3">
                          {p.image && (
                            <img
                              src={p.image}
                              alt={p.name}
                              className="w-10 h-10 rounded-xl object-cover shrink-0 border border-[#E2DCD5]"
                            />
                          )}
                          <div>
                            <p className="font-extrabold text-stone-900">{p.name}</p>
                            {p.isFeatured && (
                              <span className="text-[10px] text-amber-700 font-extrabold">
                                ★ Featured Special
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 font-bold text-stone-700 whitespace-nowrap">
                          {p.categoryName || 'Unassigned'}
                        </td>
                        <td className="p-4 font-black text-[#10B981] whitespace-nowrap">₹{p.price.toFixed(2)}</td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${p.isVeg ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-rose-100 text-rose-900 border-rose-300'
                              }`}
                          >
                            {p.isVeg ? 'VEG' : 'NON-VEG'}
                          </span>
                        </td>
                        <td className="p-4">
                          <button
                            onClick={async () => {
                              await api.toggleProduct(p.id);
                              loadTabData();
                            }}
                            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap border ${p.isAvailable
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-[#FAF7F2] text-stone-500 border-[#E2DCD5]'
                              }`}
                          >
                            {p.isAvailable ? <ToggleRight className="w-4 h-4 text-emerald-600" /> : <ToggleLeft className="w-4 h-4" />}
                            {p.isAvailable ? 'Available' : 'Disabled'}
                          </button>
                        </td>
                        <td className="p-4 text-right space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => {
                              setEditingProduct(p);
                              setIsProductModalOpen(true);
                            }}
                            className="p-1.5 hover:bg-[#F5EFE6] text-stone-600 hover:text-stone-900 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteConfirm({ type: 'product', id: p.id, name: p.name })
                            }
                            className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CATEGORIES */}
          {currentTab === 'categories' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-black text-[#1C130E] flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-[#10B981] rounded-full inline-block" />
                  Menu Categories
                </h2>
                <Button
                  variant="primary"
                  onClick={() => {
                    setEditingCategory(null);
                    setIsCategoryModalOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-1.5 font-black" />
                  <span className="hidden sm:inline">Add Category</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((c) => (
                  <div
                    key={c.id}
                    className="bg-white rounded-3xl p-5 border border-[#E2DCD5] shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      {c.image && (
                        <img
                          src={c.image}
                          alt={c.name}
                          className="w-full h-32 rounded-2xl object-cover mb-4 border border-[#E2DCD5]"
                        />
                      )}
                      <h3 className="text-base font-black text-stone-900">{c.name}</h3>
                      <p className="text-xs text-stone-500 mt-1 line-clamp-2">{c.description}</p>
                      <p className="text-xs font-black text-[#10B981] mt-3">
                        {c.productCount || 0} Products
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#E2DCD5]">
                      <span className="text-xs font-bold text-stone-500">Order: #{c.sortOrder}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingCategory(c);
                            setIsCategoryModalOpen(true);
                          }}
                          className="p-1.5 hover:bg-[#F5EFE6] text-stone-600 hover:text-stone-900 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteConfirm({ type: 'category', id: c.id, name: c.name })
                          }
                          className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: TABLES & QR CODES */}
          {currentTab === 'tables' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-black text-[#1C130E] flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-[#10B981] rounded-full inline-block" />
                  Cafe Seating Tables
                </h2>
                <Button variant="primary" onClick={() => setIsTableModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-1.5 font-black" />
                  <span className="hidden sm:inline">Add Seating Table</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tables.map((t) => (
                  <div
                    key={t.id}
                    className="bg-white rounded-3xl p-6 border border-[#E2DCD5] shadow-xs flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#00F5D4] to-[#10B981] text-[#140D0B] rounded-2xl flex items-center justify-center font-black text-base shadow-sm">
                        {t.number.replace('Table ', '')}
                      </div>
                      <span className="text-xs font-bold bg-[#FAF7F2] border border-[#E2DCD5] px-3 py-1 rounded-xl text-stone-700">
                        Cap: {t.capacity} guests
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-stone-900">{t.number}</h3>
                      <p className="text-xs font-mono text-stone-500 mt-1 truncate">
                        Token: {t.qrToken}
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-[#E2DCD5] flex items-center justify-between">
                      <button
                        onClick={async () => {
                          await api.regenerateQR(t.id);
                          loadTabData();
                        }}
                        className="text-xs text-stone-500 hover:text-[#10B981] font-bold flex items-center gap-1 transition-colors"
                        title="Regenerate QR Token"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Reset Token
                      </button>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedQRTable(t)}
                        className="flex items-center gap-1.5"
                      >
                        <QrCode className="w-4 h-4 text-[#10B981]" />
                        Print / View QR
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: ORDERS & ORDER HISTORY */}
          {(currentTab === 'orders' || currentTab === 'history') && (
            <div className="space-y-6">
              {/* Header & Date Filter Toolbar */}
              <div className="flex flex-col gap-4 bg-white p-4 sm:p-5 rounded-3xl border border-[#E2DCD5] shadow-xs">
                <div>
                  <h2 className="text-base font-black text-[#1C130E] flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-[#10B981] rounded-full inline-block" />
                    {currentTab === 'history' ? (
                      <>
                        <History className="w-5 h-5 text-[#10B981]" />
                        Order History & Historical Logs
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-5 h-5 text-[#10B981]" />
                        Live Orders Management
                      </>
                    )}
                  </h2>
                  <p className="text-xs text-stone-500 font-medium mt-0.5">
                    Filter by status, search by customer/phone/table, or pick a specific date.
                  </p>
                </div>

                {/* Date Picker Control & Preset Buttons & Download CSV */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-[#E2DCD5] pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 bg-[#FAF7F2] border border-[#E2DCD5] rounded-2xl px-3 py-1.5">
                      <Calendar className="w-4 h-4 text-[#10B981] shrink-0" />
                      <input
                        type="date"
                        value={orderDateFilter}
                        onChange={(e) => {
                          setOrderDateFilter(e.target.value);
                          setOrderRangeFilter('');
                        }}
                        className="bg-transparent text-xs font-bold text-stone-800 focus:outline-none"
                      />
                      {orderDateFilter && (
                        <button
                          onClick={() => {
                            setOrderDateFilter('');
                            setOrderRangeFilter('30days');
                          }}
                          className="text-stone-400 hover:text-stone-700"
                          title="Clear Date Filter"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        const todayStr = new Date().toISOString().split('T')[0];
                        setOrderDateFilter(todayStr);
                        setOrderRangeFilter('');
                      }}
                      className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition-all border ${
                        orderDateFilter === new Date().toISOString().split('T')[0]
                          ? 'bg-[#FAF7F2] text-[#10B981] border-[#10B981]/40 font-black'
                          : 'bg-white text-stone-600 border-[#E2DCD5] hover:bg-[#FAF7F2]'
                      }`}
                    >
                      Today
                    </button>

                    <button
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() - 1);
                        setOrderDateFilter(d.toISOString().split('T')[0]);
                        setOrderRangeFilter('');
                      }}
                      className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition-all border ${
                        orderDateFilter === new Date(Date.now() - 86400000).toISOString().split('T')[0]
                          ? 'bg-[#FAF7F2] text-[#10B981] border-[#10B981]/40 font-black'
                          : 'bg-white text-stone-600 border-[#E2DCD5] hover:bg-[#FAF7F2]'
                      }`}
                    >
                      Yesterday
                    </button>

                    <button
                      onClick={() => {
                        setOrderDateFilter('');
                        setOrderRangeFilter('7days');
                      }}
                      className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition-all border ${
                        !orderDateFilter && orderRangeFilter === '7days'
                          ? 'bg-[#FAF7F2] text-[#10B981] border-[#10B981]/40 font-black'
                          : 'bg-white text-stone-600 border-[#E2DCD5] hover:bg-[#FAF7F2]'
                      }`}
                    >
                      Last 7 Days
                    </button>

                    <button
                      onClick={() => {
                        setOrderDateFilter('');
                        setOrderRangeFilter('30days');
                      }}
                      className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition-all border ${
                        !orderDateFilter && orderRangeFilter === '30days'
                          ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/50 font-black shadow-2xs'
                          : 'bg-white text-stone-600 border-[#E2DCD5] hover:bg-[#FAF7F2]'
                      }`}
                    >
                      🗓️ Last 30 Days (1 Month)
                    </button>

                    {(orderDateFilter || (orderRangeFilter && orderRangeFilter !== '30days')) && (
                      <button
                        onClick={() => {
                          setOrderDateFilter('');
                          setOrderRangeFilter('');
                        }}
                        className="px-3 py-1.5 rounded-2xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-all"
                      >
                        Show All Dates
                      </button>
                    )}
                  </div>

                  {/* Export Options: Excel & CSV */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleDownloadHistoryExcel}
                      className="px-4 py-2 rounded-2xl text-xs font-black bg-[#10B981] hover:bg-[#0D9668] text-white shadow-md transition-all flex items-center gap-2 active:scale-95 shrink-0"
                      title="Download order history as Excel (.xlsx) spreadsheet matching table layout"
                    >
                      <FileSpreadsheet className="w-4 h-4 stroke-[2.5]" />
                      <span>Download Excel (.xlsx)</span>
                    </button>

                    <button
                      onClick={handleDownloadHistoryCSV}
                      className="px-3.5 py-2 rounded-2xl text-xs font-bold bg-white hover:bg-[#FAF7F2] text-stone-700 border border-[#E2DCD5] shadow-xs transition-all flex items-center gap-1.5 active:scale-95 shrink-0"
                      title="Download current order history as CSV file"
                    >
                      <Download className="w-4 h-4 text-stone-500" />
                      <span>CSV</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Order Status Filters & Search Bar */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
                  {['ALL', 'PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'].map(
                    (st) => (
                      <button
                        key={st}
                        onClick={() => setOrderStatusFilter(st)}
                        className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold transition-all border ${orderStatusFilter === st
                          ? 'bg-[#FAF7F2] text-[#10B981] border-[#10B981]/40 font-black shadow-2xs'
                          : 'bg-white text-stone-600 border-[#E2DCD5] hover:bg-[#FAF7F2]'
                          }`}
                      >
                        {st}
                      </button>
                    )
                  )}
                </div>

                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="text"
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                    placeholder="Search by order/phone/table..."
                    className="w-full bg-white border border-[#E2DCD5] rounded-2xl pl-10 pr-3.5 py-2 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 focus:border-[#10B981]"
                  />
                </div>
              </div>

              {/* Order Summary Stats for Filtered Date */}
              {orderDateFilter && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-amber-900">
                  <span>📅 {orderDateFilter}</span>
                  <span>Orders: {orders.length}</span>
                  <span>
                    Revenue: ₹
                    {orders
                      .filter((o) => o.orderStatus !== 'CANCELLED')
                      .reduce((sum, o) => sum + o.total, 0)
                      .toFixed(2)}
                  </span>
                </div>
              )}

              {/* Orders Table */}
              <div className="bg-white rounded-3xl border border-[#E2DCD5] shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-700 min-w-[700px]">
                  <thead className="bg-[#FAF7F2] border-b border-[#E2DCD5] uppercase font-extrabold text-stone-600">
                    <tr>
                      <th className="p-4">Order #</th>
                      <th className="p-4">Date & Time</th>
                      <th className="p-4">Table</th>
                      <th className="p-4">Customer</th>
                      <th className="p-4">Items</th>
                      <th className="p-4">Total</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Update Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2DCD5] font-medium">
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-stone-500 font-semibold">
                          No orders found matching your date or filter criteria.
                        </td>
                      </tr>
                    ) : (
                      orders.map((o) => (
                        <tr key={o.id} className="hover:bg-[#FAF7F2] transition-colors">
                          <td className="p-4 font-extrabold text-stone-900 whitespace-nowrap">#{o.orderNumber}</td>
                          <td className="p-4 text-stone-500 whitespace-nowrap">
                            {new Date(o.createdAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}{' '}
                            <span className="text-[11px] text-stone-400">
                              {new Date(o.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </td>
                          <td className="p-4 font-bold text-[#10B981] whitespace-nowrap">{o.tableNumber}</td>
                          <td className="p-4 whitespace-nowrap text-stone-800">{o.customerName || 'Guest'}</td>
                          <td className="p-4 max-w-[180px] truncate text-stone-700">
                            {o.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                          </td>
                          <td className="p-4 font-black text-[#10B981] whitespace-nowrap">₹{o.total.toFixed(2)}</td>
                          <td className="p-4">
                            <StatusBadge status={o.orderStatus} />
                          </td>
                          <td className="p-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-2">
                              <select
                                value={o.orderStatus}
                                onChange={async (e) => {
                                  await api.updateOrderStatus(o.id, e.target.value);
                                  loadTabData();
                                }}
                                className="bg-[#FAF7F2] border border-[#E2DCD5] rounded-xl px-2.5 py-1 text-xs font-bold text-stone-800 focus:outline-none focus:border-[#10B981]"
                              >
                                <option value="PENDING" className="bg-white text-stone-800">PENDING</option>
                                <option value="ACCEPTED" className="bg-white text-stone-800">ACCEPTED</option>
                                <option value="PREPARING" className="bg-white text-stone-800">PREPARING</option>
                                <option value="READY" className="bg-white text-stone-800">READY</option>
                                <option value="COMPLETED" className="bg-white text-stone-800">COMPLETED</option>
                                <option value="CANCELLED" className="bg-white text-stone-800">CANCELLED</option>
                              </select>
                              <button
                                onClick={() =>
                                  setDeleteConfirm({
                                    type: 'order',
                                    id: o.id,
                                    name: `Order #${o.orderNumber} (${o.tableNumber})`,
                                  })
                                }
                                className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors"
                                title="Delete Order from History"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: STAFF */}
          {currentTab === 'staff' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-black text-[#1C130E] flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-[#10B981] rounded-full inline-block" />
                  Staff Accounts
                </h2>
                <Button variant="primary" onClick={() => setIsStaffModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-1.5 font-black" />
                  <span className="hidden sm:inline">Add Staff Account</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </div>

              <div className="bg-white rounded-3xl border border-[#E2DCD5] shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-700 min-w-[560px]">
                  <thead className="bg-[#FAF7F2] border-b border-[#E2DCD5] uppercase font-extrabold text-stone-600">
                    <tr>
                      <th className="p-4">Name</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Staff ID</th>
                      <th className="p-4">Created Date</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2DCD5] font-medium">
                    {staff.map((s, index) => (
                      <tr key={s.id} className="hover:bg-[#FAF7F2] transition-colors">
                        <td className="p-4 font-black text-stone-900">{s.name}</td>
                        <td className="p-4 font-mono text-stone-600">{s.email}</td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${s.role === 'ADMIN'
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-blue-100 text-blue-900 border-blue-300'
                              }`}
                          >
                            {s.role}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="bg-[#FAF7F2] text-[#10B981] font-mono text-xs font-black px-2.5 py-1 rounded-xl shadow-2xs inline-flex items-center gap-1.5 border border-[#E2DCD5]">
                            <IdCard className="w-3.5 h-3.5 text-[#10B981]" />
                            {s.staffId || `STF-${(101 + index).toString().padStart(3, '0')}`}
                          </span>
                        </td>
                        <td className="p-4 text-stone-500">
                          {s.createdAt
                            ? new Date(s.createdAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                            : new Date().toLocaleDateString()}
                        </td>
                        <td className="p-4 text-right">
                          {s.id !== user.id ? (
                            <button
                              onClick={() => setDeleteConfirm({ type: 'staff', id: s.id, name: s.name })}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 ml-auto"
                              title="Delete Staff Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-stone-500 font-semibold italic bg-[#FAF7F2] border border-[#E2DCD5] px-2.5 py-1 rounded-lg">
                              Current User
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: SETTINGS */}
          {currentTab === 'settings' && settings && (
            <div className="max-w-2xl bg-white rounded-3xl p-5 sm:p-8 border border-[#E2DCD5] shadow-xs">
              <h2 className="text-lg font-black text-[#1C130E] mb-6 flex items-center gap-2">
                <span className="w-1.5 h-5 bg-[#10B981] rounded-full inline-block" />
                Cafe Configuration Settings
              </h2>
              <form onSubmit={handleSaveSettings} className="space-y-4">
                <Input label="Cafe Name" name="name" defaultValue={settings.name} required />
                <Input label="Logo Image URL" name="logo" defaultValue={settings.logo || ''} />
                <Input label="Address" name="address" defaultValue={settings.address || ''} />
                <Input label="Phone Number" name="phone" defaultValue={settings.phone || ''} />
                <Input label="Email" name="email" defaultValue={settings.email || ''} />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Tax Percentage (%)"
                    name="taxRate"
                    type="number"
                    step="0.01"
                    defaultValue={settings.taxRate}
                    required
                  />
                  <Input label="Currency Symbol" name="currency" defaultValue={settings.currency} required />
                </div>

                <Button variant="primary" type="submit" className="py-3 text-sm font-extrabold w-full sm:w-auto">
                  Save Store Settings
                </Button>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* --- MODALS --- */}
      {/* Product Form Modal */}
      <Modal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
      >
        <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold uppercase tracking-wider text-stone-400 mb-1.5">Category</label>
            <select
              name="categoryId"
              defaultValue={editingProduct?.categoryId || categories[0]?.id}
              className="w-full bg-[#1F1512] border border-[#38241D] rounded-2xl p-2.5 text-stone-100 focus:outline-none focus:border-[#00F5D4]"
              required
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#1F1512] text-stone-100">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <Input label="Product Name" name="name" defaultValue={editingProduct?.name} required />
          <Input
            label="Description"
            name="description"
            defaultValue={editingProduct?.description || ''}
          />
          <Input
            label="Price"
            name="price"
            type="number"
            step="0.01"
            defaultValue={editingProduct?.price}
            required
          />
          <Input
            label="Image URL"
            name="image"
            defaultValue={editingProduct?.image || ''}
          />
          <Input
            label="Preparation Time (mins)"
            name="preparationTime"
            type="number"
            defaultValue={editingProduct?.preparationTime || 15}
          />

          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 font-bold text-stone-300 cursor-pointer">
              <input
                type="checkbox"
                name="isVeg"
                defaultChecked={editingProduct ? editingProduct.isVeg : true}
                className="accent-[#00F5D4] w-4 h-4 rounded"
              />
              Is Veg
            </label>
            <label className="flex items-center gap-2 font-bold text-stone-300 cursor-pointer">
              <input
                type="checkbox"
                name="isAvailable"
                defaultChecked={editingProduct ? editingProduct.isAvailable : true}
                className="accent-[#00F5D4] w-4 h-4 rounded"
              />
              Is Available
            </label>
            <label className="flex items-center gap-2 font-bold text-stone-300 cursor-pointer">
              <input
                type="checkbox"
                name="isFeatured"
                defaultChecked={editingProduct?.isFeatured}
                className="accent-[#00F5D4] w-4 h-4 rounded"
              />
              Featured Special
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" type="button" onClick={() => setIsProductModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Product
            </Button>
          </div>
        </form>
      </Modal>

      {/* Category Form Modal */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title={editingCategory ? 'Edit Category' : 'Add Category'}
      >
        <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
          <Input label="Category Name" name="name" defaultValue={editingCategory?.name} required />
          <Input
            label="Description"
            name="description"
            defaultValue={editingCategory?.description || ''}
          />
          <Input label="Image URL" name="image" defaultValue={editingCategory?.image || ''} />
          <Input
            label="Sort Order"
            name="sortOrder"
            type="number"
            defaultValue={editingCategory?.sortOrder || 0}
          />
          <label className="flex items-center gap-2 font-bold text-stone-300 cursor-pointer">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={editingCategory ? editingCategory.isActive : true}
              className="accent-[#00F5D4] w-4 h-4 rounded"
            />
            Active Category
          </label>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" type="button" onClick={() => setIsCategoryModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Category
            </Button>
          </div>
        </form>
      </Modal>

      {/* Table Form Modal */}
      <Modal
        isOpen={isTableModalOpen}
        onClose={() => setIsTableModalOpen(false)}
        title="Add Seating Table"
      >
        <form onSubmit={handleCreateTable} className="space-y-4 text-xs">
          <Input
            label="Table Identifier (e.g. Table 07)"
            value={newTableNumber}
            onChange={(e) => setNewTableNumber(e.target.value)}
            required
          />
          <Input
            label="Guest Capacity"
            type="number"
            value={newTableCapacity}
            onChange={(e) => setNewTableCapacity(parseInt(e.target.value) || 4)}
            required
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" type="button" onClick={() => setIsTableModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Generate & Save Table
            </Button>
          </div>
        </form>
      </Modal>

      {/* Staff Form Modal */}
      <Modal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        title="Add Staff Account"
      >
        <form onSubmit={handleCreateStaff} className="space-y-4 text-xs">
          <div className="p-3 bg-[#2A1D18] border border-[#38241D] text-stone-200 rounded-2xl flex items-center justify-between">
            <span className="text-[11px] font-bold text-stone-400 flex items-center gap-1.5">
              <IdCard className="w-4 h-4 text-[#00F5D4]" />
              Staff ID Generation:
            </span>
            <span className="font-mono font-black text-[#00F5D4] text-xs px-2.5 py-1 bg-[#1F1512] rounded-xl border border-[#38241D]">
              Auto-Generated (e.g. STF-{(101 + staff.length).toString().padStart(3, '0')})
            </span>
          </div>
          <Input label="Full Name" name="name" required />
          <Input label="Email Address" name="email" type="email" required />
          <Input label="Password" name="password" type="password" required />
          <div>
            <label className="block font-bold uppercase tracking-wider text-stone-400 mb-1.5">Assigned Role</label>
            <select name="role" className="w-full bg-[#1F1512] border border-[#38241D] rounded-2xl p-2.5 text-stone-100 focus:outline-none focus:border-[#00F5D4]">
              <option value="ADMIN" className="bg-[#1F1512] text-stone-100">ADMIN</option>
              <option value="KITCHEN" className="bg-[#1F1512] text-stone-100">KITCHEN</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" type="button" onClick={() => setIsStaffModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Create Staff User
            </Button>
          </div>
        </form>
      </Modal>

      {/* QR Preview & Print Modal */}
      <QRPreviewModal
        table={selectedQRTable}
        cafe={settings}
        isOpen={Boolean(selectedQRTable)}
        onClose={() => setSelectedQRTable(null)}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteConfirm)}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleExecuteDelete}
        title={`Delete ${deleteConfirm?.type}`}
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
      />
    </div>
  );
};
