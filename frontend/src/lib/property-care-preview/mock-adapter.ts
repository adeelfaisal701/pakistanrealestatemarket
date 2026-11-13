/**
 * UI PREVIEW ONLY — axios adapter that serves SAMPLE data for the
 * development-only /property-care-preview routes. It never reaches the
 * backend or database, and every write request is rejected.
 */
import { AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import {
  ADMIN_LIST,
  ADMIN_OVERVIEW,
  ADMIN_REQUEST,
  CUSTOMER_LIST,
  CUSTOMER_REQUESTS,
  NOTIFICATIONS,
  SAMPLE_CUSTOMER,
  SAMPLE_TECHNICIANS,
  TECHNICIAN_BUCKETS,
  TECHNICIAN_DETAIL,
  TECHNICIAN_JOBS,
} from "./sample-data";

function ok(config: InternalAxiosRequestConfig, data: unknown): AxiosResponse {
  return { data: { success: true, statusCode: 200, data }, status: 200, statusText: "OK", headers: {}, config };
}

function page<T>(items: T[]) {
  return { items, total: items.length, page: 1, limit: 20, totalPages: 1 };
}

function samplePhoto(kind: string, id: string): Blob {
  const palette: Record<string, [string, string]> = {
    problem: ["#c7ddf7", "#7aa7dc"],
    before: ["#f6dcc2", "#d99a5e"],
    after: ["#c9ecd9", "#5bb487"],
  };
  const [from, to] = palette[kind] ?? palette.problem;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480" viewBox="0 0 480 480"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="480" height="480" fill="url(#g)"/><text x="240" y="230" text-anchor="middle" font-family="sans-serif" font-size="34" font-weight="700" fill="#102b55">Sample photo</text><text x="240" y="275" text-anchor="middle" font-family="sans-serif" font-size="22" fill="#102b55">${kind} · ${id}</text></svg>`;
  return new Blob([svg], { type: "image/svg+xml" });
}

export const previewAdapter: AxiosAdapter = async (config) => {
  const method = (config.method ?? "get").toLowerCase();
  const url = (config.url ?? "").split("?")[0];
  const params = (config.params ?? {}) as Record<string, string>;

  if (method !== "get") {
    throw new AxiosError(
      "Actions are disabled in the UI preview.",
      "ERR_PREVIEW_READ_ONLY",
      config,
      null,
      { data: { message: "Actions are disabled in the UI preview (sample data only)." }, status: 400, statusText: "Preview", headers: {}, config },
    );
  }

  const image = url.match(/^\/__preview-image\/(\w+)\/([\w-]+)$/);
  if (image) return { data: samplePhoto(image[1], image[2]), status: 200, statusText: "OK", headers: {}, config };

  if (url === "/users/profile") return ok(config, { role: "buyer", name: SAMPLE_CUSTOMER.name });
  if (url === "/buyer/profile") return ok(config, { name: SAMPLE_CUSTOMER.name, phone: SAMPLE_CUSTOMER.phone, email: SAMPLE_CUSTOMER.email });
  if (url === "/notifications") return ok(config, { items: NOTIFICATIONS, total: NOTIFICATIONS.length, unreadCount: 2 });

  // Customer
  if (url === "/maintenance/requests") {
    const scope = params.scope ?? "active";
    const items = CUSTOMER_LIST.filter((item) =>
      scope === "all" ? true : scope === "completed" ? item.status === "completed" : scope === "cancelled" ? item.status === "cancelled" : !["completed", "cancelled"].includes(item.status),
    );
    return ok(config, page(items));
  }
  const customerDetail = url.match(/^\/maintenance\/requests\/([\w-]+)$/);
  if (customerDetail) return ok(config, CUSTOMER_REQUESTS[customerDetail[1]] ?? CUSTOMER_REQUESTS["sample-quote"]);

  // Technician
  if (url === "/maintenance/technician/profile") return ok(config, { id: "tech-1", name: "Imran Ali (sample)", availability: "available", categories: ["plumbing"] });
  if (url === "/maintenance/technician/jobs") {
    const bucket = params.bucket ?? "new";
    const counts = Object.fromEntries(Object.entries(TECHNICIAN_BUCKETS).map(([key, value]) => [key, value.length]));
    return ok(config, { ...page(TECHNICIAN_BUCKETS[bucket] ?? []), counts });
  }
  const job = url.match(/^\/maintenance\/technician\/jobs\/([\w-]+)$/);
  if (job) return ok(config, TECHNICIAN_JOBS[job[1]] ?? TECHNICIAN_JOBS["sample-new"]);

  // Admin
  if (url === "/admin/maintenance/overview") return ok(config, ADMIN_OVERVIEW);
  if (url === "/admin/maintenance/requests") return ok(config, page(ADMIN_LIST));
  if (/^\/admin\/maintenance\/requests\/[\w-]+\/eligible-technicians$/.test(url)) {
    return ok(config, SAMPLE_TECHNICIANS.filter((tech) => tech.isActive && tech.availability === "available" && tech.categories.includes("plumbing")));
  }
  if (/^\/admin\/maintenance\/requests\/[\w-]+$/.test(url)) return ok(config, ADMIN_REQUEST);
  if (url === "/admin/maintenance/technicians") return ok(config, page(SAMPLE_TECHNICIANS));
  if (/^\/admin\/maintenance\/technicians\/[\w-]+$/.test(url)) return ok(config, TECHNICIAN_DETAIL);

  throw new AxiosError(`No preview data for ${url}`, "ERR_PREVIEW_NOT_FOUND", config, null, {
    data: { message: `No preview data for ${url}` }, status: 404, statusText: "Not Found", headers: {}, config,
  });
};
