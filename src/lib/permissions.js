/**
 * Central permissions registry.
 * All available permission keys and their human-readable labels.
 */
export const ALL_PERMISSIONS = {
  // Jobs
  "jobs.view":    "View Jobs",
  "jobs.create":  "Create Jobs",
  "jobs.edit":    "Edit Jobs",
  "jobs.delete":  "Delete Jobs",

  // Estimates
  "estimates.view":   "View Estimates",
  "estimates.create": "Create Estimates",
  "estimates.edit":   "Edit Estimates",
  "estimates.delete": "Delete Estimates",

  // Invoices
  "invoices.view":   "View Invoices",
  "invoices.create": "Create Invoices",
  "invoices.edit":   "Edit Invoices",
  "invoices.delete": "Delete Invoices",

  // Finance
  "finance.view":    "View Finance Dashboard",
  "expenses.view":   "View Expenses",
  "expenses.create": "Create Expenses",
  "expenses.edit":   "Edit Expenses",
  "expenses.delete": "Delete Expenses",

  // Employees
  "employees.view":   "View Employees",
  "employees.create": "Add Employees",
  "employees.edit":   "Edit Employees",
  "employees.delete": "Delete Employees",

  // Timesheets
  "timesheets.view":    "View Timesheets",
  "timesheets.create":  "Log Timesheets",
  "timesheets.edit":    "Edit Timesheets",
  "timesheets.delete":  "Delete Timesheets",
  "timesheets.approve": "Approve Timesheets",

  // Schedule
  "schedule.view":   "View Schedule",
  "schedule.edit":   "Edit Schedule",

  // Customers
  "customers.view":   "View Customers",
  "customers.create": "Add Customers",
  "customers.edit":   "Edit Customers",
  "customers.delete": "Delete Customers",

  // Materials
  "materials.view":   "View Materials",
  "materials.create": "Add Materials",
  "materials.edit":   "Edit Materials",
  "materials.delete": "Delete Materials",

  // Maintenance
  "maintenance.view":   "View Maintenance Contracts",
  "maintenance.create": "Create Maintenance Contracts",
  "maintenance.edit":   "Edit Maintenance Contracts",
  "maintenance.delete": "Delete Maintenance Contracts",

  // Settings
  "settings.view": "View Settings",
  "settings.edit": "Edit Settings",

  // Roles
  "roles.view":   "View Roles & Permissions",
  "roles.edit":   "Edit Roles & Permissions",

  // Forum
  "forum.view":   "View Team Forum",
  "forum.post":   "Post in Forum",
};

export const PERMISSION_GROUPS = [
  { label: "Jobs",         keys: ["jobs.view","jobs.create","jobs.edit","jobs.delete"] },
  { label: "Estimates",    keys: ["estimates.view","estimates.create","estimates.edit","estimates.delete"] },
  { label: "Invoices",     keys: ["invoices.view","invoices.create","invoices.edit","invoices.delete"] },
  { label: "Finance",      keys: ["finance.view","expenses.view","expenses.create","expenses.edit","expenses.delete"] },
  { label: "Employees",    keys: ["employees.view","employees.create","employees.edit","employees.delete"] },
  { label: "Timesheets",   keys: ["timesheets.view","timesheets.create","timesheets.edit","timesheets.delete","timesheets.approve"] },
  { label: "Schedule",     keys: ["schedule.view","schedule.edit"] },
  { label: "Customers",    keys: ["customers.view","customers.create","customers.edit","customers.delete"] },
  { label: "Materials",    keys: ["materials.view","materials.create","materials.edit","materials.delete"] },
  { label: "Maintenance",  keys: ["maintenance.view","maintenance.create","maintenance.edit","maintenance.delete"] },
  { label: "Forum",        keys: ["forum.view","forum.post"] },
  { label: "Settings",     keys: ["settings.view","settings.edit","roles.view","roles.edit"] },
];

/** Built-in permission presets */
export const ROLE_PRESETS = {
  admin: {
    label: "Admin",
    description: "Full access to everything",
    permissions: Object.keys(ALL_PERMISSIONS),
  },
  manager: {
    label: "Manager",
    description: "Everything except settings/roles editing",
    permissions: Object.keys(ALL_PERMISSIONS).filter(p => !["settings.edit","roles.edit"].includes(p)),
  },
  foreman: {
    label: "Foreman",
    description: "Jobs, schedule, timesheets, expenses — no finance or settings",
    permissions: [
      "jobs.view","jobs.edit",
      "schedule.view","schedule.edit",
      "timesheets.view","timesheets.create","timesheets.edit",
      "expenses.view","expenses.create","expenses.edit",
      "customers.view",
      "employees.view",
      "materials.view",
      "maintenance.view",
      "forum.view","forum.post",
    ],
  },
  estimator: {
    label: "Estimator",
    description: "Jobs, estimates, customers — no payroll or settings",
    permissions: [
      "jobs.view","jobs.create","jobs.edit",
      "estimates.view","estimates.create","estimates.edit",
      "customers.view","customers.create","customers.edit",
      "materials.view",
      "forum.view","forum.post",
    ],
  },
  office: {
    label: "Office",
    description: "Invoices, customers, estimates, finance — no field ops",
    permissions: [
      "jobs.view",
      "estimates.view","estimates.create","estimates.edit",
      "invoices.view","invoices.create","invoices.edit",
      "finance.view",
      "expenses.view","expenses.create","expenses.edit",
      "customers.view","customers.create","customers.edit","customers.delete",
      "timesheets.view","timesheets.approve",
      "materials.view",
      "maintenance.view","maintenance.create","maintenance.edit",
      "forum.view","forum.post",
    ],
  },
  laborer: {
    label: "Laborer",
    description: "Clock in, view own schedule and jobs",
    permissions: [
      "jobs.view",
      "schedule.view",
      "timesheets.view","timesheets.create",
      "forum.view","forum.post",
    ],
  },
};