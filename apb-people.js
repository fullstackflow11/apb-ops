/* ══════════════════════════════════════════════════════════════════
   APB People — single source of truth for who can log in & their role.
   Reads the apb_people table over the Supabase REST API (anon key), so
   it works on any page with no extra libraries. Pages keep their own
   hardcoded fallback, so a DB outage can never lock anyone out.

   To add / change / remove a person: edit ONE row in apb_people.
     email  (primary key, lowercase)
     name
     pin        (text — the login PIN)
     role       admin | pm | tech | accounting | purchasing | fleet
     is_manager (true = allowed on manager-only pages)
     active     (false = revoke access, keep the record)

   API:
     APBPeople.checkLogin(email, pin) ->
        { found:true,  ok:<pin matches>, role, is_manager }   (person in table)
        { found:false }                                        (not in table)
        { found:false, error:true }                            (DB unreachable)
     APBPeople.getRole(email)   -> role string | null (not found) | undefined (unreachable)
     APBPeople.isManager(email) -> true | false (not found) | null (unreachable)
   ══════════════════════════════════════════════════════════════════ */
(function () {
  var SB_URL = 'https://aanrxyiocxxndkvkeocv.supabase.co';
  var SB_KEY = 'sb_publishable_DzUy57K8eF8I1HeAYrCz3A_G7aEiyCw';

  function norm(s) { return String(s == null ? '' : s).trim().toLowerCase(); }

  // Throws on network / HTTP error; returns the person row or null if not found.
  async function fetchPerson(email) {
    email = norm(email);
    if (!email) return null;
    var url = SB_URL + '/rest/v1/apb_people'
      + '?select=email,name,pin,role,is_manager,active'
      + '&active=eq.true&email=eq.' + encodeURIComponent(email);
    var r = await fetch(url, { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY } });
    if (!r.ok) throw new Error('apb_people http ' + r.status);
    var rows = await r.json();
    return (rows && rows[0]) || null;
  }

  window.APBPeople = {
    checkLogin: async function (email, pin) {
      pin = String(pin == null ? '' : pin).trim();
      try {
        var p = await fetchPerson(email);
        if (!p) return { found: false };
        return {
          found: true,
          ok: String(p.pin == null ? '' : p.pin).trim() === pin,
          role: p.role || 'admin',
          is_manager: !!p.is_manager
        };
      } catch (e) {
        return { found: false, error: true };
      }
    },
    getRole: async function (email) {
      try { var p = await fetchPerson(email); return p ? (p.role || 'admin') : null; }
      catch (e) { return undefined; }   // undefined = couldn't reach the DB
    },
    isManager: async function (email) {
      try { var p = await fetchPerson(email); return p ? !!p.is_manager : false; }
      catch (e) { return null; }         // null = couldn't reach the DB
    }
  };
})();
