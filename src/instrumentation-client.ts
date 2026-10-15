import { reportClientError } from "@/lib/report-client-error";

window.addEventListener("error", (event) => {
  void reportClientError("runtime", event.error);
});
window.addEventListener("unhandledrejection", (event) => {
  void reportClientError("unhandled_rejection", event.reason);
});
