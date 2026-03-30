import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from './components/layout/AppLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import NewJob from './pages/jobs/NewJob';
import JobsList from './pages/jobs/JobsList';
import JobDetail from './pages/jobs/JobDetail';
import Employees from './pages/Employees';
import Timesheets from './pages/Timesheets';
import Materials from './pages/materials/Materials';
import EstimatesList from './pages/estimates/EstimatesList';
import EstimateForm from './pages/estimates/EstimateForm';
import EstimateDetail from './pages/estimates/EstimateDetail';
import EstimateEdit from './pages/estimates/EstimateEdit';
import InvoicesList from './pages/invoices/InvoicesList';
import InvoiceForm from './pages/invoices/InvoiceForm';
import InvoiceDetail from './pages/invoices/InvoiceDetail';
import InvoiceEdit from './pages/invoices/InvoiceEdit';
import FinanceDashboard from './pages/finance/FinanceDashboard';
import JobDashboard from './pages/jobs/JobDashboard';
import CustomerPortal from './pages/customer/CustomerPortal';
import CustomersList from './pages/customers/CustomersList';
import CustomerDetail from './pages/customers/CustomerDetail';
import Expenses from './pages/finance/Expenses';
import Templates from './pages/settings/Templates';
import CompanySettings from './pages/settings/CompanySettings';
import VatTracker from './pages/settings/VatTracker';
import JobTemplates from './pages/settings/JobTemplates';
import EmployeeClockIn from './pages/employee/EmployeeClockIn';
import ErrorBoundary from './components/ErrorBoundary';
import Schedule from './pages/Schedule.jsx';
import Forum from './pages/Forum';
import Notifications from './pages/Notifications';
import MaintenanceContracts from './pages/maintenance/MaintenanceContracts';
import MaintenanceContractForm from './pages/maintenance/MaintenanceContractForm';
import MaintenanceContractDetail from './pages/maintenance/MaintenanceContractDetail';
import RolesPermissions from './pages/settings/RolesPermissions';
import ClientPortal from './pages/ClientPortal';
import WebsiteLayout from './pages/website/WebsiteLayout';
import WebsiteHome from './pages/website/WebsiteHome';
import WebsiteServices from './pages/website/WebsiteServices';
import WebsiteGallery from './pages/website/WebsiteGallery';
import WebsiteTestimonials from './pages/website/WebsiteTestimonials';
import WebsiteContact from './pages/website/WebsiteContact';
// v2026.03.30

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    // For all other errors (including auth_required) fall through and render the app
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/jobs/new" element={<NewJob />} />
        <Route path="/jobs" element={<JobsList />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/timesheets" element={<Timesheets />} />
        <Route path="/materials" element={<Materials />} />
        <Route path="/estimates" element={<EstimatesList />} />
        <Route path="/estimates/new" element={<EstimateForm />} />
        <Route path="/estimates/:id/edit" element={<EstimateEdit />} />
        <Route path="/estimates/:id" element={<EstimateDetail />} />
        <Route path="/invoices" element={<InvoicesList />} />
        <Route path="/invoices/new" element={<InvoiceForm />} />
        <Route path="/invoices/:id/edit" element={<InvoiceEdit />} />
        <Route path="/invoices/:id" element={<InvoiceDetail />} />
        <Route path="/finance" element={<FinanceDashboard />} />
        <Route path="/job-dashboard" element={<JobDashboard />} />
        <Route path="/customers" element={<CustomersList />} />
        <Route path="/customers/:id" element={<CustomerDetail />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/settings/templates" element={<Templates />} />
        <Route path="/settings/company" element={<CompanySettings />} />
        <Route path="/settings/vat" element={<VatTracker />} />
        <Route path="/settings/templates/jobs" element={<JobTemplates />} />
        <Route path="/clock-in" element={<EmployeeClockIn />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/forum" element={<Forum />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/maintenance" element={<MaintenanceContracts />} />
        <Route path="/maintenance/new" element={<MaintenanceContractForm />} />
        <Route path="/maintenance/:id/edit" element={<MaintenanceContractForm />} />
        <Route path="/maintenance/:id" element={<MaintenanceContractDetail />} />
        <Route path="/settings/roles" element={<RolesPermissions />} />
        <Route path="/client-portal" element={<ClientPortal />} />
      </Route>
      <Route path="/customer" element={<CustomerPortal />} />
      {/* Public website */}
      <Route element={<WebsiteLayout />}>
        <Route path="/website" element={<WebsiteHome />} />
        <Route path="/website/services" element={<WebsiteServices />} />
        <Route path="/website/gallery" element={<WebsiteGallery />} />
        <Route path="/website/testimonials" element={<WebsiteTestimonials />} />
        <Route path="/website/contact" element={<WebsiteContact />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App