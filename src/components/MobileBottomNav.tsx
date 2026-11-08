import React from "react";
import { LayoutDashboard, Box, Search, Flame, Sparkles, Settings } from "lucide-react";

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  totalInHumidor: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  totalInHumidor,
}) => {
  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "humidor", label: "Humidor", icon: Box, badge: totalInHumidor },
    { id: "prezzi", label: "Prezzi FIT", icon: Search },
    { id: "fumate", label: "Fumate", icon: Flame },
    { id: "degustazione", label: "Note", icon: Sparkles },
    { id: "impostazioni", label: "Impostazioni", icon: Settings },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#16110f]/95 backdrop-blur-lg border-t border-[#2e231e] pb-[calc(env(safe-area-inset-bottom,0px)+6px)] pt-1.5 px-2 shadow-2xl">
      <div className="grid grid-cols-6 items-center">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="min-h-[46px] flex flex-col items-center justify-center relative focus:outline-none py-1"
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? "text-[#c99757] scale-110" : "text-[#7d6f66]"
                  }`}
                />
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 text-[9px] font-mono font-bold leading-none px-1 py-0.5 rounded-full bg-[#c99757] text-[#14100e]">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] font-medium tracking-tight mt-1 transition-colors ${
                  isActive ? "text-[#c99757] font-semibold" : "text-[#8c7e75]"
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 w-6 h-0.5 bg-[#c99757] rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
