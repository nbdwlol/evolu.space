function renderProfile(user) {
  // Set profile image, name, and bio
  document.getElementById('profile-img').src = user.profileImg || 'profile.png';
  document.getElementById('name').textContent = user.name;
  document.getElementById('bio').textContent = user.bio;

  // Render social links
  const linksContainer = document.getElementById('links');
  linksContainer.innerHTML = ''; // Clear existing links

  user.links.forEach(link => {
    let iconClass = 'fas fa-link'; // Default icon

    // Set social icons based on label
    const labelLower = link.label.toLowerCase();
    if(labelLower.includes('twitter')) iconClass = 'fab fa-twitter';
    else if(labelLower.includes('instagram')) iconClass = 'fab fa-instagram';
    else if(labelLower.includes('youtube')) iconClass = 'fab fa-youtube';
    else if(labelLower.includes('github')) iconClass = 'fab fa-github';

    // Create link element
    const a = document.createElement('a');
    a.href = link.url;
    a.target = '_blank';
    a.innerHTML = `<i class="${iconClass}"></i> ${link.label}`;

    linksContainer.appendChild(a);
  });
}

// Automatically fetch profile.json from the same folder as index.html
fetch('profile.json')
  .then(response => response.json())
  .then(data => renderProfile(data))
  .catch(err => console.error('Error loading profile.json:', err));
