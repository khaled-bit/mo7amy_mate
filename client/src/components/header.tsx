import { useAuth } from "@/hooks/use-auth";
import { Search, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export default function Header({ title = "لوحة التحكم", subtitle = "مرحباً بك، إليك نظرة عامة على مكتبك" }: HeaderProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
          <p className="text-gray-600">{subtitle}</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative">
            <Input
              type="search"
              placeholder="البحث في القضايا والعملاء..."
              className="w-80 pr-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          </div>
          
          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative text-gray-600 hover:text-primary-600 hover:bg-primary-50">
            <Bell className="w-5 h-5" />
            <span className="absolute top-0 left-0 w-3 h-3 bg-red-500 rounded-full"></span>
          </Button>
        </div>
      </div>
    </header>
  );
}
