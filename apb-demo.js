/* ══════════════════════════════════════════════════════════════════
   APB Demo Banner — shared "demo data / what's needed to go live" strip.
   Include on every page:  <script src="apb-demo.js"></script>
   Auto-detects the page and injects a consistent notice under the topbar.
   Shows a green "Live" state where it can verify a real connection
   (currently: Supabase anon key in localStorage).
   ══════════════════════════════════════════════════════════════════ */
(async function () {
  var SB_URL = "https://aanrxyiocxxndkvkeocv.supabase.co";
  var SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhbnJ4eWlvY3h4bmRrdmtlb2N2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNzcwMjksImV4cCI6MjA5NTY1MzAyOX0.QXBQj9bNKXMh4l0lfe6XO-_0ZoZiiYDy7sypQ2U01bU";
  async function hasSupabase() {
    // Legacy manual-connect flag still counts as live.
    try { if (localStorage.getItem("apb_supabase_key")) return true; } catch (e) {}
    // Otherwise verify the shared connection actually works right now — every
    // page ships with this same key baked in, so "live" is the default state.
    try {
      var ctrl = new AbortController();
      var t = setTimeout(function () { ctrl.abort(); }, 3000);
      var r = await fetch(SB_URL + "/rest/v1/apb_jobs?select=id&limit=1", {
        headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY },
        signal: ctrl.signal
      });
      clearTimeout(t);
      return r.ok;
    } catch (e) { return false; }
  }

  var path = location.pathname.toLowerCase();
  var file = (path.split("/").pop() || "index.html");
  var isGov = path.indexOf("lead%20opportunities") >= 0 || path.indexOf("lead opportunities") >= 0;

  // area = what's on this page · need = plain-English "to go live" · supabase = can self-verify live
  var MAP = {
    "apb-pm.html":         { area: "Active jobs & projects", supabase: true, liveSrc: "Supabase", need: "Connect Christina's Supabase (Connect button) — jobs sync from the Teams Active List." },
    "apb-accounting.html": { area: "Pipeline & financials", need: "Connect Supabase for the active list, and QuickBooks for AR, invoices & revenue." },
    "apb-contacts.html":   { area: "Client directory", need: "Connect QuickBooks Online (Link button) to pull live customers." },
    "apb-mtr.html":        { area: "Material test reports", supabase: true, liveSrc: "Supabase", need: "Connect Supabase for the job list; MTR files attach from SharePoint." },
    "apb-purchasing.html": { area: "Requests, consumables & vendors", need: "Connect QuickBooks for consumables/vendors and Supabase for the active list." },
    "apb-certs.html":      { area: "Certifications", need: "Seeded from the 2026 SharePoint compliance audit — point it at the live cert register to auto-update." },
    "apb-compliance.html": { area: "Insurance certificates by facility", need: "Seeded from the SharePoint compliance audit; connect SharePoint for live COI files." },
    "apb-pto.html":        { area: "Time-off requests", need: "Saved to this browser only — goes company-wide once connected to the shared database." },
    "apb-tasks.html":      { area: "Task board", need: "Saved to this browser only — goes company-wide once connected to the shared database." },
    "apb-status.html":     { area: "Field status updates", need: "Posts + photos save to this browser for now; they'll save under each project in SharePoint/Supabase when connected (this replaces the per-project Teams chat)." },
    "apb-fleet.html":      { area: "Company vessels", need: "Vessel records, refit progress & schedules are seeded from the fleet library — connect the shared store to pull each boat's live files and percent-complete." },
    "apb-procurement.html":{ area: "Material pricing", need: "McMaster-Carr live pricing needs the API connection (approved account + client cert); price-book & web pricing work now." },
    "apb-iso.html":        { area: "ISO 9001 readiness", need: "Reflects your saved progress in this browser — sync to the shared database to share it." },
    "apb-products.html":   { area: "Product pipeline", need: "Saved to this browser only — goes company-wide once connected to the shared database." },
    "apb-used-parts.html": { area: "Surplus parts", need: "Saved to this browser only — goes company-wide once connected to the shared database." },
    "apb-sop.html":        { area: "Procedures & videos", need: "Videos stream from the SharePoint library once it's linked." },
    "apb-estimate.html":   { area: "Quick estimates", need: "The math is live; saved estimates stay in this browser until connected to the shared database." },
    "apb-proposal.html":   { area: "Proposals", need: "Generation is live; saved drafts stay in this browser until connected to the shared database." },
    "apb-dealer.html":     { area: "Dealer assets", need: "Logos, photos & videos load from the dealer SharePoint library once it's connected." },
    "apb-portals.html":    { area: "Partner & supplier links", need: "These are live links — no connection needed." },
    "index.html":          { area: "Command center", supabase: true, liveSrc: "Supabase", need: "Mirrors each tool's data — fully live once Supabase & QuickBooks are connected. Open the Project Console once to load jobs here." }
  };

  var info;
  if (isGov) {
    info = { area: "Federal bid search (SAM.gov)", need: "Add your SAM.gov API key in the top banner to pull live opportunities — the fit-scoring, filters & map work on whatever it loads." };
  } else {
    info = MAP[file] || null;
  }
  if (!info) return;

  var live = info.supabase ? await hasSupabase() : false;
  var key = "apbDemoDismiss_" + (isGov ? "gov" : file);

  function injectCSS() {
    if (document.getElementById("apbDemoCSS")) return;
    var s = document.createElement("style");
    s.id = "apbDemoCSS";
    s.textContent =
      ".apb-demo-bar{display:flex;align-items:center;gap:10px;padding:8px 18px;font-family:Inter,-apple-system,'Segoe UI',sans-serif;font-size:12.5px;line-height:1.4;" +
      "background:linear-gradient(90deg,#FBF0E2,#FDF8EE);color:#7a5212;border-bottom:1px solid #efd9b0}" +
      ".apb-demo-bar.live{background:linear-gradient(90deg,#E4F5EE,#F1FBF7);color:#0a5a3c;border-bottom:1px solid #bfe6d4}" +
      ".apb-demo-bar b{font-weight:700}" +
      ".apb-demo-bar .dm-ic{font-size:14px;flex-shrink:0}" +
      ".apb-demo-bar .dm-txt{flex:1;min-width:0}" +
      ".apb-demo-bar .dm-need{opacity:.92}" +
      ".apb-demo-bar .dm-x{margin-left:8px;background:transparent;border:none;color:inherit;font-size:17px;cursor:pointer;opacity:.55;line-height:1;flex-shrink:0;padding:0 2px}" +
      ".apb-demo-bar .dm-x:hover{opacity:1}";
    document.head.appendChild(s);
  }

  function build() {
    if (document.getElementById("apbDemoBar")) return;
    injectCSS();
    var bar = document.createElement("div");
    bar.id = "apbDemoBar";
    bar.className = "apb-demo-bar" + (live ? " live" : "");
    bar.innerHTML = live
      ? '<span class="dm-ic">🟢</span><span class="dm-txt"><b>Live data</b> &middot; ' + info.area + ' — connected to ' + (info.liveSrc || "the live source") + '.</span>'
      : '<span class="dm-ic">🧪</span><span class="dm-txt"><b>Demo data</b> &middot; ' + info.area + '. <span class="dm-need">To go live: ' + info.need + '</span></span>';
    var x = document.createElement("button");
    x.className = "dm-x"; x.setAttribute("aria-label", "Hide notice"); x.innerHTML = "&times;";
    x.onclick = function () { bar.style.display = "none"; try { sessionStorage.setItem(key, "1"); } catch (e) {} };
    bar.appendChild(x);
    try { if (sessionStorage.getItem(key) === "1") bar.style.display = "none"; } catch (e) {}

    var tb = document.querySelector(".topbar");
    if (tb && tb.parentNode) tb.parentNode.insertBefore(bar, tb.nextSibling);
    else document.body.insertBefore(bar, document.body.firstChild);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
