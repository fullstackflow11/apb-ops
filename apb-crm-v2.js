
const SB_URL = 'https://aanrxyiocxxndkvkeocv.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhbnJ4eWlvY3h4bmRrdmtlb2N2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA3NzAyOSwiZXhwIjoyMDk1NjUzMDI5fQ.6fLSMOi9n67qPbxgKTxwSGPmsD-KjxKZalQsDrsW_xE';
let sb;
let allLeads = [], allJobs = [], editingLeadId = null, editingJobId = null, pendingFile = null, pendingFileUrl = null, pendingFileName = null;

// ── INIT ──
window.addEventListener('load', async function init() {
      sb = window.supabase.createClient(SB_URL, SB_KEY);
  await Promise.all([loadLeads(), loadJobs()]);
});
// ── TAB SWITCH ──
function switchMainTab(tab, el) {
  document.querySelectorAll('.main-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('panel-' + tab).classList.add('active');
}

// ── LEADS ──
async function loadLeads() {
  const { data, error } = await sb.from('apb_leads').select('*').order('created_at', { ascending: false });
  if (error) { console.error(error); return; }
  allLeads = data || [];
  renderLeads();
}

function renderLeads() {
  const search = document.getElementById('leadSearch').value.toLowerCase();
  const statusF = document.getElementById('leadStatusFilter').value;
  let filtered = allLeads.filter(l => {
    const matchS = !statusF || l.status === statusF;
    const matchQ = !search || [l.client_name, l.company, l.vessel, l.phone, l.rfq_notes].some(v => v && v.toLowerCase().includes(search));
    return matchS && matchQ;
  });
  document.getElementById('leadCount').textContent = filtered.length + ' lead' + (filtered.length !== 1 ? 's' : '');
  if (!filtered.length) { document.getElementById('leadsView').innerHTML = '<div class="empty-state">No leads found.</div>'; return; }
  const byClient = groupBy(filtered, l => (l.company || l.client_name || 'Unknown').trim());
  document.getElementById('leadsView').innerHTML = Object.entries(byClient).sort((a,b) => a[0].localeCompare(b[0])).map(([client, leads]) => folderHtml('lead', client, leads, leadRowHtml)).join('');
}

function leadRowHtml(l) {
  const sc = statusClass(l.status, 'lead');
  return `<div class="card-item">
    <div class="card-row" onclick="showLeadDetail('${l.id}')">
      <div class="card-status-dot ${sc.dot}"></div>
      <div style="flex:1;">
        <div class="card-name">${esc(l.client_name)}</div>
        ${l.vessel ? `<div class="card-vessel">${esc(l.vessel)}</div>` : ''}
      </div>
      ${l.phone ? `<div style="font-family:var(--font-mono);font-size:11px;color:var(--silver-dim);">${esc(l.phone)}</div>` : ''}
      <span class="card-badge ${sc.badge}">${l.status}</span>
      <div class="card-date">${fmtDate(l.created_at)}</div>
      <div class="card-actions" onclick="event.stopPropagation()">
        <button class="icon-btn" onclick="openLeadModal('${l.id}')" title="Edit">✎</button>
        <button class="icon-btn danger" onclick="deleteLead('${l.id}')" title="Delete">✕</button>
      </div>
    </div>
  </div>`;
}

function openLeadModal(id) {
  editingLeadId = id || null;
  document.getElementById('leadModalTitle').textContent = id ? 'Edit Lead' : 'New Lead';
  document.getElementById('leadFormMsg').className = 'msg';
  const fields = ['client_name','company','phone','email','vessel','rfq_notes','status','source','assigned_to','follow_up_date','notes'];
  if (id) {
    const l = allLeads.find(x => x.id === id);
    if (l) fields.forEach(f => { const el = document.getElementById('lf_'+f); if(el) el.value = l[f] || ''; });
  } else {
    fields.forEach(f => { const el = document.getElementById('lf_'+f); if(el) el.value = f === 'status' ? 'New' : ''; });
  }
  document.getElementById('leadModal').classList.add('open');
}

function closeLeadModal() { document.getElementById('leadModal').classList.remove('open'); }

async function saveLead() {
  const name = document.getElementById('lf_client_name').value.trim();
  if (!name) { showMsg('leadFormMsg', 'error', 'Client name required.'); return; }
  const btn = document.getElementById('leadSaveBtn'); btn.disabled = true; btn.textContent = 'Saving...';
  const payload = {
    client_name: name,
    company: v('lf_company'), phone: v('lf_phone'), email: v('lf_email'), vessel: v('lf_vessel'),
    rfq_notes: v('lf_rfq_notes'), status: v('lf_status'), source: v('lf_source'),
    assigned_to: v('lf_assigned_to'), notes: v('lf_notes'),
    follow_up_date: v('lf_follow_up_date') || null
  };
  const { error } = editingLeadId
    ? await sb.from('apb_leads').update(payload).eq('id', editingLeadId)
    : await sb.from('apb_leads').insert(payload);
  btn.disabled = false; btn.textContent = 'Save Lead';
  if (error) { showMsg('leadFormMsg', 'error', error.message); return; }
  closeLeadModal(); await loadLeads(); showMsg('leadMsg', 'success', editingLeadId ? 'Lead updated.' : 'Lead added.');
}

async function deleteLead(id) {
  if (!confirm('Delete this lead?')) return;
  await sb.from('apb_leads').delete().eq('id', id);
  await loadLeads();
}

function showLeadDetail(id) {
  const l = allLeads.find(x => x.id === id); if (!l) return;
  document.getElementById('detailTitle').textContent = l.client_name;
  document.getElementById('detailBody').innerHTML = `
    <div class="detail-row">
      <div class="detail-field"><div class="detail-label">Company</div><div class="detail-value">${esc(l.company||'—')}</div></div>
      <div class="detail-field"><div class="detail-label">Status</div><div class="detail-value"><span class="card-badge ${statusClass(l.status,'lead').badge}">${l.status}</span></div></div>
      <div class="detail-field"><div class="detail-label">Phone</div><div class="detail-value">${l.phone ? `<a href="tel:${l.phone}">${esc(l.phone)}</a>` : '—'}</div></div>
      <div class="detail-field"><div class="detail-label">Email</div><div class="detail-value">${l.email ? `<a href="mailto:${l.email}">${esc(l.email)}</a>` : '—'}</div></div>
      <div class="detail-field"><div class="detail-label">Vessel</div><div class="detail-value">${esc(l.vessel||'—')}</div></div>
      <div class="detail-field"><div class="detail-label">Source</div><div class="detail-value">${esc(l.source||'—')}</div></div>
      <div class="detail-field"><div class="detail-label">Assigned To</div><div class="detail-value">${esc(l.assigned_to||'—')}</div></div>
      <div class="detail-field"><div class="detail-label">Follow-up</div><div class="detail-value">${l.follow_up_date ? new Date(l.follow_up_date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—'}</div></div>
    </div>
    ${l.rfq_notes ? `<div class="detail-section">RFQ Notes</div><div class="detail-value" style="white-space:pre-wrap;">${esc(l.rfq_notes)}</div>` : ''}
    ${l.notes ? `<div class="detail-section">Internal Notes</div><div class="detail-value" style="white-space:pre-wrap;">${esc(l.notes)}</div>` : ''}
    <div style="font-family:var(--font-mono);font-size:10px;color:var(--muted);margin-top:20px;">Added ${fmtDate(l.created_at)}</div>`;
  document.getElementById('detailFooter').innerHTML = `
    <button class="btn-ghost" onclick="closeDetail()">Close</button>
    <button class="btn-metal" onclick="closeDetail();openLeadModal('${l.id}')">Edit Lead</button>`;
  document.getElementById('detailModal').classList.add('open');
}

// ── JOBS ──
async function loadJobs() {
  const { data, error } = await sb.from('apb_jobs').select('*').order('created_at', { ascending: false });
  if (error) { console.error(error); return; }
  allJobs = data || [];
  renderJobs();
}

function renderJobs() {
  const search = document.getElementById('jobSearch').value.toLowerCase();
  const statusF = document.getElementById('jobStatusFilter').value;
  const deptF = document.getElementById('jobDeptFilter').value;
  let filtered = allJobs.filter(j => {
    const matchS = !statusF || j.status === statusF;
    const matchD = !deptF || j.department === deptF;
    const matchQ = !search || [j.client_name, j.company, j.vessel_name, j.job_no, j.job_description].some(v => v && v.toLowerCase().includes(search));
    return matchS && matchD && matchQ;
  });
  document.getElementById('jobCount').textContent = filtered.length + ' job' + (filtered.length !== 1 ? 's' : '');
  if (!filtered.length) { document.getElementById('jobsView').innerHTML = '<div class="empty-state">No jobs found. Add one above.</div>'; return; }
  const byClient = groupBy(filtered, j => (j.company || j.client_name || 'Unknown').trim());
  document.getElementById('jobsView').innerHTML = Object.entries(byClient).sort((a,b) => a[0].localeCompare(b[0])).map(([client, jobs]) => folderHtml('job', client, jobs, jobRowHtml)).join('');
}

function jobRowHtml(j) {
  const sc = statusClass(j.status, 'job');
  return `<div class="card-item">
    <div class="card-row" onclick="showJobDetail('${j.id}')">
      <div class="card-status-dot ${sc.dot}"></div>
      <div style="flex:1;">
        <div class="card-name">${esc(j.vessel_name || j.job_description || 'Untitled Job')}</div>
        <div class="card-vessel">${j.job_no ? `#${j.job_no} · ` : ''}${esc(j.job_description||'')}</div>
      </div>
      ${j.department ? `<div style="font-family:var(--font-mono);font-size:10px;color:var(--silver-dim);background:var(--input-bg);border:1px solid var(--border);padding:2px 7px;border-radius:3px;">${j.department}</div>` : ''}
      ${j.priority === 'Urgent' ? `<span class="card-badge badge-priority-urgent">URGENT</span>` : j.priority === 'High' ? `<span class="card-badge badge-priority-high">HIGH</span>` : ''}
      <span class="card-badge ${sc.badge}">${j.status}</span>
      ${j.proposal_url ? `<span title="Proposal attached" style="font-size:14px;">📄</span>` : ''}
      <div class="card-date">${fmtDate(j.created_at)}</div>
      <div class="card-actions" onclick="event.stopPropagation()">
        <button class="icon-btn" onclick="openJobModal('${j.id}')" title="Edit">✎</button>
        <button class="icon-btn danger" onclick="deleteJob('${j.id}')" title="Delete">✕</button>
      </div>
    </div>
  </div>`;
}

function openJobModal(id) {
  editingJobId = id || null; pendingFile = null; pendingFileUrl = null; pendingFileName = null;
  document.getElementById('jobModalTitle').textContent = id ? 'Edit Job' : 'New Job';
  document.getElementById('jobFormMsg').className = 'msg';
  document.getElementById('fileAttached').style.display = 'none';
  document.getElementById('fileAttached').innerHTML = '';
  document.getElementById('uploadProgress').style.display = 'none';
  const jFields = ['client_name','company','phone','email','vessel_name','vessel_type','vessel_length','vessel_year','vessel_make','vessel_flag','vessel_location','job_no','department','status','priority','estimated_value','job_description','scope_of_work','notes'];
  if (id) {
    const j = allJobs.find(x => x.id === id);
    if (j) {
      jFields.forEach(f => { const el = document.getElementById('jf_'+f); if(el) el.value = j[f] != null ? j[f] : ''; });
      if (j.proposal_url) {
        pendingFileUrl = j.proposal_url; pendingFileName = j.proposal_filename || 'Proposal';
        document.getElementById('fileAttached').style.display = 'block';
        document.getElementById('fileAttached').innerHTML = `<div class="file-attached"><span class="fname">📄 ${esc(pendingFileName)}</span><a href="${j.proposal_url}" target="_blank" style="color:var(--blue);font-size:12px;">View ↗</a><button class="fremove" onclick="clearFile()">×</button></div>`;
      }
    }
  } else {
    jFields.forEach(f => { const el = document.getElementById('jf_'+f); if(el) el.value = f==='status'?'RFQ Received':f==='priority'?'Normal':''; });
  }
  document.getElementById('jobModal').classList.add('open');
}

function closeJobModal() { document.getElementById('jobModal').classList.remove('open'); }

function handleFileSelect(input) {
  const file = input.files[0]; if (!file) return;
  pendingFile = file; pendingFileUrl = null; pendingFileName = file.name;
  document.getElementById('fileAttached').style.display = 'block';
  document.getElementById('fileAttached').innerHTML = `<div class="file-attached"><span class="fname">📄 ${esc(file.name)}</span><span style="font-size:11px;color:var(--muted);">${(file.size/1024).toFixed(0)} KB</span><button class="fremove" onclick="clearFile()">×</button></div>`;
}

function clearFile() { pendingFile = null; pendingFileUrl = null; pendingFileName = null; document.getElementById('fileAttached').style.display = 'none'; document.getElementById('fileAttached').innerHTML = ''; document.getElementById('proposalFile').value = ''; }

async function uploadProposal(clientName) {
  if (!pendingFile) return { url: pendingFileUrl, filename: pendingFileName };
  const folder = (clientName || 'general').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  const path = `${folder}/${Date.now()}-${pendingFile.name}`;
  document.getElementById('uploadProgress').style.display = 'block';
  document.getElementById('uploadProgressBar').style.width = '40%';
  const { error } = await sb.storage.from('proposals').upload(path, pendingFile, { contentType: pendingFile.type, upsert: true });
  document.getElementById('uploadProgressBar').style.width = '100%';
  if (error) { console.error(error); return { url: null, filename: null }; }
  const { data } = sb.storage.from('proposals').getPublicUrl(path);
  return { url: data.publicUrl, filename: pendingFile.name };
}

async function saveJob() {
  const name = document.getElementById('jf_client_name').value.trim();
  if (!name) { showMsg('jobFormMsg', 'error', 'Client name required.'); return; }
  const btn = document.getElementById('jobSaveBtn'); btn.disabled = true; btn.textContent = 'Saving...';
  const { url: proposalUrl, filename: proposalFilename } = await uploadProposal(document.getElementById('jf_company').value || name);
  const payload = {
    client_name: name,
    company: v('jf_company'), phone: v('jf_phone'), email: v('jf_email'),
    vessel_name: v('jf_vessel_name'), vessel_type: v('jf_vessel_type'), vessel_length: v('jf_vessel_length'),
    vessel_year: v('jf_vessel_year'), vessel_make: v('jf_vessel_make'), vessel_flag: v('jf_vessel_flag'),
    vessel_location: v('jf_vessel_location'), job_no: v('jf_job_no'), department: v('jf_department'),
    status: v('jf_status'), priority: v('jf_priority'),
    estimated_value: parseFloat(document.getElementById('jf_estimated_value').value) || null,
    job_description: v('jf_job_description'), scope_of_work: v('jf_scope_of_work'), notes: v('jf_notes'),
    proposal_url: proposalUrl || null, proposal_filename: proposalFilename || null,
    updated_at: new Date().toISOString()
  };
  const { error } = editingJobId
    ? await sb.from('apb_jobs').update(payload).eq('id', editingJobId)
    : await sb.from('apb_jobs').insert(payload);
  btn.disabled = false; btn.textContent = 'Save Job';
  if (error) { showMsg('jobFormMsg', 'error', error.message); return; }
  closeJobModal(); await loadJobs(); showMsg('jobMsg', 'success', editingJobId ? 'Job updated.' : 'Job created.');
}

async function deleteJob(id) {
  if (!confirm('Delete this job?')) return;
  await sb.from('apb_jobs').delete().eq('id', id);
  await loadJobs();
}

function showJobDetail(id) {
  const j = allJobs.find(x => x.id === id); if (!j) return;
  const sc = statusClass(j.status, 'job');
  document.getElementById('detailTitle').textContent = j.vessel_name || j.client_name;
  document.getElementById('detailBody').innerHTML = `
    <div class="detail-row">
      <div class="detail-field"><div class="detail-label">Client</div><div class="detail-value">${esc(j.client_name)}</div></div>
      <div class="detail-field"><div class="detail-label">Company</div><div class="detail-value">${esc(j.company||'—')}</div></div>
      <div class="detail-field"><div class="detail-label">Phone</div><div class="detail-value">${j.phone ? `<a href="tel:${j.phone}">${esc(j.phone)}</a>` : '—'}</div></div>
      <div class="detail-field"><div class="detail-label">Email</div><div class="detail-value">${j.email ? `<a href="mailto:${j.email}">${esc(j.email)}</a>` : '—'}</div></div>
    </div>
    <div class="detail-section">Vessel</div>
    <div class="detail-row">
      <div class="detail-field"><div class="detail-label">Vessel</div><div class="detail-value">${esc(j.vessel_name||'—')}</div></div>
      <div class="detail-field"><div class="detail-label">Type</div><div class="detail-value">${esc(j.vessel_type||'—')}</div></div>
      <div class="detail-field"><div class="detail-label">Length</div><div class="detail-value">${j.vessel_length ? j.vessel_length+' ft' : '—'}</div></div>
      <div class="detail-field"><div class="detail-label">Year / Make</div><div class="detail-value">${[j.vessel_year,j.vessel_make].filter(Boolean).join(' · ')||'—'}</div></div>
      <div class="detail-field"><div class="detail-label">Flag</div><div class="detail-value">${esc(j.vessel_flag||'—')}</div></div>
      <div class="detail-field"><div class="detail-label">Location</div><div class="detail-value">${esc(j.vessel_location||'—')}</div></div>
    </div>
    <div class="detail-section">Job</div>
    <div class="detail-row">
      <div class="detail-field"><div class="detail-label">Job No</div><div class="detail-value">${esc(j.job_no||'—')}</div></div>
      <div class="detail-field"><div class="detail-label">Department</div><div class="detail-value">${esc(j.department||'—')}</div></div>
      <div class="detail-field"><div class="detail-label">Status</div><div class="detail-value"><span class="card-badge ${sc.badge}">${j.status}</span></div></div>
      <div class="detail-field"><div class="detail-label">Priority</div><div class="detail-value">${j.priority||'Normal'}</div></div>
      <div class="detail-field"><div class="detail-label">Est. Value</div><div class="detail-value">${j.estimated_value ? '$'+Number(j.estimated_value).toLocaleString() : '—'}</div></div>
    </div>
    ${j.job_description ? `<div><div class="detail-label" style="margin-bottom:4px;">Description</div><div class="detail-value">${esc(j.job_description)}</div></div>` : ''}
    ${j.scope_of_work ? `<div class="detail-section">Scope of Work</div><div class="detail-value" style="white-space:pre-wrap;">${esc(j.scope_of_work)}</div>` : ''}
    ${j.proposal_url ? `<div class="detail-section">Proposal</div><div class="proposal-link"><span class="pname">📄 ${esc(j.proposal_filename||'Proposal')}</span><a href="${j.proposal_url}" target="_blank">Open PDF ↗</a></div>` : ''}
    ${j.notes ? `<div class="detail-section">Notes</div><div class="detail-value" style="white-space:pre-wrap;">${esc(j.notes)}</div>` : ''}
    <div style="font-family:var(--font-mono);font-size:10px;color:var(--muted);margin-top:20px;">Created ${fmtDate(j.created_at)}</div>`;
  document.getElementById('detailFooter').innerHTML = `
    <button class="btn-ghost" onclick="closeDetail()">Close</button>
    <button class="btn-metal" onclick="closeDetail();openJobModal('${j.id}')">Edit Job</button>`;
  document.getElementById('detailModal').classList.add('open');
}

function closeDetail() { document.getElementById('detailModal').classList.remove('open'); }

// ── HELPERS ──
function folderHtml(type, client, items, rowFn) {
  const id = 'folder_' + type + '_' + client.replace(/[^a-z0-9]/gi, '_');
  return `<div class="folder-group">
    <div class="folder-header" id="${id}_h" onclick="toggleFolder('${id}')">
      <span class="folder-icon">📁</span>
      <span class="folder-name">${esc(client)}</span>
      <span class="folder-badge">${items.length}</span>
      <span class="folder-chevron">▶</span>
    </div>
    <div class="folder-body" id="${id}_b">${items.map(rowFn).join('')}</div>
  </div>`;
}

function toggleFolder(id) {
  document.getElementById(id+'_h').classList.toggle('open');
  document.getElementById(id+'_b').classList.toggle('open');
}

function groupBy(arr, fn) {
  return arr.reduce((acc, item) => { const k = fn(item); (acc[k] = acc[k] || []).push(item); return acc; }, {});
}

function statusClass(status, type) {
  const map = {
    'New': {dot:'s-new', badge:'badge-new'},
    'Contacted': {dot:'s-contacted', badge:'badge-contacted'},
    'Proposal Sent': {dot:'s-proposal', badge:'badge-proposal'},
    'Won': {dot:'s-won', badge:'badge-won'},
    'Lost': {dot:'s-lost', badge:'badge-lost'},
    'On Hold': {dot:'s-hold', badge:'badge-hold'},
    'RFQ Received': {dot:'s-rfq', badge:'badge-rfq'},
    'Estimating': {dot:'s-estimating', badge:'badge-estimating'},
    'Quote Sent': {dot:'s-proposal', badge:'badge-proposal'},
    'Approved': {dot:'s-approved', badge:'badge-approved'},
    'Scheduled': {dot:'s-scheduled', badge:'badge-scheduled'},
    'In Progress': {dot:'s-inprogress', badge:'badge-inprogress'},
    'Ready To Be Billed': {dot:'s-ready', badge:'badge-ready'},
    'Invoice Sent': {dot:'s-proposal', badge:'badge-proposal'},
    'Paid': {dot:'s-paid', badge:'badge-paid'},
    'Cancelled': {dot:'s-cancelled', badge:'badge-cancelled'},
  };
  return map[status] || {dot:'s-new', badge:'badge-new'};
}

function v(id) { const el = document.getElementById(id); return el ? el.value.trim() || null : null; }
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>\/g,'&gt;').replace(/"/g,'&quot;'); }
function fmtDate(d) { if (!d) return ''; try { return new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); } catch(e) { return ''; } }
function showMsg(id, type, text) { const el = document.getElementById(id); el.textContent = text; el.className = 'msg ' + type; if (type === 'success') setTimeout(() => el.className = 'msg', 5000); }
function fmtDate(d) { if (!d) return ''; try { return new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); } catch(e) { return ''; } }
function showMsg(id, type, text) { const el = document.getElementById(id); el.textContent = text; el.className = 'msg ' + type; if (type === 'success') setTimeout(() => el.className = 'msg', 5000); }
