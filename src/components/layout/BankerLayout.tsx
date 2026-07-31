import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../app/providers/AuthProvider'
import { 
  Coins, 
  PlusCircle, 
  History, 
  LayoutDashboard, 
  LogOut, 
  User as UserIcon 
} from 'lucide-react'

interface BankerLayoutProps {
  children: React.ReactNode
}

export const BankerLayout: React.FC<BankerLayoutProps> = ({ children }) => {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const isActive = (path: string) => location.pathname === path

  const menuItems = [
    { name: 'Dashboard', path: '/banker/dashboard', icon: LayoutDashboard },
    { name: 'Transaksi Baru', path: '/banker/transaction', icon: PlusCircle },
    { name: 'Riwayat', path: '/banker/history', icon: History },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Top Navbar Header */}
      <header className="sticky top-0 z-40 bg-primary-950 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo brand */}
            <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="bg-primary-100 p-2 rounded-lg text-primary-950">
                <Coins className="h-5 w-5" />
              </div>
              <span className="text-xl font-black tracking-tight">LM Wallet</span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex space-x-2">
              {menuItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.path)
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-base font-semibold transition-all duration-150 ${
                      active 
                        ? 'bg-primary-700 text-white shadow-sm' 
                        : 'text-primary-100 hover:bg-primary-900 hover:text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>

            {/* User Profile info and Logout */}
            <div className="flex items-center gap-3">
              <div className="hidden lg:flex items-center gap-2 mr-2">
                <UserIcon className="h-4 w-4 text-primary-100" />
                <span className="text-sm font-semibold truncate max-w-[120px] text-white">
                  {profile?.full_name || 'Banker'}
                </span>
              </div>
              
              {profile?.role === 'admin' && (
                <Link
                  to="/admin/dashboard"
                  className="p-2 rounded-xl text-primary-100 hover:bg-primary-900 hover:text-white transition-colors flex items-center gap-2 border border-transparent hover:border-primary-800"
                  title="Kembali ke Admin Dashboard"
                >
                  <span className="text-sm font-bold hidden sm:inline">Admin</span>
                </Link>
              )}

              <button
                onClick={handleLogout}
                className="p-2 rounded-xl text-red-200 hover:bg-red-950/40 hover:text-white transition-colors border border-transparent hover:border-red-900/50"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
        <div className="space-y-6">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border flex justify-around items-center h-16 shadow-lg px-4">
        {menuItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center w-20 h-12 rounded-xl transition-all duration-150 ${
                active 
                  ? 'text-primary-950 font-bold scale-105' 
                  : 'text-text-muted hover:text-primary-900'
              }`}
            >
              <Icon className={`h-6 w-6 ${active ? 'text-primary-700' : 'text-text-muted'}`} />
              <span className="text-xs mt-1 leading-none">{item.name}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
