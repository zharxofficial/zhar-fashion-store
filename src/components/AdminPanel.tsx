import { MediaUploadButton, CategoriesTab, ContentTab, PaymentStatusControl } from './AdminExtras.tsx';
import { deleteMedia } from '../lib/media.ts';
import React, { useState, useEffect } from 'react';
import { Product, Order, StoreSettings, OrderStatus, Category, Gender } from '../types/index.ts';
import {
  X, Lock, ShieldCheck, DollarSign, ShoppingBag, AlertTriangle, Check,
  Plus, Edit, Trash2, Video, Settings as SettingsIcon, Layers, Save,
  Truck, Eye, ExternalLink, RefreshCw, Key
} from 'lucide-react';
import { ZharLogo } from './ZharLogo.tsx';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  settings: StoreSettings;
  onRefreshData: () => void;
  currencySymbol?: string;
}

const AdminPanelInner: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  products,
  settings: initialSettings,
  onRefreshData,
  currencySymbol = 'PKR '
}) => {

  const [adminToken, setAdminToken] = useState<string>(() => localStorage.getItem('zhar_admin_token') || '');
  const [passkey, setPasskey] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Active Admin Tab
  const [activeTab, setActiveTab] = useState<'kpi' | 'products' | 'orders' | 'video' | 'settings' | 'categories' | 'content'>('kpi');
  const [catOptions, setCatOptions] = useState<string[]>([]);

  // Stats
  const [stats, setStats] = useState<any>({
    totalRevenue: 0,
    totalOrders: 0,
    pendingOrders: 0,
    confirmedOrders: 0,
    lowStockCount: 0,
    totalProducts: 0
  });

  // Orders list
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Settings form state
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(initialSettings);
  const [settingsSavedNotice, setSettingsSavedNotice] = useState(false);

  // Video settings form state
  const [videoConfig, setVideoConfig] = useState(initialSettings.homepageVideo);
  const [videoSavedNotice, setVideoSavedNotice] = useState(false);
  const [videoPreviewError, setVideoPreviewError] = useState(false);

  // Product editing / adding
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  useEffect(() => { fetch('/api/categories').then(r => (r.ok ? r.json() : [])).then((d: { name: string }[]) => setCatOptions(d.map(c => c.name))).catch(() => {}); }, [activeTab, isEditingProduct]);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    category: 'Jackets' as Category,
    gender: 'Unisex' as Gender,
    description: '',
    price: 45000,
    originalPrice: 0,
    isSale: false,
    isFeatured: false,
    isNewArrival: true,
    images: ['/images/zhar_luxury_jacket_1794080538698.jpg'],
    imageUrlInput: '',
    sizes: 'S, M, L, XL',
    colors: '',
    isAvailable: true,
    stock: 10,
    sku: 'ZHR-NEW-001',
    materials: 'Pure Italian Virgin Cashmere',
    details: '100% Cashmere, Handcrafted lapels, Dry clean only'
  });

  // Courier tracking update form on selected order
  const [orderStatusUpdate, setOrderStatusUpdate] = useState<OrderStatus>('Pending');
  const [carrierInput, setCarrierInput] = useState('');
  const [trackingNumberInput, setTrackingNumberInput] = useState('');
  const [statusNoteInput, setStatusNoteInput] = useState('');

  // Preset luxury images for quick assignment
  const LUXURY_IMAGE_PRESETS = [
    { label: 'Cashmere Overcoat', url: '/images/zhar_luxury_jacket_1794080538698.jpg' },
    { label: 'Noir Flacon Parfum', url: '/images/zhar_luxury_perfume_1794080536268.jpg' },
    { label: 'Chrono Titanium Watch', url: '/images/zhar_luxury_watch_1794080536688.jpg' },
    { label: 'Heavy French Terry Hoodie', url: '/images/zhar_luxury_hoodie_1794080536443.jpg' }
  ];

  const fetchAdminData = async () => {
    if (!adminToken) return;

    try {
      const headers = { Authorization: `Bearer ${adminToken}` };

      // Stats
      const statsRes = await fetch('/api/admin/stats', { headers });
      if (statsRes.status === 401 || statsRes.status === 403) { localStorage.removeItem('zhar_admin_token'); setAdminToken(''); return; }
      if (statsRes.ok) {
        const sData = await statsRes.json();
        setStats(sData);
      }

      // Orders
      const ordersRes = await fetch('/api/admin/orders', { headers });
      if (ordersRes.ok) {
        const oData = await ordersRes.json();
        setOrders(oData);
      }

      // Settings
      const settingsRes = await fetch('/api/settings');
      if (settingsRes.ok) {
        const setts = await settingsRes.json();
        setStoreSettings(setts);
        setVideoConfig(setts.homepageVideo);
      }
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    }
  };

  useEffect(() => {
    if (adminToken) {
      fetchAdminData();
    }
  }, [adminToken]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: passkey })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication denied.');
      if (!data.isAdmin) throw new Error('This account is not an owner account.');

      setAdminToken(data.token);
      localStorage.setItem('zhar_admin_token', data.token);
      fetchAdminData();
    } catch (err: any) {
      setAuthError(err.message || 'Invalid owner access passkey.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify(storeSettings)
      });
      if (res.ok) {
        setSettingsSavedNotice(true);
        setTimeout(() => setSettingsSavedNotice(false), 2500);
        onRefreshData();
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  };

  const DEFAULT_VIDEO = '/videos/zhar_fashion_film.mp4';
  const putVideo = (body: object) => fetch('/api/admin/video', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` }, body: JSON.stringify(body) });
  const handleVideoUploaded = async (url: string) => {
    const old = videoConfig.videoUrl;
    const r = await putVideo({ videoUrl: url });
    if (!r.ok) { alert('Uploaded, but could not activate the video.'); return; }
    setVideoConfig({ ...videoConfig, videoUrl: url });
    await deleteMedia(old, adminToken);
    setVideoSavedNotice(true); setTimeout(() => setVideoSavedNotice(false), 2500); onRefreshData();
  };
  const handleDeleteVideo = async () => {
    if (!confirm('Delete the current intro video and go back to the built-in ZHĀR film?')) return;
    const old = videoConfig.videoUrl;
    const r = await putVideo({ videoUrl: DEFAULT_VIDEO });
    if (r.ok) { await deleteMedia(old, adminToken); setVideoConfig({ ...videoConfig, videoUrl: DEFAULT_VIDEO }); onRefreshData(); }
  };

  const handleSaveVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/video', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify(videoConfig)
      });
      if (res.ok) {
        setVideoSavedNotice(true);
        setTimeout(() => setVideoSavedNotice(false), 2500);
        onRefreshData();
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.error || 'Could not save video settings.');
      }
    } catch (err) {
      console.error('Failed to save video settings:', err);
    }
  };

  const handleOpenAddProduct = () => {
    setEditingProductId(null);
    setProductForm({
      name: '',
      category: 'Jackets',
      gender: 'Unisex',
      description: '',
      price: 35000,
      originalPrice: 0,
      isSale: false,
      isFeatured: false,
      isNewArrival: true,
      images: ['/images/zhar_luxury_jacket_1794080538698.jpg'],
      imageUrlInput: '',
      sizes: 'S, M, L, XL',
    colors: '',
    isAvailable: true,
      stock: 12,
      sku: 'ZHR-JKT-' + Math.floor(100 + Math.random() * 900),
      materials: 'Pure Italian Virgin Cashmere',
      details: 'Handcrafted luxury construction, Cupro lining'
    });
    setIsEditingProduct(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProductId(prod.id);
    setProductForm({
      name: prod.name,
      category: prod.category,
      gender: prod.gender,
      description: prod.description,
      price: prod.price,
      originalPrice: prod.originalPrice || 0,
      isSale: Boolean(prod.isSale),
      isFeatured: Boolean(prod.isFeatured),
      isNewArrival: Boolean(prod.isNewArrival),
      images: prod.images || [],
      imageUrlInput: '',
      sizes: (prod.sizes || []).join(', '),
      colors: (prod.colors || []).join(', '),
      isAvailable: prod.isAvailable !== false,
      stock: prod.stock,
      sku: prod.sku,
      materials: prod.materials || '',
      details: (prod.details || []).join(', ')
    });
    setIsEditingProduct(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: productForm.name,
        category: productForm.category,
        gender: productForm.gender,
        description: productForm.description,
        price: Number(productForm.price),
        originalPrice: productForm.originalPrice ? Number(productForm.originalPrice) : undefined,
        isSale: productForm.isSale,
        isFeatured: productForm.isFeatured,
        isNewArrival: productForm.isNewArrival,
        images: productForm.images.length > 0 ? productForm.images : ['/images/zhar_luxury_jacket_1794080538698.jpg'],
        sizes: productForm.sizes.split(',').map(s => s.trim()).filter(Boolean),
        colors: productForm.colors.split(',').map(s => s.trim()).filter(Boolean),
        isAvailable: productForm.isAvailable,
        stock: Number(productForm.stock),
        sku: productForm.sku,
        materials: productForm.materials,
        details: productForm.details.split(',').map(d => d.trim()).filter(Boolean)
      };

      const url = editingProductId
        ? `/api/admin/products/${editingProductId}`
        : '/api/admin/products';
      const method = editingProductId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsEditingProduct(false);
        fetchAdminData();
        onRefreshData();
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.error || 'Could not save the product.');
      }
    } catch (err) {
      console.error('Failed to save product:', err);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you certain you wish to purge this product from the atelier archive?')) return;
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      if (res.ok) {
        fetchAdminData();
        onRefreshData();
      }
    } catch (err) {
      console.error('Failed to delete product:', err);
    }
  };

  const handleUpdateOrderStatus = async () => {
    if (!selectedOrder) return;
    try {
      const res = await fetch(`/api/admin/orders/${selectedOrder.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          status: orderStatusUpdate,
          carrier: carrierInput || selectedOrder.carrier,
          trackingNumber: trackingNumberInput || selectedOrder.trackingNumber,
          note: statusNoteInput
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedOrder(data.order);
        setStatusNoteInput('');
        fetchAdminData();
      }
    } catch (err) {
      console.error('Failed to update order status:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/90 backdrop-blur-md">
      <div className="relative w-full max-w-6xl bg-neutral-950 border border-neutral-800 text-white shadow-2xl my-auto overflow-hidden flex flex-col min-h-[85vh]">
        {/* Top Executive Header */}
        <div className="px-6 py-5 border-b border-neutral-900 flex items-center justify-between bg-black">
          <div className="flex items-center gap-3">
            <ZharLogo size="sm" variant="wordmark" />
            <span className="text-neutral-500 text-xs">/</span>
            <span className="text-xs uppercase tracking-[0.25em] text-neutral-300 font-medium">
              Maison Executive Atelier Control Panel (/admin)
            </span>
          </div>

          <div className="flex items-center gap-4">
            {adminToken && (
              <button
                onClick={() => {
                  setAdminToken('');
                  localStorage.removeItem('zhar_admin_token');
                }}
                className="text-[11px] uppercase tracking-wider text-neutral-500 hover:text-white"
              >
                Sign Out
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {!adminToken ? (
          /* Authentication Screen */
          <div className="flex-1 flex items-center justify-center p-6 md:p-12">
            <div className="w-full max-w-md bg-neutral-900/60 border border-neutral-800 p-8 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-black border border-neutral-800 flex items-center justify-center mb-4">
                <Lock className="w-5 h-5 text-neutral-300" />
              </div>
              <h2 className="text-xl font-serif-luxury uppercase tracking-wider text-white mb-2">
                Atelier Master Authentication
              </h2>
              <p className="text-xs text-neutral-400 font-light mb-6">
                Restricted to the ZHĀR Creative Director and Executive Management.
              </p>

              {authError && (
                <div className="w-full mb-4 p-3 bg-red-950/40 border border-red-900/60 text-red-300 text-xs">
                  {authError}
                </div>
              )}

              <form onSubmit={handleAdminLogin} className="w-full flex flex-col gap-4 text-xs">
                <div className="text-left">
                  <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1">Owner Email</label>
                  <input type="email" required autoComplete="username" placeholder="owner@email.com" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} className="w-full bg-black border border-neutral-700 px-3 py-2.5 text-white font-mono text-center focus:outline-none focus:border-white transition-colors" />
                </div>

                <div className="text-left">
                  <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1">
                    Owner Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Owner password" autoComplete="current-password"
                    value={passkey}
                    onChange={e => setPasskey(e.target.value)}
                    className="w-full bg-black border border-neutral-700 px-3 py-2.5 text-white font-mono text-center focus:outline-none focus:border-white transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3 bg-white text-black text-xs uppercase tracking-[0.2em] font-medium hover:bg-neutral-200 transition-colors disabled:opacity-50"
                >
                  {authLoading ? 'Verifying Key...' : 'Unlock Executive Terminal'}
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* Admin Main Terminal */
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Sidebar Navigation */}
            <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-neutral-900 bg-neutral-950 p-4 flex flex-col justify-between shrink-0">
              <div className="flex md:flex-col gap-1 overflow-x-auto text-xs uppercase tracking-wider">
                <button
                  onClick={() => { setActiveTab('kpi'); setIsEditingProduct(false); setSelectedOrder(null); }}
                  className={`flex items-center gap-2.5 px-4 py-3 text-left transition-colors whitespace-nowrap ${
                    activeTab === 'kpi' ? 'bg-neutral-900 text-white border-l-2 border-white' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>Overview & KPIs</span>
                </button>

                <button
                  onClick={() => { setActiveTab('products'); setIsEditingProduct(false); setSelectedOrder(null); }}
                  className={`flex items-center gap-2.5 px-4 py-3 text-left transition-colors whitespace-nowrap ${
                    activeTab === 'products' ? 'bg-neutral-900 text-white border-l-2 border-white' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Products & Stock</span>
                </button>

                <button
                  onClick={() => { setActiveTab('orders'); setIsEditingProduct(false); }}
                  className={`flex items-center gap-2.5 px-4 py-3 text-left transition-colors whitespace-nowrap ${
                    activeTab === 'orders' ? 'bg-neutral-900 text-white border-l-2 border-white' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Truck className="w-4 h-4" />
                  <span>Orders & Pipeline</span>
                </button>

                <button
                  onClick={() => { setActiveTab('video'); setIsEditingProduct(false); setSelectedOrder(null); }}
                  className={`flex items-center gap-2.5 px-4 py-3 text-left transition-colors whitespace-nowrap ${
                    activeTab === 'video' ? 'bg-neutral-900 text-white border-l-2 border-white' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Video className="w-4 h-4" />
                  <span>Cinematic Video</span>
                </button>

                <button
                  onClick={() => { setActiveTab('settings'); setIsEditingProduct(false); setSelectedOrder(null); }}
                  className={`flex items-center gap-2.5 px-4 py-3 text-left transition-colors whitespace-nowrap ${
                    activeTab === 'settings' ? 'bg-neutral-900 text-white border-l-2 border-white' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <SettingsIcon className="w-4 h-4" />
                  <span>Store & Accounts</span>
                </button>

                <button
                  onClick={() => { setActiveTab('categories'); setIsEditingProduct(false); setSelectedOrder(null); }}
                  className={`flex items-center gap-2.5 px-4 py-3 text-left transition-colors whitespace-nowrap ${
                    activeTab === 'categories' ? 'bg-neutral-900 text-white border-l-2 border-white' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <SettingsIcon className="w-4 h-4" />
                  <span>Categories</span>
                </button>
                <button
                  onClick={() => { setActiveTab('content'); setIsEditingProduct(false); setSelectedOrder(null); }}
                  className={`flex items-center gap-2.5 px-4 py-3 text-left transition-colors whitespace-nowrap ${
                    activeTab === 'content' ? 'bg-neutral-900 text-white border-l-2 border-white' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <SettingsIcon className="w-4 h-4" />
                  <span>Homepage & Contact</span>
                </button>
              </div>

              <div className="hidden md:block p-4 border-t border-neutral-900 text-[10px] text-neutral-500 font-mono">
                <div>SERVER DB: PERSISTENT</div>
                <div>ZHĀR MAISON ENGINE 2026</div>
              </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-neutral-950/70">
              {/* TAB 1: KPI OVERVIEW */}
              {activeTab === 'kpi' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-serif-luxury uppercase tracking-wider text-white">
                      Executive Atelier Metrics
                    </h2>
                    <p className="text-xs text-neutral-400 font-light mt-1">
                      Real-time inventory and revenue logs recorded in the persistent server database.
                    </p>
                  </div>

                  {/* Stat Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-neutral-900/60 border border-neutral-800 p-5 flex flex-col justify-between">
                      <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-2">Total Gross Revenue</div>
                      <div className="font-mono text-2xl text-white font-medium tabular-nums">
                        {currencySymbol}{stats.totalRevenue.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-neutral-500 mt-2 font-mono">From {stats.totalOrders} total acquisitions</div>
                    </div>

                    <div className="bg-neutral-900/60 border border-neutral-800 p-5 flex flex-col justify-between">
                      <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-2">Pending Approvals</div>
                      <div className="font-mono text-2xl text-white font-medium tabular-nums">
                        {stats.pendingOrders}
                      </div>
                      <div className="text-[10px] text-neutral-500 mt-2 font-mono">Awaiting JazzCash/Easypaisa/COD confirmation</div>
                    </div>

                    <div className="bg-neutral-900/60 border border-neutral-800 p-5 flex flex-col justify-between">
                      <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-2">In Fulfillment</div>
                      <div className="font-mono text-2xl text-white font-medium tabular-nums">
                        {stats.confirmedOrders}
                      </div>
                      <div className="text-[10px] text-neutral-500 mt-2 font-mono">Packaged & dispatched</div>
                    </div>

                    <div className="bg-neutral-900/60 border border-neutral-800 p-5 flex flex-col justify-between">
                      <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-2">Inventory Alerts</div>
                      <div className="font-mono text-2xl text-neutral-300 font-medium tabular-nums">
                        {stats.lowStockCount} Items
                      </div>
                      <div className="text-[10px] text-neutral-500 mt-2 font-mono">Stock level $\le 5$ units</div>
                    </div>
                  </div>

                  {/* Recent Orders Shortcut */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs uppercase tracking-widest text-neutral-300 font-medium">
                        Latest Consignments Placed
                      </h3>
                      <button
                        onClick={() => setActiveTab('orders')}
                        className="text-xs text-neutral-400 hover:text-white underline underline-offset-4"
                      >
                        Manage All Orders &gt;
                      </button>
                    </div>

                    <div className="bg-neutral-900/30 border border-neutral-800 overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-neutral-900/80 text-neutral-400 border-b border-neutral-800 text-[10px] uppercase tracking-wider font-mono">
                          <tr>
                            <th className="p-3">Order Ref</th>
                            <th className="p-3">Customer</th>
                            <th className="p-3">City</th>
                            <th className="p-3">Payment</th>
                            <th className="p-3">Total</th>
                            <th className="p-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-900 font-mono">
                          {orders.slice(0, 5).map(o => (
                            <tr key={o.id} className="hover:bg-neutral-900/50">
                              <td className="p-3 text-white font-bold">{o.orderNumber}</td>
                              <td className="p-3 text-neutral-300">{o.customer.fullName}</td>
                              <td className="p-3 text-neutral-400">{o.customer.city}</td>
                              <td className="p-3 text-neutral-400 uppercase">{o.paymentMethod}</td>
                              <td className="p-3 text-white">{currencySymbol}{o.total.toLocaleString()}</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 bg-neutral-800 text-[10px] text-white">
                                  {o.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PRODUCTS & STOCK MANAGEMENT */}
              {activeTab === 'products' && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-serif-luxury uppercase tracking-wider text-white">
                        Atelier Product Catalog
                      </h2>
                      <p className="text-xs text-neutral-400 font-light mt-1">
                        Add, edit, adjust prices, manage discounts, replace photography, and update real-time stock.
                      </p>
                    </div>
                    <button
                      onClick={handleOpenAddProduct}
                      className="px-4 py-2.5 bg-white text-black text-xs uppercase tracking-widest font-medium hover:bg-neutral-200 transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add New Piece</span>
                    </button>
                  </div>

                  {/* Add / Edit Form Modal */}
                  {isEditingProduct ? (
                    <div className="bg-neutral-900/60 border border-neutral-800 p-6">
                      <div className="flex items-center justify-between pb-4 border-b border-neutral-800 mb-6">
                        <h3 className="text-sm uppercase tracking-widest font-medium text-white">
                          {editingProductId ? 'Edit Product Details' : 'Add New Atelier Piece'}
                        </h3>
                        <button
                          onClick={() => setIsEditingProduct(false)}
                          className="text-neutral-400 hover:text-white text-xs uppercase"
                        >
                          Cancel
                        </button>
                      </div>

                      <form onSubmit={handleSaveProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="md:col-span-2">
                          <label className="block text-[10px] uppercase tracking-wider text-neutral-400 mb-1">
                            Product Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={productForm.name}
                            onChange={e => setProductForm({ ...productForm, name: e.target.value })}
                            placeholder="e.g. Atelier Bespoke Cashmere Overcoat"
                            className="w-full bg-black border border-neutral-800 p-2 text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-neutral-400 mb-1">
                            Category *
                          </label>
                          <select
                            value={productForm.category}
                            onChange={e => setProductForm({ ...productForm, category: e.target.value as Category })}
                            className="w-full bg-black border border-neutral-800 p-2 text-white"
                          >
                            {Array.from(new Set([...catOptions, productForm.category])).map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-neutral-400 mb-1">
                            Gender Department *
                          </label>
                          <select
                            value={productForm.gender}
                            onChange={e => setProductForm({ ...productForm, gender: e.target.value as Gender })}
                            className="w-full bg-black border border-neutral-800 p-2 text-white"
                          >
                            <option value="Men">Men</option>
                            <option value="Women">Women</option>
                            <option value="Unisex">Unisex</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-neutral-400 mb-1">
                            Price ({currencySymbol}) *
                          </label>
                          <input
                            type="number"
                            required
                            value={productForm.price}
                            onChange={e => setProductForm({ ...productForm, price: Number(e.target.value) })}
                            className="w-full bg-black border border-neutral-800 p-2 text-white font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-neutral-400 mb-1">
                            Original Price (For Discount Display)
                          </label>
                          <input
                            type="number"
                            value={productForm.originalPrice}
                            onChange={e => setProductForm({ ...productForm, originalPrice: Number(e.target.value) })}
                            placeholder="Optional"
                            className="w-full bg-black border border-neutral-800 p-2 text-white font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-neutral-400 mb-1">
                            Available Stock Count *
                          </label>
                          <input
                            type="number"
                            required
                            value={productForm.stock}
                            onChange={e => setProductForm({ ...productForm, stock: Number(e.target.value) })}
                            className="w-full bg-black border border-neutral-800 p-2 text-white font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-neutral-400 mb-1">
                            SKU Identifier
                          </label>
                          <input
                            type="text"
                            value={productForm.sku}
                            onChange={e => setProductForm({ ...productForm, sku: e.target.value })}
                            className="w-full bg-black border border-neutral-800 p-2 text-white font-mono"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-[10px] uppercase tracking-wider text-neutral-400 mb-1">
                            Available Sizes (comma separated)
                          </label>
                          <input
                            type="text"
                            value={productForm.sizes}
                            onChange={e => setProductForm({ ...productForm, sizes: e.target.value })}
                            placeholder="S, M, L, XL or 41 EU, 42 EU, 43 EU"
                            className="w-full bg-black border border-neutral-800 p-2 text-white font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-neutral-400 mb-1">Colours (comma separated)</label>
                          <input type="text" value={productForm.colors} onChange={e => setProductForm({ ...productForm, colors: e.target.value })}
                            placeholder="Black, White, Charcoal" className="w-full bg-black border border-neutral-800 p-2 text-white font-mono" />
                        </div>

                        <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer md:pt-5">
                          <input type="checkbox" checked={productForm.isAvailable} onChange={e => setProductForm({ ...productForm, isAvailable: e.target.checked })} />
                          Available for purchase (untick to hide the Add to Bag button)
                        </label>

                        {/* Image Manager */}
                        <div className="md:col-span-2 border border-neutral-800 p-3 bg-black">
                          <label className="block text-[10px] uppercase tracking-wider text-neutral-400 mb-2">
                            Product Photography URL & Presets
                          </label>

                          <div className="flex gap-2 mb-3">
                            <input
                              type="text"
                              placeholder="Paste custom image URL or select preset below"
                              value={productForm.imageUrlInput}
                              onChange={e => setProductForm({ ...productForm, imageUrlInput: e.target.value })}
                              className="flex-1 bg-neutral-900 border border-neutral-800 p-2 text-white text-xs font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (productForm.imageUrlInput.trim()) {
                                  setProductForm({
                                    ...productForm,
                                    images: [...productForm.images, productForm.imageUrlInput.trim()],
                                    imageUrlInput: ''
                                  });
                                }
                              }}
                              className="px-4 py-2 bg-neutral-800 text-white text-xs uppercase"
                            >
                              Add Image
                            </button>
                          </div>

                          <div className="mb-3">
                            <MediaUploadButton token={adminToken} folder="products" multiple label="Upload photos from device"
                              onUploaded={u => setProductForm(f => ({ ...f, images: [...f.images, u] }))} />
                          </div>

                          <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-2">
                            Select Generated Luxury Presets:
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                            {LUXURY_IMAGE_PRESETS.map((pst, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => {
                                  setProductForm({ ...productForm, images: [pst.url] });
                                }}
                                className="p-2 border border-neutral-800 hover:border-white text-left flex items-center gap-2 transition-colors"
                              >
                                <img src={pst.url} alt="" className="w-8 h-8 object-cover shrink-0" />
                                <span className="text-[10px] text-neutral-300 truncate">{pst.label}</span>
                              </button>
                            ))}
                          </div>

                          {/* Selected Images List */}
                          <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-900">
                            {productForm.images.map((img, idx) => (
                              <div key={idx} className="relative group w-16 h-20 border border-neutral-800">
                                <img src={img} alt="" className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setProductForm({
                                      ...productForm,
                                      images: productForm.images.filter((_, i) => i !== idx)
                                    });
                                  }}
                                  className="absolute top-0 right-0 bg-red-900 text-white p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-[10px] uppercase tracking-wider text-neutral-400 mb-1">
                            Description
                          </label>
                          <textarea
                            rows={3}
                            value={productForm.description}
                            onChange={e => setProductForm({ ...productForm, description: e.target.value })}
                            className="w-full bg-black border border-neutral-800 p-2 text-white"
                          />
                        </div>

                        <div className="md:col-span-2 flex flex-wrap gap-6 pt-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={productForm.isSale}
                              onChange={e => setProductForm({ ...productForm, isSale: e.target.checked })}
                              className="accent-white"
                            />
                            <span>Mark as Sale / Privilege Item</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={productForm.isFeatured}
                              onChange={e => setProductForm({ ...productForm, isFeatured: e.target.checked })}
                              className="accent-white"
                            />
                            <span>Feature on Homepage Showcase</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={productForm.isNewArrival}
                              onChange={e => setProductForm({ ...productForm, isNewArrival: e.target.checked })}
                              className="accent-white"
                            />
                            <span>New Arrival Tag</span>
                          </label>
                        </div>

                        <div className="md:col-span-2 pt-4 flex gap-3">
                          <button
                            type="submit"
                            className="px-6 py-3 bg-white text-black text-xs uppercase tracking-widest font-medium hover:bg-neutral-200 transition-colors"
                          >
                            Save Product to Database
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsEditingProduct(false)}
                            className="px-6 py-3 border border-neutral-800 text-neutral-400 hover:text-white text-xs uppercase tracking-widest"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : null}

                  {/* Products Table */}
                  <div className="bg-neutral-900/30 border border-neutral-800 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-neutral-900/80 text-neutral-400 border-b border-neutral-800 text-[10px] uppercase tracking-wider font-mono">
                        <tr>
                          <th className="p-3">Item</th>
                          <th className="p-3">Category</th>
                          <th className="p-3">Department</th>
                          <th className="p-3">Price</th>
                          <th className="p-3">Stock</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-900">
                        {products.map(p => (
                          <tr key={p.id} className="hover:bg-neutral-900/50">
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <img
                                  src={p.images[0]}
                                  alt=""
                                  className="w-10 h-12 object-cover bg-black border border-neutral-800 shrink-0"
                                />
                                <div>
                                  <div className="font-medium text-white">{p.name}</div>
                                  <div className="font-mono text-[10px] text-neutral-500">{p.sku}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-neutral-300">{p.category}</td>
                            <td className="p-3 text-neutral-400">{p.gender}</td>
                            <td className="p-3 font-mono text-white tabular-nums">
                              {currencySymbol}{p.price.toLocaleString()}
                            </td>
                            <td className="p-3 font-mono">
                              <span className={p.stock <= 5 ? 'text-neutral-400 font-bold' : 'text-neutral-300'}>
                                {p.stock} units
                              </span>
                            </td>
                            <td className="p-3">
                              {p.isSale ? (
                                <span className="px-2 py-0.5 bg-neutral-800 text-[10px] text-white">Sale</span>
                              ) : p.isNewArrival ? (
                                <span className="px-2 py-0.5 bg-neutral-900 border border-neutral-700 text-[10px] text-neutral-300">New</span>
                              ) : (
                                <span className="text-neutral-500 text-[10px]">Active</span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleOpenEditProduct(p)}
                                  className="p-1.5 text-neutral-400 hover:text-white transition-colors"
                                  title="Edit Product"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(p.id)}
                                  className="p-1.5 text-neutral-500 hover:text-red-400 transition-colors"
                                  title="Delete Product"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: ORDERS & STATUS MANAGEMENT */}
              {activeTab === 'orders' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-serif-luxury uppercase tracking-wider text-white">
                      Customer Consignments & Orders
                    </h2>
                    <p className="text-xs text-neutral-400 font-light mt-1">
                      Update order lifecycle (Pending, Confirmed, Shipped, Delivered), verify payment TID slips, and attach courier tracking.
                    </p>
                  </div>

                  {selectedOrder ? (
                    /* Inspect & Update Order Details */
                    <div className="bg-neutral-900/60 border border-neutral-800 p-6 space-y-6">
                      <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
                        <div>
                          <span className="text-[10px] uppercase tracking-widest text-neutral-400">Inspecting Consignment</span>
                          <h3 className="font-mono text-lg text-white font-bold">{selectedOrder.orderNumber}</h3>
                        </div>
                        <button
                          onClick={() => setSelectedOrder(null)}
                          className="text-xs uppercase tracking-wider text-neutral-400 hover:text-white"
                        >
                          &larr; Back to Order List
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                        {/* Customer & Delivery */}
                        <div className="space-y-3 bg-black/60 p-4 border border-neutral-800">
                          <h4 className="text-[11px] uppercase tracking-widest text-neutral-400 font-medium">Customer Information</h4>
                          <div className="text-neutral-300">Name: <span className="text-white font-medium">{selectedOrder.customer.fullName}</span></div>
                          <div className="text-neutral-300">Email: <span className="text-white font-mono">{selectedOrder.customer.email}</span></div>
                          <div className="text-neutral-300">Phone: <span className="text-white font-mono">{selectedOrder.customer.phone}</span></div>
                          <div className="text-neutral-300">Address: <span className="text-white">{selectedOrder.customer.address}, {selectedOrder.customer.city}</span></div>
                          {selectedOrder.customer.notes && (
                            <div className="text-neutral-400">Notes: <i>{selectedOrder.customer.notes}</i></div>
                          )}
                        </div>

                        {/* Payment & Verification */}
                        <div className="space-y-3 bg-black/60 p-4 border border-neutral-800">
                          <h4 className="text-[11px] uppercase tracking-widest text-neutral-400 font-medium">Payment Verification</h4>
                          <div className="text-neutral-300">Method: <span className="text-white uppercase font-bold">{selectedOrder.paymentMethod}</span></div>
                          {selectedOrder.paymentDetails?.transactionId && (
                            <div className="text-neutral-300">
                              TID / Ref: <span className="text-white font-mono font-bold bg-neutral-900 px-2 py-0.5 border border-neutral-700">{selectedOrder.paymentDetails.transactionId}</span>
                            </div>
                          )}
                          {selectedOrder.paymentDetails?.senderNumber && (
                            <div className="text-neutral-300">Sender Phone: <span className="text-white font-mono">{selectedOrder.paymentDetails.senderNumber}</span></div>
                          )}
                          {selectedOrder.paymentDetails?.cardLast4 && (
                            <div className="text-neutral-300">Card Last 4: <span className="text-white font-mono">•••• {selectedOrder.paymentDetails.cardLast4}</span></div>
                          )}
                          <div className="text-neutral-300">Total Billed: <span className="text-white font-bold font-mono text-sm">{currencySymbol}{selectedOrder.total.toLocaleString()}</span></div>
                        </div>
                      </div>

                      {/* Items */}
                      <div>
                        <h4 className="text-[11px] uppercase tracking-widest text-neutral-400 font-medium mb-2">Order Line Items</h4>
                        <div className="divide-y divide-neutral-900 border border-neutral-900 bg-black">
                          {selectedOrder.items.map((it, idx) => (
                            <div key={idx} className="p-3 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-3">
                                <img src={it.productImage} alt="" className="w-10 h-12 object-cover border border-neutral-800" />
                                <div>
                                  <div className="text-white font-medium">{it.productName}</div>
                                  <div className="text-neutral-500 font-mono text-[10px]">Size: {it.size} · Qty: {it.quantity}</div>
                                </div>
                              </div>
                              <span className="font-mono text-white tabular-nums">
                                {currencySymbol}{(it.price * it.quantity).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Status Update Control */}
                      <div className="bg-black p-4 border border-neutral-800 space-y-4">
                        <h4 className="text-[11px] uppercase tracking-widest text-neutral-300 font-medium">
                          Update Order Lifecycle & Courier Details
                        </h4>

                        {selectedOrder && <PaymentStatusControl token={adminToken} order={selectedOrder} onDone={fetchAdminData} />}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <div>
                            <label className="block text-[10px] uppercase text-neutral-500 mb-1">Status</label>
                            <select
                              value={orderStatusUpdate}
                              onChange={e => setOrderStatusUpdate(e.target.value as OrderStatus)}
                              className="w-full bg-neutral-900 border border-neutral-700 p-2 text-white font-mono"
                            >
                              <option value="Pending">Pending (Received)</option>
                              <option value="Confirmed">Confirmed (Paid/Verified)</option>
                              <option value="Shipped">Shipped (In Transit)</option>
                              <option value="Delivered">Delivered (Completed)</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] uppercase text-neutral-500 mb-1">Courier Carrier</label>
                            <input
                              type="text"
                              value={carrierInput}
                              onChange={e => setCarrierInput(e.target.value)}
                              placeholder="e.g. Leopards Express / TCS / DHL"
                              className="w-full bg-neutral-900 border border-neutral-700 p-2 text-white"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] uppercase text-neutral-500 mb-1">Tracking Number</label>
                            <input
                              type="text"
                              value={trackingNumberInput}
                              onChange={e => setTrackingNumberInput(e.target.value)}
                              placeholder="e.g. LPD-992140239PK"
                              className="w-full bg-neutral-900 border border-neutral-700 p-2 text-white font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase text-neutral-500 mb-1">Audit Log Note</label>
                          <input
                            type="text"
                            value={statusNoteInput}
                            onChange={e => setStatusNoteInput(e.target.value)}
                            placeholder="e.g. Payment verified via JazzCash ledger. Handed over to courier hub."
                            className="w-full bg-neutral-900 border border-neutral-700 p-2 text-white"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handleUpdateOrderStatus}
                          className="px-6 py-2.5 bg-white text-black text-xs uppercase tracking-widest font-medium hover:bg-neutral-200 transition-colors"
                        >
                          Commit Status Update
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Orders Table */
                    <div className="bg-neutral-900/30 border border-neutral-800 overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-neutral-900/80 text-neutral-400 border-b border-neutral-800 text-[10px] uppercase tracking-wider font-mono">
                          <tr>
                            <th className="p-3">Order Number</th>
                            <th className="p-3">Customer</th>
                            <th className="p-3">Contact</th>
                            <th className="p-3">Payment</th>
                            <th className="p-3">Total</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-900 font-mono">
                          {orders.map(ord => (
                            <tr key={ord.id} className="hover:bg-neutral-900/50">
                              <td className="p-3 text-white font-bold">{ord.orderNumber}</td>
                              <td className="p-3 text-neutral-200">{ord.customer.fullName}</td>
                              <td className="p-3 text-neutral-400 text-[11px]">{ord.customer.phone}</td>
                              <td className="p-3 uppercase text-neutral-300">{ord.paymentMethod}</td>
                              <td className="p-3 text-white font-bold tabular-nums">
                                {currencySymbol}{ord.total.toLocaleString()}
                              </td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 bg-neutral-800 text-white text-[10px]">
                                  {ord.status}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => {
                                    setSelectedOrder(ord);
                                    setOrderStatusUpdate(ord.status);
                                    setCarrierInput(ord.carrier || '');
                                    setTrackingNumberInput(ord.trackingNumber || '');
                                  }}
                                  className="px-3 py-1 bg-white text-black text-[10px] uppercase tracking-wider hover:bg-neutral-200 transition-colors"
                                >
                                  Inspect & Update
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: HOMEPAGE CINEMATIC VIDEO */}
              {activeTab === 'video' && (
                <div className="space-y-6 max-w-3xl">
                  <div>
                    <h2 className="text-xl font-serif-luxury uppercase tracking-wider text-white">
                      Cinematic Homepage Video Config
                    </h2>
                    <p className="text-xs text-neutral-400 font-light mt-1">
                      Upload, replace, enable or disable the full-screen cinematic video opening for the storefront.
                    </p>
                  </div>

                  {videoSavedNotice && (
                    <div className="p-3 bg-neutral-900 border border-neutral-700 text-neutral-200 text-xs flex items-center gap-2">
                      <Check className="w-4 h-4 text-white" />
                      <span>Cinematic video configuration successfully updated in database.</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveVideo} className="space-y-4 text-xs">
                    <div className="p-4 bg-neutral-900/60 border border-neutral-800">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={videoConfig.enabled}
                          onChange={e => setVideoConfig({ ...videoConfig, enabled: e.target.checked })}
                          className="accent-white w-4 h-4"
                        />
                        <div>
                          <div className="text-white font-medium text-xs uppercase tracking-wider">
                            Enable Full-Screen Video Opener on Entry
                          </div>
                          <div className="text-[10px] text-neutral-400">
                            Plays on initial visit with skip button and audio controls.
                          </div>
                        </div>
                      </label>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-neutral-400 mb-1">
                        Video Source URL (MP4 / WebM direct stream)
                      </label>
                      <input
                        type="url"
                        required
                        value={videoConfig.videoUrl}
                        onChange={e => setVideoConfig({ ...videoConfig, videoUrl: e.target.value })}
                        placeholder="https://.../video.mp4"
                        className="w-full bg-black border border-neutral-800 p-2.5 text-white font-mono"
                      />
                      <div className="flex gap-2 flex-wrap mt-2">
                        <MediaUploadButton token={adminToken} folder="video" label="Upload / replace video (MP4 or WebM, max 50 MB)" accept="video/mp4,video/webm" onUploaded={handleVideoUploaded} />
                        <button type="button" onClick={handleDeleteVideo} className="px-4 py-2 bg-neutral-800 text-white text-xs uppercase tracking-wider hover:bg-neutral-700">Delete video</button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-neutral-400 mb-1">
                          Campaign Title Overlay
                        </label>
                        <input
                          type="text"
                          value={videoConfig.title}
                          onChange={e => setVideoConfig({ ...videoConfig, title: e.target.value })}
                          className="w-full bg-black border border-neutral-800 p-2 text-white font-serif-luxury"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-neutral-400 mb-1">
                          Subtitle & Season Label
                        </label>
                        <input
                          type="text"
                          value={videoConfig.subtitle}
                          onChange={e => setVideoConfig({ ...videoConfig, subtitle: e.target.value })}
                          className="w-full bg-black border border-neutral-800 p-2 text-white uppercase font-mono text-[11px]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-neutral-400 mb-1">
                        Enter Button Label
                      </label>
                      <input
                        type="text"
                        value={videoConfig.buttonText}
                        onChange={e => setVideoConfig({ ...videoConfig, buttonText: e.target.value })}
                        className="w-full bg-black border border-neutral-800 p-2 text-white"
                      />
                    </div>

                    {/* Video Live Preview */}
                    <div className="p-4 bg-black border border-neutral-800">
                      <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-2">Live Video Stream Preview</div>
                      <div className="aspect-video w-full bg-neutral-900 overflow-hidden relative flex items-center justify-center">
                        {!videoPreviewError && videoConfig.videoUrl ? (
                          <video
                            key={videoConfig.videoUrl}
                            src={videoConfig.videoUrl}
                            autoPlay
                            muted
                            loop
                            playsInline
                            onError={() => setVideoPreviewError(true)}
                            className="w-full h-full object-cover filter grayscale"
                          />
                        ) : (
                          <div className="text-center p-6 text-neutral-500 text-xs font-mono">
                            [Atmospheric Monochrome Editorial Fallback Active]
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="px-6 py-3 bg-white text-black text-xs uppercase tracking-widest font-medium hover:bg-neutral-200 transition-colors"
                    >
                      Save Video Preferences
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 5: STORE SETTINGS & PAYMENT ACCOUNTS */}
              {activeTab === 'categories' && <CategoriesTab token={adminToken} onChanged={onRefreshData} />}
              {activeTab === 'content' && <ContentTab token={adminToken} onSaved={onRefreshData} />}

              {activeTab === 'settings' && (
                <div className="space-y-6 max-w-3xl">
                  <div>
                    <h2 className="text-xl font-serif-luxury uppercase tracking-wider text-white">
                      Store Branding & Payment Accounts
                    </h2>
                    <p className="text-xs text-neutral-400 font-light mt-1">
                      Manage JazzCash & Easypaisa account numbers, announcement banner, and social media channels.
                    </p>
                  </div>

                  {settingsSavedNotice && (
                    <div className="p-3 bg-neutral-900 border border-neutral-700 text-neutral-200 text-xs flex items-center gap-2">
                      <Check className="w-4 h-4 text-white" />
                      <span>Atelier store settings successfully committed to database.</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveSettings} className="space-y-6 text-xs">
                    {/* Announcement Banner */}
                    <div className="p-4 bg-neutral-900/60 border border-neutral-800 space-y-3">
                      <h4 className="text-[11px] uppercase tracking-widest text-neutral-300 font-medium">
                        Top Announcement Banner
                      </h4>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={storeSettings.bannerEnabled}
                          onChange={e => setStoreSettings({ ...storeSettings, bannerEnabled: e.target.checked })}
                          className="accent-white"
                        />
                        <span className="text-neutral-300">Display announcement ribbon on top</span>
                      </label>
                      <input
                        type="text"
                        value={storeSettings.announcementBanner}
                        onChange={e => setStoreSettings({ ...storeSettings, announcementBanner: e.target.value })}
                        className="w-full bg-black border border-neutral-700 p-2 text-white text-xs"
                      />
                    </div>

                    {/* JazzCash Account */}
                    <div className="p-4 bg-neutral-900/60 border border-neutral-800 space-y-3">
                      <h4 className="text-[11px] uppercase tracking-widest text-neutral-300 font-medium">
                        JazzCash Merchant Account
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] uppercase text-neutral-500 mb-1">
                            JazzCash Mobile Number
                          </label>
                          <input
                            type="text"
                            value={storeSettings.jazzcashNumber}
                            onChange={e => setStoreSettings({ ...storeSettings, jazzcashNumber: e.target.value })}
                            className="w-full bg-black border border-neutral-700 p-2 text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase text-neutral-500 mb-1">
                            Account Title
                          </label>
                          <input
                            type="text"
                            value={storeSettings.jazzcashTitle}
                            onChange={e => setStoreSettings({ ...storeSettings, jazzcashTitle: e.target.value })}
                            className="w-full bg-black border border-neutral-700 p-2 text-white uppercase font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Easypaisa Account */}
                    <div className="p-4 bg-neutral-900/60 border border-neutral-800 space-y-3">
                      <h4 className="text-[11px] uppercase tracking-widest text-neutral-300 font-medium">
                        Easypaisa Merchant Account
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] uppercase text-neutral-500 mb-1">
                            Easypaisa Mobile Number
                          </label>
                          <input
                            type="text"
                            value={storeSettings.easypaisaNumber}
                            onChange={e => setStoreSettings({ ...storeSettings, easypaisaNumber: e.target.value })}
                            className="w-full bg-black border border-neutral-700 p-2 text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase text-neutral-500 mb-1">
                            Account Title
                          </label>
                          <input
                            type="text"
                            value={storeSettings.easypaisaTitle}
                            onChange={e => setStoreSettings({ ...storeSettings, easypaisaTitle: e.target.value })}
                            className="w-full bg-black border border-neutral-700 p-2 text-white uppercase font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Social Media Links */}
                    <div className="p-4 bg-neutral-900/60 border border-neutral-800 space-y-3">
                      <h4 className="text-[11px] uppercase tracking-widest text-neutral-300 font-medium">
                        Social Media Channels
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] uppercase text-neutral-500 mb-1">Instagram URL</label>
                          <input
                            type="url"
                            value={storeSettings.socialLinks.instagram}
                            onChange={e => setStoreSettings({
                              ...storeSettings,
                              socialLinks: { ...storeSettings.socialLinks, instagram: e.target.value }
                            })}
                            className="w-full bg-black border border-neutral-700 p-2 text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase text-neutral-500 mb-1">Twitter / X URL</label>
                          <input
                            type="url"
                            value={storeSettings.socialLinks.twitter}
                            onChange={e => setStoreSettings({
                              ...storeSettings,
                              socialLinks: { ...storeSettings.socialLinks, twitter: e.target.value }
                            })}
                            className="w-full bg-black border border-neutral-700 p-2 text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase text-neutral-500 mb-1">TikTok URL</label>
                          <input
                            type="url"
                            value={storeSettings.socialLinks.tiktok}
                            onChange={e => setStoreSettings({
                              ...storeSettings,
                              socialLinks: { ...storeSettings.socialLinks, tiktok: e.target.value }
                            })}
                            className="w-full bg-black border border-neutral-700 p-2 text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase text-neutral-500 mb-1">WhatsApp Concierge</label>
                          <input
                            type="text"
                            value={storeSettings.socialLinks.whatsapp}
                            onChange={e => setStoreSettings({
                              ...storeSettings,
                              socialLinks: { ...storeSettings.socialLinks, whatsapp: e.target.value }
                            })}
                            className="w-full bg-black border border-neutral-700 p-2 text-white font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="px-6 py-3 bg-white text-black text-xs uppercase tracking-widest font-medium hover:bg-neutral-200 transition-colors"
                    >
                      Save Store Configurations
                    </button>
                  </form>
                </div>
              )}
            </main>
          </div>
        )}
      </div>
    </div>
  );
};

// Wrapper keeps hooks out of the early return (React rules of hooks).
export const AdminPanel: React.FC<AdminPanelProps> = props => (props.isOpen ? <AdminPanelInner {...props} /> : null);
