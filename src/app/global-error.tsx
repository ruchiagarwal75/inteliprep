"use client";

import { ThemeProvider } from "@/components/theme-provider";
import ErrorPage from "@/app/error";

export default function GlobalError(props: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en" data-theme="light">
      <body>
        <ThemeProvider>
          <ErrorPage {...props} />
        </ThemeProvider>
      </body>
    </html>
  );
}
