(() => {
  const page = "ri-os";
  const eventEndpoint = "/a.php";
  const heartbeatEndpoint = "/h.php";

  const language = () => {
    const current = document.documentElement.lang.toLowerCase().split("-")[0];
    return current === "es" ? "es" : "en";
  };

  const send = (endpoint, payload) => {
    const body = new FormData();
    Object.entries(payload).forEach(([key, value]) => body.append(key, String(value)));
    try {
      if (navigator.sendBeacon?.(endpoint, body)) return;
      fetch(endpoint, {
        method: "POST",
        body,
        credentials: "same-origin",
        keepalive: true
      }).catch(() => {});
    } catch {
      return;
    }
  };

  const track = (event, detail) => {
    send(eventEndpoint, {
      pagina: page,
      evento: event,
      detalle: detail,
      idioma: language()
    });
  };

  let heartbeatAt = Date.now();
  const heartbeat = () => {
    const now = Date.now();
    const delta = Math.max(0, Math.floor((now - heartbeatAt) / 1000));
    heartbeatAt = now;
    if (delta > 0) send(heartbeatEndpoint, { delta });
  };

  window.RIOSAnalytics = Object.freeze({ track });
  window.addEventListener("DOMContentLoaded", () => track("Acceso", "RI/OS"), { once: true });
  window.setInterval(heartbeat, 5000);
})();
