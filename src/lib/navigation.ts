import { Factory, Gauge, Settings } from "lucide-react";

export const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: Gauge },
  {
    label: "Form Order",
    icon: Factory,
    children: [
      { label: "Order Control", href: "/form-order/order-control" },
      { label: "Order Job", href: "/form-order/order-job" },
    ],
  },
  { label: "System Settings", href: "/settings", icon: Settings },
];

