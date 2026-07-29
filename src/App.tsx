import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProviders } from './app/providers/AppProviders'
import { AuthGuard } from './app/guards/AuthGuard'
import { RoleGuard } from './app/guards/RoleGuard'

// Layouts
import { PublicLayout } from './components/layout/PublicLayout'
import { AdminLayout } from './components/layout/AdminLayout'
import { BankerLayout } from './components/layout/BankerLayout'

// Public Pages
import { LandingPage } from './pages/public/LandingPage'
import { WalletPage } from './pages/public/WalletPage'
import { LoginPage } from './pages/public/LoginPage'
import { ForgotPasswordPage } from './pages/public/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/public/ResetPasswordPage'
import { ScoreboardPage } from './pages/public/ScoreboardPage'
import { FacilitatorPage } from './pages/public/FacilitatorPage'

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { ManageClasses } from './pages/admin/ManageClasses'
import { ManageTransactions } from './pages/admin/ManageTransactions'
import { ManageMissions } from './pages/admin/ManageMissions'
import { ManageItems } from './pages/admin/ManageItems'
import { ManageCards } from './pages/admin/ManageCards'
import { ManageUsers } from './pages/admin/ManageUsers'
import { ManageSettings } from './pages/admin/ManageSettings'
import { AdminScoreboard } from './pages/admin/AdminScoreboard'

// Banker Pages
import { BankerDashboard } from './pages/banker/BankerDashboard'
import { BankerTransaction } from './pages/banker/BankerTransaction'
import { BankerHistory } from './pages/banker/BankerHistory'

function App() {
  return (
    <AppProviders>
      <HashRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<PublicLayout><LandingPage /></PublicLayout>} />
          <Route path="/wallet/:publicToken" element={<PublicLayout><WalletPage /></PublicLayout>} />
          <Route path="/scoreboard" element={<ScoreboardPage />} />
          <Route path="/fasilitator" element={<PublicLayout><FacilitatorPage /></PublicLayout>} />
          
          {/* Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Admin Routes (Guarded for admin) */}
          <Route 
            path="/admin/dashboard" 
            element={
              <AuthGuard>
                <RoleGuard allowedRoles={['admin']}>
                  <AdminLayout><AdminDashboard /></AdminLayout>
                </RoleGuard>
              </AuthGuard>
            } 
          />
          <Route 
            path="/admin/classes" 
            element={
              <AuthGuard>
                <RoleGuard allowedRoles={['admin']}>
                  <AdminLayout><ManageClasses /></AdminLayout>
                </RoleGuard>
              </AuthGuard>
            } 
          />
          <Route 
            path="/admin/scoreboard" 
            element={
              <AuthGuard>
                <RoleGuard allowedRoles={['admin']}>
                  <AdminLayout><AdminScoreboard /></AdminLayout>
                </RoleGuard>
              </AuthGuard>
            } 
          />
          <Route 
            path="/admin/transactions" 
            element={
              <AuthGuard>
                <RoleGuard allowedRoles={['admin']}>
                  <AdminLayout><ManageTransactions /></AdminLayout>
                </RoleGuard>
              </AuthGuard>
            } 
          />
          <Route 
            path="/admin/missions" 
            element={
              <AuthGuard>
                <RoleGuard allowedRoles={['admin']}>
                  <AdminLayout><ManageMissions /></AdminLayout>
                </RoleGuard>
              </AuthGuard>
            } 
          />
          <Route 
            path="/admin/items" 
            element={
              <AuthGuard>
                <RoleGuard allowedRoles={['admin']}>
                  <AdminLayout><ManageItems /></AdminLayout>
                </RoleGuard>
              </AuthGuard>
            } 
          />
          <Route 
            path="/admin/cards" 
            element={
              <AuthGuard>
                <RoleGuard allowedRoles={['admin']}>
                  <AdminLayout><ManageCards /></AdminLayout>
                </RoleGuard>
              </AuthGuard>
            } 
          />
          <Route 
            path="/admin/users" 
            element={
              <AuthGuard>
                <RoleGuard allowedRoles={['admin']}>
                  <AdminLayout><ManageUsers /></AdminLayout>
                </RoleGuard>
              </AuthGuard>
            } 
          />
          <Route 
            path="/admin/settings" 
            element={
              <AuthGuard>
                <RoleGuard allowedRoles={['admin']}>
                  <AdminLayout><ManageSettings /></AdminLayout>
                </RoleGuard>
              </AuthGuard>
            } 
          />

          {/* Banker Routes (Guarded for banker and admin) */}
          <Route 
            path="/banker/dashboard" 
            element={
              <AuthGuard>
                <RoleGuard allowedRoles={['banker', 'admin']}>
                  <BankerLayout><BankerDashboard /></BankerLayout>
                </RoleGuard>
              </AuthGuard>
            } 
          />
          <Route 
            path="/banker/transaction" 
            element={
              <AuthGuard>
                <RoleGuard allowedRoles={['banker', 'admin']}>
                  <BankerLayout><BankerTransaction /></BankerLayout>
                </RoleGuard>
              </AuthGuard>
            } 
          />
          <Route 
            path="/banker/history" 
            element={
              <AuthGuard>
                <RoleGuard allowedRoles={['banker', 'admin']}>
                  <BankerLayout><BankerHistory /></BankerLayout>
                </RoleGuard>
              </AuthGuard>
            } 
          />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AppProviders>
  )
}

export default App
