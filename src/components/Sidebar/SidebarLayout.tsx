'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Sidebar from '@/components/Sidebar/Sidebar';

export default function CollapsibleSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`relative transition-all duration-300 bg-gray-100 border-r overflow-y-auto ${collapsed ? 'w-16' : 'w-72'} h-[calc(100vh-4rem)] `}>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-4 -right-4 bg-white border rounded-full p-1 shadow"
      >
        {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>

      {!collapsed && (
        <div className="p-4">
          <Sidebar />
        </div>
      )}
    </div>
  );
}
