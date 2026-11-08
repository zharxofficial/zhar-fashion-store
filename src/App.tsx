import React, { useState, useEffect, useMemo } from 'react';
import { Product, CartItem, Order, User, StoreSettings, Category, Gender } from './types/index.ts';
import { Navbar } from './components/Navbar.tsx';
import { CinematicVideoOpener } from './components/CinematicVideoOpener.tsx';
import { PromoSections } from './components/PromoSections.tsx';
import { ProductCard } from './components/ProductCard.tsx';
import { ProductModal } from './components/ProductModal.tsx';
import { CartDrawer } from './components/CartDrawer.tsx';
import { CheckoutModal } from './components/CheckoutModal.tsx';
import { OrderTrackingModal } from './components/OrderTrackingModal.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { CustomerOrdersModal } from './components/CustomerOrdersModal.tsx';
import { AdminPanel } from './components/AdminPanel.tsx';
import { Footer } from './components/Footer.tsx';
import { ZharLogo } from './components/ZharLogo.tsx';
import {
  ArrowRight, Search, SlidersHorizontal, Sparkles, Shield,
  Truck, ArrowUpRight, Check, X, RotateCcw, Play
} from 'lucide-react';

export default function App() {
  // State: Data
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<StoreSettings>({
    announcementBanner: 'Complimentary white-glove delivery on orders above PKR 25,000 / $150 — Atelier private viewings open.',
    bannerEnabled: true,
    jazzcashNumber: '',
    jazzcashTitle: 'ZHĀR LUXURY ATELIER (PVT) LTD',
    easypaisaNumber: '',
    easypaisaTitle: 'ZHĀR HAUTE COUTURE',
    socialLinks: {
      instagram: 'https://instagram.com/zhar.atelier',
      twitter: 'https://x.com/zhar_luxury',
      tiktok: 'https://tiktok.com/@zharatelier',
      whatsapp: '+92 301 8492044'
    },
    homepageVideo: {
      enabled: true,
      videoUrl: '/videos/zhar_fashion_film.mp4',
      title: 'THE MONOCHROME MANIFESTO',
      subtitle: 'ÉDITION NOIR 2026 // HAUTE ATELIER',
      buttonText: 'Enter Atelier'
    },
    theme: {
      primaryColor: '#000000',
      accentColor: '#ffffff',
      fontStyle: 'Bodoni Moda & Cinzel'
    },
    currency: 'PKR',
    currencySymbol: 'PKR '
  });

  // State: Cinematic Opener
  const [showVideoOpener, setShowVideoOpener] = useState<boolean>(() => {
    // If user explicitly navigated to /admin, don't show video
    if (window.location.pathname === '/admin') return false;
    const hasSeen = sessionStorage.getItem('zhar_has_seen_video');
    return !hasSeen;
  });

  // State: Navigation / Current View
  const [activeTab, setActiveTab] = useState<string>('home'); // 'home' | 'all' | 'men' | 'women' | 'new' | 'sale'
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedGender, setSelectedGender] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchBarOpen, setSearchBarOpen] = useState<boolean>(false);
  const [sortOption, setSortOption] = useState<string>('featured');

  // State: Modals & Drawers
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState<boolean>(false);
  const [trackingOrderNumber, setTrackingOrderNumber] = useState<string>('');
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState<boolean>(false);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(() => window.location.pathname === '/admin');

  // State: User & Cart
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('zhar_customer_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem('zhar_cart');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Save cart to localStorage
  useEffect(() => {
    localStorage.setItem('zhar_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  // Handle URL path changes (e.g. /admin)
  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname === '/admin') {
        setIsAdminOpen(true);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Fetch products & settings from backend
  const fetchData = async () => {
    try {
      const [prodRes, settRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/settings')
      ]);

      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData.products || []);
      }

      if (settRes.ok) {
        const settData = await settRes.json();
        setSettings(settData);
      }
    } catch (err) {
      console.error('Failed to load initial atelier data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Cart Handlers
  const handleAddToCart = (product: Product, size: string, quantity: number) => {
    setCartItems(prev => {
      const existingIdx = prev.findIndex(
        item => item.product.id === product.id && item.size === size
      );

      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += quantity;
        return updated;
      } else {
        return [...prev, { product, size, quantity }];
      }
    });
    setIsCartOpen(true);
  };

  const handleUpdateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    setCartItems(prev => {
      const updated = [...prev];
      updated[index].quantity = newQty;
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleQuickAdd = (product: Product) => {
    const defaultSize = product.sizes && product.sizes.length > 0 ? product.sizes[0] : 'Standard';
    handleAddToCart(product, defaultSize, 1);
  };

  const handleOrderSuccess = (_order: Order) => {
    setCartItems([]);
    fetchData(); // refresh product stocks
  };

  const handleDismissVideo = () => {
    setShowVideoOpener(false);
    sessionStorage.setItem('zhar_has_seen_video', 'true');
  };

  const handleReplayFilm = () => {
    setShowVideoOpener(true);
  };

  // Filtered Products computation
  const filteredProducts = useMemo(() => {
    let list = [...products];

    // Nav Tab routing
    if (activeTab === 'men') {
      list = list.filter(p => p.gender === 'Men' || p.gender === 'Unisex');
    } else if (activeTab === 'women') {
      list = list.filter(p => p.gender === 'Women' || p.gender === 'Unisex');
    } else if (activeTab === 'new') {
      list = list.filter(p => p.isNewArrival);
    } else if (activeTab === 'sale') {
      list = list.filter(p => p.isSale);
    }

    // Category filter
    if (selectedCategory !== 'All') {
      list = list.filter(p => p.category.toLowerCase() === selectedCategory.toLowerCase());
    }

    // Department filter
    if (selectedGender !== 'All') {
      list = list.filter(p => p.gender === selectedGender || p.gender === 'Unisex');
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortOption === 'price-asc') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortOption === 'price-desc') {
      list.sort((a, b) => b.price - a.price);
    } else if (sortOption === 'newest') {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return list;
  }, [products, activeTab, selectedCategory, selectedGender, searchQuery, sortOption]);

  // Featured and Sale slices for Homepage
  const featuredProducts = useMemo(() => products.filter(p => p.isFeatured).slice(0, 4), [products]);
  const newArrivals = useMemo(() => products.filter(p => p.isNewArrival).slice(0, 4), [products]);
  const saleProducts = useMemo(() => products.filter(p => p.isSale).slice(0, 4), [products]);

  const [categoryNames, setCategoryNames] = useState<string[]>(['T-Shirts', 'Hoodies', 'Jackets', 'Perfumes', 'Watches', 'Shoes', 'Accessories']);
  useEffect(() => {
    fetch('/api/categories').then(r => (r.ok ? r.json() : [])).then((d: { name: string }[]) => { if (d.length) setCategoryNames(d.map(c => c.name)); }).catch(() => {});
  }, []);
  const allCategories: Category[] = categoryNames;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-white selection:text-black">
      {/* Full-Screen Cinematic Opening Video */}
      {showVideoOpener && settings.homepageVideo.enabled && (
        <CinematicVideoOpener
          onComplete={handleDismissVideo}
          videoUrl={settings.homepageVideo.videoUrl}
          title={settings.homepageVideo.title}
          subtitle={settings.homepageVideo.subtitle}
          buttonText={settings.homepageVideo.buttonText}
        />
      )}

      {/* Top Navbar */}
      <Navbar
        cartCount={cartItems.reduce((s, i) => s + i.quantity, 0)}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenSearch={() => setSearchBarOpen(!searchBarOpen)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenTracking={() => setIsTrackingOpen(true)}
        onOpenAdmin={() => {
          setIsAdminOpen(true);
          window.history.pushState({}, '', '/admin');
        }}
        onReplayFilm={handleReplayFilm}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSelectedCategory('All');
        }}
        announcementText={settings.announcementBanner}
        announcementEnabled={settings.bannerEnabled}
      />

      {/* Expandable Global Search Bar */}
      {searchBarOpen && (
        <div className="bg-neutral-950 border-b border-neutral-800 px-4 py-4 animate-fadeIn">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <Search className="w-4 h-4 text-neutral-500 shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Search by garment, silhouette, fragrance notes, or SKU..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                if (activeTab === 'home') setActiveTab('all');
              }}
              className="w-full bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-neutral-500 hover:text-white text-xs uppercase"
              >
                Clear
              </button>
            )}
            <button
              onClick={() => setSearchBarOpen(false)}
              className="p-1 text-neutral-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* MAIN VIEW CONTENT */}
      <main className="flex-1">
        {activeTab === 'home' ? (
          /* HOMEPAGE VIEW */
          <div className="flex flex-col gap-24">
            {/* Hero Campaign Showcase */}
            <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden border-b border-neutral-900 bg-neutral-950">
              {/* Background Luxury Image / Scrim */}
              <div className="absolute inset-0 z-0">
                <img
                  src="/images/zhar_luxury_jacket_1794080538698.jpg"
                  alt="ZHĀR Campaign Editorial"
                  className="w-full h-full object-cover object-center filter grayscale contrast-125 brightness-40 scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute inset-0 film-grain pointer-events-none" />
              </div>

              {/* Centered Editorial Copy */}
              <div className="relative z-10 max-w-4xl mx-auto px-6 py-24 text-center flex flex-col items-center">
                <div className="inline-flex items-center gap-3 text-[11px] tracking-[0.4em] uppercase text-neutral-400 mb-6 font-light">
                  <span>AUTUMN / WINTER 2026</span>
                  <span aria-hidden="true">·</span>
                  <span>LIMITED NUMBERED ALLOCATIONS</span>
                </div>

                <h1 className="text-4xl sm:text-6xl md:text-8xl font-serif-luxury font-normal uppercase tracking-tight text-white mb-6 leading-none">
                  L'OBSCURITÉ DU LUXE
                </h1>

                <div className="w-16 h-[1px] bg-white/40 my-8" />

                <div className="flex flex-wrap items-center justify-center gap-4">
                  <button
                    onClick={() => {
                      setActiveTab('all');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-8 py-3.5 bg-white text-black text-xs uppercase tracking-[0.25em] font-medium hover:bg-neutral-200 transition-all flex items-center gap-2 group shadow-2xl"
                  >
                    <span>Explore Atelier Archive</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('sale');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-8 py-3.5 bg-black/60 backdrop-blur-md border border-neutral-700 text-white text-xs uppercase tracking-[0.25em] hover:border-white transition-all"
                  >
                    Atelier Privileges
                  </button>
                </div>
              </div>

              {/* Replay Video Trigger Badge */}
              <div className="absolute bottom-6 right-6 z-10 hidden sm:block">
                <button
                  onClick={handleReplayFilm}
                  className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-neutral-400 hover:text-white transition-colors bg-black/70 backdrop-blur-md px-3 py-1.5 border border-neutral-800"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Cinematic Film</span>
                </button>
              </div>
            </section>

            {/* Categories Showcase Strip */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <div className="flex items-center justify-between mb-8 border-b border-neutral-900 pb-4">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.3em] text-neutral-500 block font-light">
                    DISCIPLINES
                  </span>
                  <h2 className="text-lg uppercase tracking-[0.2em] font-medium text-white">
                    Explore By Atelier Category
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setActiveTab('all');
                    setSelectedCategory('All');
                  }}
                  className="text-xs uppercase tracking-widest text-neutral-400 hover:text-white underline underline-offset-4"
                >
                  View All Pieces &rarr;
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {allCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => {
                      setActiveTab('all');
                      setSelectedCategory(cat);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="p-4 bg-neutral-950 border border-neutral-900 hover:border-neutral-700 transition-all text-left flex flex-col justify-between group h-28"
                  >
                    <span className="text-[10px] font-mono text-neutral-600 group-hover:text-neutral-400 transition-colors">
                      CAT // 0{allCategories.indexOf(cat) + 1}
                    </span>
                    <span className="text-xs uppercase tracking-wider font-medium text-neutral-200 group-hover:text-white">
                      {cat}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* New Arrivals Section */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <div className="flex items-center justify-between mb-8 border-b border-neutral-900 pb-4">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.3em] text-neutral-500 block font-light">
                    JUST UNVEILED
                  </span>
                  <h2 className="text-xl font-serif-luxury uppercase tracking-wider text-white">
                    New Arrivals
                  </h2>
                </div>
                <button
                  onClick={() => setActiveTab('new')}
                  className="text-xs uppercase tracking-widest text-neutral-400 hover:text-white underline underline-offset-4"
                >
                  Inspect All New ({newArrivals.length}) &rarr;
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {newArrivals.map(prod => (
                  <ProductCard
                    key={prod.id}
                    product={prod}
                    onSelect={p => setSelectedProduct(p)}
                    onQuickAdd={handleQuickAdd}
                    currencySymbol={settings.currencySymbol}
                  />
                ))}
              </div>
            </section>

            {/* Featured Collection Spotlight */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <div className="flex items-center justify-between mb-8 border-b border-neutral-900 pb-4">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.3em] text-neutral-500 block font-light">
                    CURATED SELECTION
                  </span>
                  <h2 className="text-xl font-serif-luxury uppercase tracking-wider text-white">
                    Featured Masterpieces
                  </h2>
                </div>
                <button
                  onClick={() => setActiveTab('all')}
                  className="text-xs uppercase tracking-widest text-neutral-400 hover:text-white underline underline-offset-4"
                >
                  Full Catalog &rarr;
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {featuredProducts.map(prod => (
                  <ProductCard
                    key={prod.id}
                    product={prod}
                    onSelect={p => setSelectedProduct(p)}
                    onQuickAdd={handleQuickAdd}
                    currencySymbol={settings.currencySymbol}
                  />
                ))}
              </div>
            </section>

            {/* Atelier Sale Section */}
            {saleProducts.length > 0 && (
              <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                <div className="flex items-center justify-between mb-8 border-b border-neutral-900 pb-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.3em] text-neutral-500 block font-light">
                      ATELIER PRIVILEGES
                    </span>
                    <h2 className="text-xl font-serif-luxury uppercase tracking-wider text-white">
                      Sale & Archive Editions
                    </h2>
                  </div>
                  <button
                    onClick={() => setActiveTab('sale')}
                    className="text-xs uppercase tracking-widest text-neutral-400 hover:text-white underline underline-offset-4"
                  >
                    View Sale ({saleProducts.length}) &rarr;
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {saleProducts.map(prod => (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      onSelect={p => setSelectedProduct(p)}
                      onQuickAdd={handleQuickAdd}
                      currencySymbol={settings.currencySymbol}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Craftsmanship & Atelier Manifesto Banner */}
            <section className="bg-neutral-950 border-y border-neutral-900 py-20">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
                  <div className="flex flex-col gap-3">
                    <span className="font-mono text-xs text-neutral-500 uppercase tracking-widest">
                      01. Provenance
                    </span>
                    <h3 className="text-base font-serif-luxury uppercase tracking-wider text-white">
                      Virgin Cashmere & Tuscan Bridle
                    </h3>
                    <p className="text-xs text-neutral-400 font-light leading-relaxed">
                      We source triple-weight Melton wool from Biella, Italy, and full-grain vegetable-tanned bridle hide from artisanal tanneries in Tuscany.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <span className="font-mono text-xs text-neutral-500 uppercase tracking-widest">
                      02. Olfactory Purity
                    </span>
                    <h3 className="text-base font-serif-luxury uppercase tracking-wider text-white">
                      38% Extrait Concentration
                    </h3>
                    <p className="text-xs text-neutral-400 font-light leading-relaxed">
                      Compounded in Grasse, France with aged wild agarwood and cold-pressed incense, macerated for 90 days before monolithic bottling.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <span className="font-mono text-xs text-neutral-500 uppercase tracking-widest">
                      03. White-Glove Care
                    </span>
                    <h3 className="text-base font-serif-luxury uppercase tracking-wider text-white">
                      Secure Direct Fulfillment
                    </h3>
                    <p className="text-xs text-neutral-400 font-light leading-relaxed">
                      Nationwide delivery via verified courier with Cash on Delivery, JazzCash and Easypaisa manual ledger verification.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        ) : (
          /* SHOPPING & CATALOG VIEW */
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            {/* View Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-neutral-900 mb-8">
              <div>
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-neutral-500 font-light mb-2">
                  <span>ATELIER CATALOG</span>
                  <span aria-hidden="true">/</span>
                  <span className="text-white">
                    {activeTab === 'all'
                      ? 'Shop All'
                      : activeTab === 'men'
                      ? 'Men’s Collection'
                      : activeTab === 'women'
                      ? 'Women’s Collection'
                      : activeTab === 'new'
                      ? 'New Arrivals'
                      : 'Atelier Sale'}
                  </span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-serif-luxury uppercase tracking-tight text-white">
                  {selectedCategory === 'All' ? 'Curated Collection' : selectedCategory}
                </h1>
              </div>

              {/* Result Count & Sorting */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                <span className="text-neutral-500 tabular-nums">
                  Showing {filteredProducts.length} pieces
                </span>

                <div className="flex items-center border border-neutral-800 bg-neutral-950 px-3 py-1.5">
                  <span className="text-neutral-500 uppercase mr-2 text-[10px]">Sort:</span>
                  <select
                    value={sortOption}
                    onChange={e => setSortOption(e.target.value)}
                    className="bg-transparent text-white focus:outline-none cursor-pointer text-xs"
                  >
                    <option value="featured" className="bg-black">Featured</option>
                    <option value="newest" className="bg-black">Newest</option>
                    <option value="price-asc" className="bg-black">Price: Low to High</option>
                    <option value="price-desc" className="bg-black">Price: High to Low</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Filter Navigation Bar */}
            <div className="flex flex-col gap-4 mb-8">
              {/* Category Filter Buttons */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none text-xs">
                <button
                  onClick={() => setSelectedCategory('All')}
                  className={`px-4 py-2 uppercase tracking-wider font-mono transition-colors whitespace-nowrap ${
                    selectedCategory === 'All'
                      ? 'bg-white text-black'
                      : 'bg-neutral-900/60 text-neutral-400 hover:text-white border border-neutral-800'
                  }`}
                >
                  All Categories
                </button>
                {allCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 uppercase tracking-wider font-mono transition-colors whitespace-nowrap ${
                      selectedCategory === cat
                        ? 'bg-white text-black'
                        : 'bg-neutral-900/60 text-neutral-400 hover:text-white border border-neutral-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Department / Gender sub-filter if not in men/women tab */}
              {activeTab !== 'men' && activeTab !== 'women' && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-neutral-500 uppercase tracking-widest text-[10px] mr-2">Department:</span>
                  {['All', 'Men', 'Women', 'Unisex'].map(g => (
                    <button
                      key={g}
                      onClick={() => setSelectedGender(g)}
                      className={`px-3 py-1 text-xs transition-colors ${
                        selectedGender === g
                          ? 'text-white border-b border-white font-medium'
                          : 'text-neutral-500 hover:text-neutral-300'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Grid */}
            {filteredProducts.length === 0 ? (
              <div className="py-24 text-center flex flex-col items-center border border-neutral-900 bg-neutral-950/40 p-8">
                <p className="text-sm uppercase tracking-widest text-neutral-400 mb-2">
                  No matching garments found
                </p>
                <p className="text-xs text-neutral-600 max-w-sm mb-6">
                  Try adjusting your search query or selecting a different atelier category.
                </p>
                <button
                  onClick={() => {
                    setSelectedCategory('All');
                    setSelectedGender('All');
                    setSearchQuery('');
                  }}
                  className="px-6 py-2.5 bg-white text-black text-xs uppercase tracking-widest font-medium hover:bg-neutral-200 transition-colors"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map(prod => (
                  <ProductCard
                    key={prod.id}
                    product={prod}
                    onSelect={p => setSelectedProduct(p)}
                    onQuickAdd={handleQuickAdd}
                    currencySymbol={settings.currencySymbol}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <PromoSections settings={settings} />

      {/* FOOTER */}
      <Footer
        settings={settings}
        onOpenTracking={() => setIsTrackingOpen(true)}
        onOpenAdmin={() => {
          setIsAdminOpen(true);
          window.history.pushState({}, '', '/admin');
        }}
        onOpenShop={(cat) => {
          setActiveTab('all');
          if (cat) setSelectedCategory(cat);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* MODALS & DRAWERS */}
      {/* 1. Product Detail Modal */}
      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        currencySymbol={settings.currencySymbol}
      />

      {/* 2. Shopping Bag Slide-Over Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
        currencySymbol={settings.currencySymbol}
      />

      {/* 3. Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cartItems}
        settings={settings}
        onOrderSuccess={handleOrderSuccess}
        currencySymbol={settings.currencySymbol}
      />

      {/* 4. Order Tracking Modal */}
      <OrderTrackingModal
        isOpen={isTrackingOpen}
        onClose={() => {
          setIsTrackingOpen(false);
          setTrackingOrderNumber('');
        }}
        initialOrderNumber={trackingOrderNumber}
        currencySymbol={settings.currencySymbol}
      />

      {/* 5. Customer Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={currentUser}
        onLoginSuccess={(user, token, isAdmin) => {
          setCurrentUser(user);
          localStorage.setItem('zhar_customer_token', token || '');
          if (isAdmin) localStorage.setItem('zhar_admin_token', token || '');
          localStorage.setItem('zhar_customer_user', JSON.stringify(user));
          if (isAdmin) {
            setIsAdminOpen(true);
            window.history.pushState({}, '', '/admin');
          }
        }}
        onLogout={() => {
          setCurrentUser(null);
          fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('zhar_customer_token') || ''}` } }).catch(() => {});
          localStorage.removeItem('zhar_customer_user');
          localStorage.removeItem('zhar_customer_token');
          localStorage.removeItem('zhar_admin_token');
        }}
        onOpenOrderHistory={() => setIsOrdersOpen(true)}
        onOpenAdmin={() => {
          setIsAdminOpen(true);
          window.history.pushState({}, '', '/admin');
        }}
      />

      {/* 6. Customer Past Orders Modal */}
      <CustomerOrdersModal
        isOpen={isOrdersOpen}
        onClose={() => setIsOrdersOpen(false)}
        currentUser={currentUser}
        onSelectTrackOrder={(ordNum) => {
          setTrackingOrderNumber(ordNum);
          setIsTrackingOpen(true);
        }}
        currencySymbol={settings.currencySymbol}
      />

      {/* 7. Executive Admin Panel (/admin) */}
      <AdminPanel
        isOpen={isAdminOpen}
        onClose={() => {
          setIsAdminOpen(false);
          if (window.location.pathname === '/admin') {
            window.history.pushState({}, '', '/');
          }
        }}
        products={products}
        settings={settings}
        onRefreshData={fetchData}
        currencySymbol={settings.currencySymbol}
      />
    </div>
  );
}
