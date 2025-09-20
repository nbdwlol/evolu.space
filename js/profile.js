function renderProfile(user) {
  document.getElementById('profile-img').src = user.profileImg || 'profile.png';
  document.getElementById('name').textContent = user.name;
  document.getElementById('bio').textContent = user.bio;

  const linksContainer = document.getElementById('links');
  linksContainer.innerHTML = '';

  user.links.forEach(link => {
    let iconClass = 'fas fa-link';
    const label = link.label.toLowerCase();
    if(label.includes('twitter')) iconClass='fab fa-twitter';
    if(label.includes('instagram')) iconClass='fab fa-instagram';
    if(label.includes('youtube')) iconClass='fab fa-youtube';
    if(label.includes('github')) iconClass='fab fa-github';

    const a = document.createElement('a');
    a.href = link.url;
    a.target = '_blank';
    a.innerHTML = `<i class="${iconClass}"></i> ${link.label}`;
    linksContainer.appendChild(a);
  });
}
