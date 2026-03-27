import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
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
import Expenses from './pages/finance/Expenses';

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
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
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
        <Route path="/expenses" element={<Expenses />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App