import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "DurianCare Smart Farm",
    template: "%s | DurianCare",
  },
  description: "Hệ điều hành quản lý trang trại sầu riêng thông minh",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
