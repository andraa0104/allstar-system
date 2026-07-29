import { Factory, Gauge, Settings, Users } from "lucide-react";

export const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: Gauge },
  {
    label: "Form Order",
    icon: Factory,
    children: [
      { label: "Order Control", href: "/form-order/order-control" },
      { label: "Order Job", href: "/form-order/order-job" },
      { label: "Monitoring Staff", href: "/form-order/monitoring-staff" },
    ],
  },
  {
    label: "Employee",
    icon: Users,
    children: [
      { label: "Management Employee", href: "/employee/management" },
    ],
  },
  { label: "System Settings", href: "/settings", icon: Settings },
];


