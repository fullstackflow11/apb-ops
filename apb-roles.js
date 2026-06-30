/* ══════════════════════════════════════════════════════════════════
   APB Roles — shared access helper (role-set model)
   Roles (parallel "worlds", not a strict hierarchy):
     admin      → everything
     pm         → operational tools (quoting, reports, ops)
     tech       → timesheet + task dashboard
     accounting → financial heartbeat + AR/contacts
     purchasing → active list, purchasing, MTR, used parts, partner portals (+ tech access)
     fleet      → APB company vessels (maintenance, refits, vessel records)
   Each user logs into ONLY their world; admin sees all.
   Real enforcement is the deployed site's account permissions; this is
   the local hub's matching UI gate.

   Usage in a protected page <head> (load this first, then call guard):
     <script src="apb-roles.js"></script>
     <script>APBRoles.guard(['admin','accounting'],'Accounting');</script>
   guard() also accepts a legacy level string:
     'admin' → admin only · 'pm' → admin+pm · 'tech' → admin+pm+tech
   ══════════════════════════════════════════════════════════════════ */
(function () {
  var KEY = 'apb_role';
  var ROLES = ['admin', 'pm', 'tech', 'accounting', 'purchasing', 'fleet'];
  var LEGACY = { admin: ['admin'], pm: ['admin', 'pm'], tech: ['admin', 'pm', 'tech'] };

  function normalize(r) {
    if (ROLES.indexOf(r) >= 0) return r;
    if (r === 'field') return 'tech';   // migrate old value
    return 'admin';                      // default (owner machine)
  }
  function role() {
    try { return normalize(localStorage.getItem(KEY)); } catch (e) { return 'admin'; }
  }
  // Resolve `allowed` (array of roles | legacy level string) to a role set that always includes admin.
  function allowedSet(allowed) {
    if (Array.isArray(allowed)) return allowed.indexOf('admin') >= 0 ? allowed : ['admin'].concat(allowed);
    if (typeof allowed === 'string' && LEGACY[allowed]) return LEGACY[allowed];
    if (typeof allowed === 'string') return ['admin', allowed];
    return ['admin'];
  }
  function canAccess(allowed) {
    var r = role();
    if (r === 'admin') return true;
    return allowedSet(allowed).indexOf(r) >= 0;
  }
  function set(r) {
    try { localStorage.setItem(KEY, normalize(r)); } catch (e) {}
  }

  window.APBRoles = {
    role: role,
    roles: ROLES.slice(),
    canAccess: canAccess,
    set: set,
    label: function () {
      return { admin: 'Admin', pm: 'PM', tech: 'Tech', accounting: 'Accounting', purchasing: 'Purchasing', fleet: 'Fleet' }[role()];
    },
    // Redirect to the access gate if the current role can't reach `allowed`.
    guard: function (allowed, areaLabel) {
      if (canAccess(allowed)) return true;
      // Relative redirect so the bundle works wherever it's hosted (not just /APB PM Console/).
      var to = encodeURIComponent(location.pathname.split('/').pop() || 'index.html');
      var set = allowedSet(allowed);
      var need = set.filter(function (x) { return x !== 'admin'; })[0] || 'admin';
      location.replace('_admin-gate.html?need=' + need +
        '&label=' + encodeURIComponent(areaLabel || 'this area') + '&to=' + to);
      return false;
    }
  };
})();
