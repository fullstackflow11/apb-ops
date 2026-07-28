/* ============================================================================
   APB Auth — shared authentication layer (Phase 1: real Supabase Auth)
   ----------------------------------------------------------------------------
   Replaces client-side PIN checking with Supabase Auth. The PIN is validated
   SERVER-SIDE by Supabase (signInWithPassword); it is never downloaded to or
   compared in the browser. Once RLS is enabled, the authenticated session
   token is what grants data access.

   Identity mapping
   ----------------
   Every person needs a unique Supabase Auth email.
     • Managers / office (apb_people): use their real email.
     • Technicians (apb_techs): no email on file, so we derive a STABLE
       synthetic email from their name via authEmailForName(). The SAME
       function is used at provisioning time and at login time, so they match.

   Load order on every page:
     <script src=".../@supabase/supabase-js@2"></script>
     <script src="apb-people.js"></script>
     <script src="apb-auth.js"></script>
   Then call APBAuth.init(supabaseClient) once after creating the client.
   ============================================================================ */
(function () {
  var SYNTHETIC_DOMAIN = 'apb.internal';
  var _sb = null;

  // Deterministic synthetic email for a technician name.
  // "Jerry Clark" -> "jerry.clark@apb.internal"  (lowercase, spaces->dots,
  // strip anything that isn't a-z 0-9 . -). MUST stay stable forever.
  function authEmailForName(name) {
    var slug = String(name || '').trim().toLowerCase()
      .replace(/[^a-z0-9]+/g, '.')   // any run of non-alphanumerics -> a dot
      .replace(/^\.+|\.+$/g, '')     // trim leading/trailing dots
      .replace(/\.{2,}/g, '.');      // collapse repeats
    return slug ? slug + '@' + SYNTHETIC_DOMAIN : null;
  }

  // Normalize a manager identifier: real email passes through; a bare name
  // becomes a synthetic email (same rule as techs) so either works.
  function normEmail(raw) {
    var v = String(raw || '').trim().toLowerCase();
    if (!v) return null;
    return v.indexOf('@') >= 0 ? v : authEmailForName(v);
  }

  window.APBAuth = {
    SYNTHETIC_DOMAIN: SYNTHETIC_DOMAIN,
    authEmailForName: authEmailForName,
    normEmail: normEmail,

    // Wire the module to this page's Supabase client. Call once.
    init: function (client) { _sb = client; return this; },

    // Sign in with an explicit auth email (managers) + PIN.
    // Returns { ok:true, user } or { ok:false, message }.
    signIn: async function (emailOrName, pin) {
      if (!_sb) return { ok: false, message: 'Auth not initialized.' };
      var email = normEmail(emailOrName);
      if (!email) return { ok: false, message: 'Enter your name or email.' };
      if (!pin) return { ok: false, message: 'Enter your PIN.' };
      try {
        var res = await _sb.auth.signInWithPassword({ email: email, password: String(pin) });
        if (res.error) return { ok: false, message: 'Wrong name/email or PIN.' };
        return { ok: true, user: res.data.user };
      } catch (e) {
        return { ok: false, message: 'Could not reach the server — try again.' };
      }
    },

    // Sign in a technician by display name + PIN (uses the synthetic email).
    signInTech: async function (name, pin) {
      return this.signIn(authEmailForName(name), pin);
    },

    signOut: async function () {
      if (_sb) { try { await _sb.auth.signOut(); } catch (e) {} }
    },

    // Current signed-in email, or null.
    email: async function () {
      if (!_sb) return null;
      try { var s = await _sb.auth.getSession(); return s.data.session ? s.data.session.user.email : null; }
      catch (e) { return null; }
    },

    // Resolve to a session (or null) once, and also fire cb on future changes.
    onSession: function (cb) {
      if (!_sb) return;
      _sb.auth.getSession().then(function (r) { cb(r.data ? r.data.session : null); });
      _sb.auth.onAuthStateChange(function (_e, session) { cb(session); });
    },

    // Manager check via apb_people (source of truth for roles).
    // Returns true / false / null(unreachable).
    isManager: async function (email) {
      if (window.APBPeople && APBPeople.isManager) return APBPeople.isManager(email);
      return null;
    }
  };
})();
