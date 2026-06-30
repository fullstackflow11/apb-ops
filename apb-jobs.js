/* ══════════════════════════════════════════════════════════════════
   APB shared job source — single source of truth for the demo job list
   and the job→project rollup, so the Command Center home can show the
   same PROJECTS as the Project Console WITHOUT depending on the Console
   having been opened first.

   Include on a page:  <script src="apb-jobs.js"></script>

   Row shape: [engagement(project), rep, job_number, job_name, status, pct]
   ══════════════════════════════════════════════════════════════════ */
(function (w) {
  // Real-shaped demo data. Mirrors the Active List → multiple JOBS roll up
  // under one ENGAGEMENT (= the parent PROJECT).
  var DEMO = [
    ["Endless Summer","BS","48.0","Engine Battery Mounts","Ready To Be Billed",100],
    ["Endless Summer","BS","40.0","Engine Room Bottle Shelf","In Progress",35],
    ["Endless Summer","BS","51.0","A/C plumbing","Ready To Be Billed",100],
    ["Siemens Energy","JC","2.0","Engineering & Fab of Fixtures","In Progress",100],
    ["Siemens Energy","JC","3.0","Waterjet Turbine Parts","In Progress",50],
    ["M/Y Deztination 140'","TD","3.0","Port side door access/inspection","In Progress",5],
    ["M/Y Deztination 140'","TD","4.0","Step plate for converter chiller","In Progress",50],
    ["Retriever","BW","5.0","SS Protector Plates","In Progress",0],
    ["Retriever","BW","6.0","Engine Room Shelving","In Progress",50],
    ["Catskill","BS","3.0","Waterjet Valve Cradle","Ready To Be Billed",100],
    ["Reef Chief","H&R","1.0","Bridge Window Replacement","Ready To Be Billed",100],
    ["Jet Ski Chris","NG","1.0","Cooler Bracket","In Progress",95],
    ["Fred Sage","MV","1.0","Hull & Mast Prep / Paint","In Progress",5],
    ["High Seas","BW","1.0","Machine Keyed Socket","In Progress",0],
    ["Contessa CMC Testing","","2.0","Trouble shooting & repair","Lead",0],
    ["M/Y Deztination 140'","JM","5.0","Sea strainer replacement","Estimating",0],
    // --- real Pending Leads (from the Active List bottom → new Leads list) ---
    ["44 Carver (Rick Thomas)","BW","","Hardtop install / Harken recert","Lead",0],
    ["Dirt Poor","JC/BW","","Exhaust pipe pinhole weld (in-place)","Lead",0],
    ["M/Y Matten One","BW","","Welding fabrication service (Parazoo)","Lead",0],
    ["Parazoo Welding Project","BW","","Welding fabrication","Lead",0],
    ["Eleve — carpentry (G. Cumares)","","","Teak carpentry, organic look","Lead",0],
    ["MY CONTESSA","BW","","CMC stabilizer system diagnostic","Lead",0],
    ["Steelhead davit part","BW","","Part for Steelhead davit","Lead",0],
    ["38' Skipper","BW","","Tow eye","Lead",0],
    ["Playpen (James Southgate)","JC/BW","","Repeat-customer enquiry","Lead",0]
  ];

  function isLead(status) { return status === "Lead" || status === "Estimating"; }

  // Cache-shaped rows, identical to what apb-pm.html writes to apb_jobs_cache.
  function demoCache() {
    return DEMO.map(function (d) {
      return {
        name: d[3] || d[2] || d[0] || "Job",
        project: d[0] || "(no project)",
        status: d[4] || "Active",
        pct: +d[5] || 0,
        lead: isLead(d[4])
      };
    });
  }

  // Roll a cache (array of {project,name,pct,lead}) UP into active PROJECTS
  // with an averaged completion %. Leads excluded. Sorted least-complete first.
  function rollUp(cache) {
    if (!Array.isArray(cache)) return [];
    var by = {};
    cache.filter(function (j) { return j && !j.lead; }).forEach(function (j) {
      var p = j.project || j.name || "(no project)";
      if (!by[p]) by[p] = { name: p, sum: 0, n: 0 };
      by[p].sum += (+j.pct || 0); by[p].n++;
    });
    return Object.keys(by).map(function (k) {
      var o = by[k];
      return { name: o.name, pct: o.n ? Math.round(o.sum / o.n) : 0, jobs: o.n };
    }).sort(function (a, b) { return a.pct - b.pct; });
  }

  // True when a cache is missing or in the OLD shape (no `project` key) and
  // therefore can't be trusted to roll up into projects.
  function stale(cache) {
    if (!Array.isArray(cache) || !cache.length) return true;
    return !(cache[0] && Object.prototype.hasOwnProperty.call(cache[0], "project"));
  }

  w.APB_DEMO_JOBS = DEMO;
  w.APBJobs = { demoCache: demoCache, rollUp: rollUp, stale: stale, isLead: isLead };
})(window);
