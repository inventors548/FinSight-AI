"use client";

import ProtectedLayout from "../../components/ProtectedLayout";

export default function DashboardLayout({ children }) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
}

