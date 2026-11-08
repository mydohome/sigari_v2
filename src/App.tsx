import React, { useState, useEffect, useCallback } from "react";
import { Navbar } from "./components/Navbar";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { DashboardTab } from "./components/DashboardTab";
import { HumidorTab } from "./components/HumidorTab";
import { PricesTab } from "./components/PricesTab";
import { FumateTab } from "./components/FumateTab";
import { TastingNotesTab } from "./components/TastingNotesTab";
import { WishlistTab } from "./components/WishlistTab";
import { WikiTab } from "./components/WikiTab";
import { SettingsTab } from "./components/SettingsTab";
import { FumataModal } from "./components/modals/FumataModal";
import { PurchaseModal } from "./components/modals/PurchaseModal";
import { PriceHistoryModal } from "./components/modals/PriceHistoryModal";
import { AIReviewModal } from "./components/modals/AIReviewModal";
import { EditHumidorItemModal } from "./components/modals/EditHumidorItemModal";
import {
  Product,
  HumidorItem,
  HumidorLocation,
  HumidorShop,
  Fumata,
  TastingReview,
  Favorite,
  WishlistItem,
  HumidorStats,
  BackupInfo,
  PriceHistoryPoint,
} from "./types/cigar";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // App data state
  const [products, setProducts] = useState<Product[]>([]);
  const [humidorItems, setHumidorItems] = useState<HumidorItem[]>([]);
  const [locations, setLocations] = useState<HumidorLocation[]>([]);
  const [shops, setShops] = useState<HumidorShop[]>([]);
  const [fumate, setFumate] = useState<Fumata[]>([]);
  const [reviews, setReviews] = useState<Record<number, TastingReview>>({});
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [stats, setStats] = useState<HumidorStats | null>(null);
  const [backups, setBackups] = useState<BackupInfo[]>([]);

  // Modals state
  const [isFumataModalOpen, setIsFumataModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isAIReviewModalOpen, setIsAIReviewModalOpen] = useState(false);
  const [isEditItemModalOpen, setIsEditItemModalOpen] = useState(false);

  const [selectedProductForHistory, setSelectedProductForHistory] = useState<Product | null>(null);
  const [productHistoryPoints, setProductHistoryPoints] = useState<PriceHistoryPoint[]>([]);
  const [selectedProductForAIReview, setSelectedProductForAIReview] = useState<Product | null>(null);
  const [preSelectedProductForPurchase, setPreSelectedProductForPurchase] = useState<Product | null>(null);
  const [preSelectedItemForFumata, setPreSelectedItemForFumata] = useState<HumidorItem | null>(null);
  const [editingHumidorItem, setEditingHumidorItem] = useState<HumidorItem | null>(null);
  const [editingFumata, setEditingFumata] = useState<Fumata | null>(null);

  // Notification toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Caricamento iniziale dei dati dall'API backend
  const loadData = useCallback(async () => {
    try {
      const [resProd, resItems, resLoc, resShops, resFum, resStats, resFav, resWish, resBack] =
        await Promise.all([
          fetch("/api/prices/search?limit=100").then((r) => r.json()),
          fetch("/api/humidor/items").then((r) => r.json()),
          fetch("/api/humidor/locations").then((r) => r.json()),
          fetch("/api/humidor/shops").then((r) => r.json()),
          fetch("/api/humidor/fumate?limit=60").then((r) => r.json()),
          fetch("/api/humidor/stats").then((r) => r.json()),
          fetch("/api/favorites").then((r) => r.json()),
          fetch("/api/wishlist").then((r) => r.json()),
          fetch("/api/settings/backups").then((r) => r.json()),
        ]);

      if (resProd?.prodotti) setProducts(resProd.prodotti);
      if (resItems?.items) setHumidorItems(resItems.items);
      if (resLoc?.locations) setLocations(resLoc.locations);
      if (resShops?.tabaccherie) setShops(resShops.tabaccherie);
      if (resFum?.fumate) setFumate(resFum.fumate);
      if (resStats) setStats(resStats);
      if (resFav?.preferiti) setFavorites(resFav.preferiti);
      if (resWish?.wishlist) setWishlist(resWish.wishlist);
      if (resBack?.backups) setBackups(resBack.backups);
    } catch (err) {
      console.error("Errore sincronizzazione dati:", err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Gestione Fumata
  const handleFumataSubmit = async (data: any) => {
    try {
      const res = await fetch("/api/humidor/fumate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        showToast("Fumata registrata nel diario!");
        await loadData();
      }
    } catch (err) {
      console.error("Errore salvataggio fumata:", err);
    }
  };

  const handleDeleteFumata = async (id: number) => {
    try {
      const res = await fetch(`/api/humidor/fumate/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Fumata annullata: scorta ripristinata in humidor.");
        await loadData();
      }
    } catch (err) {
      console.error("Errore annullamento fumata:", err);
    }
  };

  const handleUpdateFumata = async (id: number, data: any) => {
    try {
      const res = await fetch(`/api/humidor/fumate/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        showToast("Fumata modificata con successo!");
        await loadData();
      }
    } catch (err) {
      console.error("Errore modifica fumata:", err);
    }
  };

  // Gestione Acquisto / Inserimento Humidor
  const handlePurchaseSubmit = async (data: any) => {
    try {
      const res = await fetch("/api/humidor/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        showToast("Sigari aggiunti all'inventario!");
        await loadData();
      }
    } catch (err) {
      console.error("Errore acquisto:", err);
    }
  };

  const handleDeleteHumidorItem = async (id: number) => {
    if (!window.confirm("Rimuovere questo lotto dall'humidor?")) return;
    try {
      const res = await fetch(`/api/humidor/items/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Lotto rimosso dall'humidor.");
        await loadData();
      }
    } catch (err) {
      console.error("Errore cancellazione:", err);
    }
  };

  const handleUpdateHumidorItem = async (id: number, data: any) => {
    try {
      const res = await fetch(`/api/humidor/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        showToast("Sigaro in humidor aggiornato con successo!");
        await loadData();
      }
    } catch (err) {
      console.error("Errore aggiornamento sigaro humidor:", err);
    }
  };

  const handleUpdateItemQuantity = async (id: number, quantita_rimanente: number) => {
    try {
      const res = await fetch(`/api/humidor/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantita_rimanente }),
      });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error("Errore aggiornamento giacenza:", err);
    }
  };

  const handleMoveLocation = async (id: number, location_id: number) => {
    try {
      const res = await fetch(`/api/humidor/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location_id }),
      });
      if (res.ok) {
        showToast("Sigari spostati nella nuova location.");
        await loadData();
      }
    } catch (err) {
      console.error("Errore spostamento:", err);
    }
  };

  // Storico Prezzi
  const handleOpenHistoryModal = async (product: Product) => {
    setSelectedProductForHistory(product);
    setIsHistoryModalOpen(true);
    try {
      const res = await fetch(`/api/prices/${product.id}/history`);
      const data = await res.json();
      if (data?.storico) setProductHistoryPoints(data.storico);
    } catch (err) {
      console.error("Errore storico:", err);
    }
  };

  // Scheda Degustazione
  const handleSaveReview = async (reviewData: any) => {
    try {
      const res = await fetch("/api/humidor/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reviewData),
      });
      if (res.ok) {
        const d = await res.json();
        setReviews((prev) => ({ ...prev, [reviewData.product_id]: d.review }));
        showToast("Scheda sensoriale salvata!");
      }
    } catch (err) {
      console.error("Errore salvataggio recensione:", err);
    }
  };

  // Preferiti & Wishlist
  const handleToggleFavorite = async (product: Product) => {
    const isFav = favorites.some((f) => f.product_id === product.id);
    if (isFav) {
      await fetch(`/api/favorites/${product.id}`, { method: "DELETE" });
      setFavorites((prev) => prev.filter((f) => f.product_id !== product.id));
      showToast("Rimosso dai preferiti.");
    } else {
      await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: product.id, tag: "Da riprovare" }),
      });
      setFavorites((prev) => [
        ...prev,
        { id: Date.now(), product_id: product.id, product, tag: "Da riprovare", created_at: new Date().toISOString() },
      ]);
      showToast("Aggiunto ai preferiti!");
    }
  };

  const handleUpdateFavoriteTag = async (productId: number, tag: string) => {
    await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: productId, tag }),
    });
    setFavorites((prev) =>
      prev.map((f) => (f.product_id === productId ? { ...f, tag } : f))
    );
    showToast("Tag preferito aggiornato.");
  };

  const handleAddToWishlist = async (product: Product) => {
    await fetch("/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: product.id, quantita: 1 }),
    });
    showToast(`${product.marca} aggiunto alla wishlist!`);
    await loadData();
  };

  const handleUpdateWishlistQty = async (productId: number, quantita: number) => {
    await fetch(`/api/wishlist/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantita }),
    });
    await loadData();
  };

  const handleRemoveFromWishlist = async (productId: number) => {
    await fetch(`/api/wishlist/${productId}`, { method: "DELETE" });
    setWishlist((prev) => prev.filter((w) => w.product_id !== productId));
    showToast("Rimosso dalla wishlist.");
  };

  const handleTransferWishlistToHumidor = (product: Product, qty: number) => {
    setPreSelectedProductForPurchase(product);
    setIsPurchaseModalOpen(true);
  };

  // Server Commands
  const handleRunServerCommand = async (command: string) => {
    const res = await fetch("/api/server/commands/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command }),
    });
    const d = await res.json();
    if (command.includes("scrape") || command.includes("update") || command.includes("backup")) {
      await loadData();
    }
    return d;
  };

  const handleCreateBackup = async () => {
    const res = await fetch("/api/settings/backups", { method: "POST" });
    if (res.ok) {
      showToast("Backup creato con successo!");
      await loadData();
    }
  };

  const handleRestoreBackup = async (filename: string) => {
    const res = await fetch(`/api/settings/backups/${filename}/restore`, { method: "POST" });
    if (res.ok) {
      showToast("Ripristino completato con successo!");
      await loadData();
    }
  };

  const handleDeleteBackup = async (filename: string) => {
    if (!window.confirm(`Eliminare definitivamente ${filename}?`)) return;
    const res = await fetch(`/api/settings/backups/${filename}`, { method: "DELETE" });
    if (res.ok) {
      showToast("Backup eliminato.");
      await loadData();
    }
  };

  const totalInHumidor = humidorItems.reduce((s, i) => s + i.quantita_rimanente, 0);

  return (
    <div className="min-h-screen bg-[#120f0e] text-[#f2ece4] flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenFumataModal={() => {
          setPreSelectedProductForPurchase(null);
          setPreSelectedItemForFumata(null);
          setIsFumataModalOpen(true);
        }}
        onOpenPurchaseModal={() => {
          setPreSelectedProductForPurchase(null);
          setIsPurchaseModalOpen(true);
        }}
        totalInHumidor={totalInHumidor}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 pt-6">
        {activeTab === "dashboard" && (
          <DashboardTab
            stats={stats}
            fumate={fumate}
            items={humidorItems}
            onOpenFumataModal={() => setIsFumataModalOpen(true)}
            onOpenPurchaseModal={() => setIsPurchaseModalOpen(true)}
            onNavigateToHumidor={() => setActiveTab("humidor")}
          />
        )}

        {activeTab === "humidor" && (
          <HumidorTab
            items={humidorItems}
            locations={locations}
            onOpenPurchaseModal={() => {
              setPreSelectedProductForPurchase(null);
              setIsPurchaseModalOpen(true);
            }}
            onOpenFumataForProduct={(item) => {
              setPreSelectedItemForFumata(item);
              setEditingFumata(null);
              setIsFumataModalOpen(true);
            }}
            onOpenTastingNote={(productId) => {
              setActiveTab("degustazione");
            }}
            onOpenEditItem={(item) => {
              setEditingHumidorItem(item);
              setIsEditItemModalOpen(true);
            }}
            onDeleteItem={handleDeleteHumidorItem}
            onUpdateQuantity={handleUpdateItemQuantity}
            onMoveLocation={handleMoveLocation}
          />
        )}

        {activeTab === "prezzi" && (
          <PricesTab
            products={products}
            onOpenHistoryModal={handleOpenHistoryModal}
            onOpenPurchaseModalWithProduct={(product) => {
              setPreSelectedProductForPurchase(product);
              setIsPurchaseModalOpen(true);
            }}
            onToggleFavorite={handleToggleFavorite}
            onAddToWishlist={handleAddToWishlist}
            onOpenAIReview={(product) => {
              setSelectedProductForAIReview(product);
              setIsAIReviewModalOpen(true);
            }}
          />
        )}

        {activeTab === "fumate" && (
          <FumateTab
            fumate={fumate}
            onOpenFumataModal={() => {
              setEditingFumata(null);
              setPreSelectedItemForFumata(null);
              setIsFumataModalOpen(true);
            }}
            onOpenEditFumata={(fum) => {
              setEditingFumata(fum);
              setIsFumataModalOpen(true);
            }}
            onDeleteFumata={handleDeleteFumata}
          />
        )}

        {activeTab === "degustazione" && (
          <TastingNotesTab
            products={products}
            reviews={reviews}
            onSaveReview={handleSaveReview}
            onOpenAIReview={(product) => {
              setSelectedProductForAIReview(product);
              setIsAIReviewModalOpen(true);
            }}
          />
        )}

        {activeTab === "wishlist" && (
          <WishlistTab
            wishlist={wishlist}
            favorites={favorites}
            onUpdateWishlistQty={handleUpdateWishlistQty}
            onRemoveFromWishlist={handleRemoveFromWishlist}
            onRemoveFromFavorites={(productId) => {
              const prod = products.find((p) => p.id === productId);
              if (prod) handleToggleFavorite(prod);
            }}
            onTransferToHumidor={handleTransferWishlistToHumidor}
            onUpdateFavoriteTag={handleUpdateFavoriteTag}
          />
        )}

        {activeTab === "guida" && <WikiTab />}

        {activeTab === "impostazioni" && (
          <SettingsTab
            locations={locations}
            items={humidorItems}
            products={products}
            fumate={fumate}
            backups={backups}
            onRefreshData={loadData}
            onRefreshBackups={loadData}
            onCreateBackup={handleCreateBackup}
            onRestoreBackup={handleRestoreBackup}
            onDeleteBackup={handleDeleteBackup}
          />
        )}
      </main>

      {/* Mobile Ergonomic Bottom Navigation Bar */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalInHumidor={totalInHumidor}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 lg:bottom-6 right-6 z-50 bg-[#281f1a] text-[#f5ebd9] border border-[#c99757] px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-[#c99757]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modals */}
      <FumataModal
        isOpen={isFumataModalOpen}
        onClose={() => {
          setIsFumataModalOpen(false);
          setPreSelectedItemForFumata(null);
          setEditingFumata(null);
        }}
        humidorItems={humidorItems}
        products={products}
        preSelectedItem={preSelectedItemForFumata}
        editingFumata={editingFumata}
        onUpdate={handleUpdateFumata}
        onSubmit={handleFumataSubmit}
      />

      <EditHumidorItemModal
        isOpen={isEditItemModalOpen}
        onClose={() => {
          setIsEditItemModalOpen(false);
          setEditingHumidorItem(null);
        }}
        item={editingHumidorItem}
        locations={locations}
        shops={shops}
        onSubmit={handleUpdateHumidorItem}
      />

      <PurchaseModal
        isOpen={isPurchaseModalOpen}
        onClose={() => {
          setIsPurchaseModalOpen(false);
          setPreSelectedProductForPurchase(null);
        }}
        products={products}
        locations={locations}
        shops={shops}
        preSelectedProduct={preSelectedProductForPurchase}
        onSubmit={handlePurchaseSubmit}
      />

      <PriceHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setSelectedProductForHistory(null);
        }}
        product={selectedProductForHistory}
        history={productHistoryPoints}
      />

      <AIReviewModal
        isOpen={isAIReviewModalOpen}
        onClose={() => {
          setIsAIReviewModalOpen(false);
          setSelectedProductForAIReview(null);
        }}
        product={selectedProductForAIReview}
      />
    </div>
  );
}
