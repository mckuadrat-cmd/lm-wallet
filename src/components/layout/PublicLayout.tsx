import React from 'react'
import { Link } from 'react-router-dom'
import { Coins } from 'lucide-react'

interface PublicLayoutProps {
  children: React.ReactNode
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Top Header */}
      <header className="bg-surface border-b border-border shadow-xs shrink-0">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="bg-primary-950 p-2 rounded-xl text-white">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-black text-primary-950 tracking-tight block">LM Wallet</span>
              <span className="text-[10px] text-text-muted uppercase tracking-widest font-bold -mt-0.5 block">Participant Wallet</span>
            </div>
          </Link>
          <div className="text-right hidden sm:block">
            <span className="text-sm font-bold text-primary-900">Plan. Earn. Spend. Lead.</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 flex flex-col justify-start">
        {children}
      </main>

      {/* Simple Footer */}
      <footer className="py-6 border-t border-border bg-surface/50 text-center shrink-0">
        <p className="text-xs text-text-muted font-medium">
          &copy; {new Date().getFullYear()} LM Wallet &bull; Leadership Training
        </p>
      </footer>
    </div>
  )
}
