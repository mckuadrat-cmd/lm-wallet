import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../app/providers/AuthProvider'
import {
  LayoutDashboard,
  School,
  History,
  Award,
  ShoppingBag,
  CreditCard,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  User as UserIcon,
  Coins,
  Trophy,
  Usb
} from 'lucide-react'

interface AdminLayoutProps {
  children: React.ReactNode
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const menuItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Kelas', path: '/admin/classes', icon: School },
    { name: 'Transaksi', path: '/admin/transactions', icon: History },
    { name: 'Misi', path: '/admin/missions', icon: Award },
    { name: 'Barang & Sewa', path: '/admin/items', icon: ShoppingBag },
    { name: 'Kartu RFID/QR', path: '/admin/cards', icon: CreditCard },
    { name: 'User', path: '/admin/users', icon: Users },
    { name: 'Live Scoreboard', path: '/admin/scoreboard', icon: Trophy },
    { name: 'Pengujian RFID', path: '/admin/rfid-test', icon: Usb },
    { name: 'Pengaturan', path: '/admin/settings', icon: Settings },
  ]

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 bg-primary-950 text-white border-r border-primary-900 shrink-0">
        {/* Brand Header */}
        <div className="p-6 border-b border-primary-900 flex items-center gap-3">
          <div className="bg-primary-100 p-2.5 rounded-xl text-primary-950">
            <Coins className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight text-white leading-none block">LM Wallet</span>
            <span className="text-xs text-primary-100 font-semibold tracking-wider uppercase">Portal Admin</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl font-medium transition-all duration-200 group ${active
                  ? 'bg-primary-700 text-white shadow-md'
                  : 'text-primary-100 hover:bg-primary-900 hover:text-white'
                  }`}
              >
                <Icon className={`h-6 w-6 shrink-0 transition-transform group-hover:scale-105 ${active ? 'text-white' : 'text-primary-100 group-hover:text-white'}`} />
                <span className="text-base">{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* User Info & Logout Footer */}
        <div className="p-4 border-t border-primary-900 bg-primary-900/30">
          <div className="flex items-center gap-3 px-2 py-3 mb-2">
            <div className="bg-primary-800 p-2.5 rounded-full text-primary-100">
              <UserIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate text-white leading-tight">{profile?.full_name || 'Admin'}</p>
              <p className="text-xs text-primary-100 truncate mt-0.5">{profile?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-4 px-4 py-3 rounded-xl font-medium text-red-300 hover:bg-red-950/40 hover:text-red-200 transition-colors"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className="text-base">Keluar</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer (Overlay backdrop & side panel) */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Side Drawer Content */}
          <div className="relative flex flex-col w-4/5 max-w-xs bg-primary-950 text-white h-full shadow-2xl">
            <div className="p-6 border-b border-primary-900 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Coins className="h-6 w-6 text-primary-100" />
                <h1 className="text-xl font-extrabold tracking-tight">LM Wallet</h1>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg hover:bg-primary-900 transition-colors"
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
              {menuItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.path)
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-4 px-4 py-3.5 rounded-xl font-medium transition-colors ${active
                      ? 'bg-primary-700 text-white'
                      : 'text-primary-100 hover:bg-primary-900 hover:text-white'
                      }`}
                  >
                    <Icon className="h-6 w-6 shrink-0" />
                    <span className="text-base">{item.name}</span>
                  </Link>
                )
              })}
            </nav>

            <div className="p-4 border-t border-primary-900 bg-primary-900/30">
              <div className="flex items-center gap-3 px-2 py-3 mb-2">
                <UserIcon className="h-5 w-5 text-primary-100" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate leading-none text-white">{profile?.full_name}</p>
                  <p className="text-xs text-primary-100 truncate mt-1">{profile?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-4 px-4 py-3 rounded-xl font-medium text-red-300 hover:bg-red-950/40 hover:text-red-200 transition-colors"
              >
                <LogOut className="h-5 w-5 shrink-0" />
                <span className="text-base">Keluar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Work Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-xl text-primary-950 hover:bg-primary-50 hover:text-primary-900 transition-colors border border-border"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm md:text-base font-bold text-text-muted">
                {menuItems.find(item => isActive(item.path))?.name || 'Portal Admin'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-primary-100 text-primary-950 border border-primary-100">
              <span className="h-2 w-2 rounded-full bg-primary-700 animate-pulse"></span>
              Admin
            </span>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
