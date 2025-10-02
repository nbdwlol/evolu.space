// public/app.js
const authArea = document.getElementById('authArea');
const mePanel = document.getElementById('mePanel');
const explore = document.getElementById('explore');
const usersList = document.getElementById('usersList');
const profileView = document.getElementById('profileView');

const authTemplate = (user) => {
  if(user) return `<div>signed in as <strong>${user.username}</strong> • <button id="gotoProfile" class="btn secondary">my profile</button></div>`;
  return `<div>
    <input id="loginUser" placeholder="username" />
    <input id="loginPass" placeholder="password" type="password" />
    <button id="loginBtn" class="btn">login</button>
    <button id="showRegister" class="btn secondary">register</button>
  </div>`;
};

async function api(path, opts={}){
  const res = await fetch(path, Object.assign({credentials:'same-origin', headers:{'Accept':'application/json'}}, opts));
  return res.json().catch(()=>({}));
}

async function refreshMe(){
  const r = await api('/api/me');
  authArea.innerHTML = authTemplate(r.user);
  if (r.user) {
    mePanel.classList.remove('hidden');
    // fill fields
    document.getElementById('displayName').value = r.user.display_name || '';
    document.getElementById('bio').value = r.user.bio || '';
    document.getElementById('meAvatar').src = r.user.avatar || '/default-avatar.png';
    // events
    document.getElementById('logoutBtn').onclick = async () => { await api('/api/logout', {method:'POST'}); location.reload(); };
    document.getElementById('saveProfile').onclick = async () => {
      await api('/api/profile', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({
        display_name: document.getElementById('displayName').value,
        bio: document.getElementById('bio').value
      })});
      alert('saved');
    };
    document.getElementById('uploadAvatarBtn').onclick = async () => {
      const f = document.getElementById('avatarFile').files[0];
      if(!f) return alert('choose a file');
      const fd = new FormData(); fd.append('avatar', f);
      const res = await fetch('/api/upload/avatar', {method:'POST', body:fd, credentials:'same-origin'});
      const j = await res.json();
      if(j.ok) { document.getElementById('meAvatar').src = j.url; alert('avatar uploaded'); }
      else alert('upload failed');
    };
    document.getElementById('gotoProfile').onclick = async () => {
      // fetch profile and show
      showProfile(r.user.id);
    };
  } else {
    mePanel.classList.add('hidden');
    // attach login handlers
    document.getElementById('loginBtn').onclick = async () => {
      const u = document.getElementById('loginUser').value;
      const p = document.getElementById('loginPass').value;
      const j = await api('/api/login', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username:u,password:p})});
      if(j.ok) location.reload();
      else alert(j.error || 'login failed');
    };
    document.getElementById('showRegister').onclick = () => showRegister();
  }
}

function showRegister(){
  authArea.innerHTML = `<div>
    <input id="regUser" placeholder="username" />
    <input id="regPass" placeholder="password" type="password" />
    <input id="regDisplay" placeholder="display name (optional)" />
    <button id="regBtn" class="btn">register</button>
  </div>`;
  document.getElementById('regBtn').onclick = async () => {
    const u = document.getElementById('regUser').value;
    const p = document.getElementById('regPass').value;
    const d = document.getElementById('regDisplay').value;
    const j = await api('/api/register', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username:u,password:p,display_name:d})});
    if(j.ok) location.reload();
    else alert(j.error || 'register failed');
  };
}

// users listing & search
document.getElementById('searchBtn').onclick = async () => {
  const q = document.getElementById('searchUsers').value;
  const j = await api('/api/users?q=' + encodeURIComponent(q));
  renderUsers(j.users || []);
};

function renderUsers(users){
  usersList.innerHTML = users.map(u => `<div class="userCard" data-id="${u.id}"><img src="${u.avatar||'/default-avatar.png'}" style="width:40px;height:40px;border-radius:6px;vertical-align:middle;margin-right:8px" /> <strong>${u.display_name||u.username}</strong></div>`).join('');
  usersList.querySelectorAll('.userCard').forEach(el=>{
    el.onclick = () => showProfile(el.dataset.id);
  });
}

// show profile by id
async function showProfile(id){
  const j = await api('/api/profile/' + id);
  if(j.error) return alert(j.error || 'not found');
  profileView.classList.remove('hidden');
  document.getElementById('profileName').textContent = j.profile.display_name || j.profile.username;
  document.getElementById('profileBio').textContent = j.profile.bio || '';
  document.getElementById('profileAvatar').src = j.profile.avatar || '/default-avatar.png';
  // posts
  const postsDiv = document.getElementById('posts');
  postsDiv.innerHTML = (j.posts || []).map(p=>`<div class="post"><div style="font-size:12px;color:#9aa4b2">${new Date(p.created_at).toLocaleString()}</div><div style="white-space:pre-wrap">${p.title?'<strong>'+escapeHtml(p.title)+'</strong><br/>':''}${escapeHtml(p.body || '')}</div></div>`).join('');
  // guestbook
  const guestbook = document.getElementById('guestbook');
  guestbook.innerHTML = (j.comments || []).map(c=>`<div class="comment"><div style="font-weight:700">${escapeHtml(c.author_name)}</div><div style="font-size:12px;color:#9aa4b2">${new Date(c.created_at).toLocaleString()}</div><div style="white-space:pre-wrap">${escapeHtml(c.text)}</div></div>`).join('');

  // show composer if viewing your own profile
  const me = await api('/api/me');
  const composer = document.getElementById('postComposer');
  if(me.user && me.user.id === j.profile.id){
    composer.classList.remove('hidden');
    document.getElementById('postBtn').onclick = async () => {
      const title = document.getElementById('postTitle').value;
      const body = document.getElementById('postBody').value;
      if(!body) return alert('write something');
      await api('/api/posts', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({title, body})});
      showProfile(id);
    };
  } else composer.classList.add('hidden');

  // guestbook form
  document.getElementById('guestBtn').onclick = async () => {
    const name = document.getElementById('guestName').value || 'guest';
    const text = document.getElementById('guestText').value;
    if(!text) return alert('say something');
    await api(`/api/comments/profile/${id}`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name, text})});
    showProfile(id);
  };

  // ensure page scrolls
  window.scrollTo({top:0, behavior:'smooth'});
}

function escapeHtml(s=''){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

// init: load latest users by default
(async()=>{
  await refreshMe();
  const j = await api('/api/users');
  renderUsers(j.users || []);
})();
