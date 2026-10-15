"use client";

import ErrorPage from "@/app/error";

export default function GlobalError(props: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <ErrorPage {...props} />
      </body>
    </html>
  );
}
