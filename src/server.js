import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { juricode } from "./jurisdictional.js";
import { watch } from "./watch.js";
import { calendar } from "./ical.js";

// The page and the modules it imports, the same files GitHub Pages serves.
const files = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/src/jurisdictional.js": ["src/jurisdictional.js", "text/javascript"],
  "/src/watch.js": ["src/watch.js", "text/javascript"],
  "/src/ical.js": ["src/ical.js", "text/javascript"],
};

// Routes:
//   GET /                                  the page (it calls the Jurisdictional API itself)
//   GET /seats?address=…&days=365          JSON (also lat & lng)
//   GET /calendar.ics?address=…&days=365   an iCalendar feed to subscribe to
export function app({ lookup = juricode } = {}) {
  return createServer(async (request, response) => {
    const url = new URL(request.url, "http://localhost");
    const params = url.searchParams;

    try {
      if (request.method === "GET" && files[url.pathname]) {
        const [path, type] = files[url.pathname];
        return send(response, 200, type, await readFile(new URL(`../${path}`, import.meta.url)));
      }

      if (request.method !== "GET" || !["/seats", "/calendar.ics"].includes(url.pathname)) {
        return send(response, 404, "application/json", JSON.stringify({ error: "Not found" }));
      }

      const days = Number(params.get("days") ?? 365);
      if (!Number.isInteger(days) || days < 0) throw new Error("days must be a whole number of days.");

      const data = await lookup({
        address: params.get("address")?.trim() || undefined,
        lat: params.get("lat") ?? undefined,
        lng: params.get("lng") ?? undefined,
      });
      const result = watch(data, { days });

      if (url.pathname === "/calendar.ics") {
        const name = `Available board seats: ${data.address ?? `${data.latitude}, ${data.longitude}`}`;
        return send(response, 200, "text/calendar; charset=utf-8", calendar(result, { name }));
      }
      return send(response, 200, "application/json", JSON.stringify(result));
    } catch (error) {
      return send(response, 422, "application/json", JSON.stringify({ error: error.message }));
    }
  });
}

function send(response, status, contentType, body) {
  response.writeHead(status, { "content-type": contentType });
  response.end(body);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? 3000);
  app().listen(port, () => console.log(`Listening on http://localhost:${port}`));
}
