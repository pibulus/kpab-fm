(function() {
  const mutinyToggle = document.getElementById('mutinyToggle');
  const mutinyPanel = document.getElementById('mutinyPanel');
  const mutinyStatus = document.getElementById('mutinyStatus');
  const mutinyDesc = document.getElementById('mutinyDesc');
  const mutinyFire = document.getElementById('mutinyFire');
  const mutinyToast = document.getElementById('mutinyToast');
  let mutinyCooldown = false;
  let cooldownTick = null;

  function showMutinyToast(msg, duration = 3000) {
    mutinyToast.textContent = msg;
    mutinyToast.classList.add('show');
    setTimeout(() => mutinyToast.classList.remove('show'), duration);
  }

  function setMutinyCooldown(seconds) {
    mutinyCooldown = true;
    if (cooldownTick) clearInterval(cooldownTick);
    mutinyToggle.classList.add('cooldown');
    mutinyToggle.classList.remove('voted');
    mutinyFire.disabled = true;
    mutinyFire.style.opacity = '0.3';
    mutinyFire.style.cursor = 'not-allowed';
    mutinyStatus.textContent = 'COOLING DOWN';
    mutinyDesc.textContent = 'Mutiny on cooldown. Try again in a few minutes.';
    const end = Date.now() + seconds * 1000;
    cooldownTick = setInterval(() => {
      const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      if (left <= 0) {
        clearInterval(cooldownTick);
        cooldownTick = null;
        mutinyCooldown = false;
        mutinyToggle.classList.remove('cooldown');
        mutinyToggle.innerHTML = '&#x2620; MUTINY';
        mutinyFire.disabled = false;
        mutinyFire.style.opacity = '1';
        mutinyFire.style.cursor = 'pointer';
        mutinyFire.innerHTML = '&#x2620; WALK THE PLANK';
        mutinyStatus.textContent = 'READY';
        mutinyDesc.textContent = "Don't like what's playing? Call a mutiny.";
        return;
      }
      const display = left > 60 ? Math.ceil(left/60) + 'm' : left + 's';
      mutinyToggle.innerHTML = '&#x2620; MUTINY (' + display + ')';
    }, 1000);
  }

  mutinyToggle.addEventListener('click', () => {
    const isOpen = mutinyPanel.classList.contains('open');
    mutinyPanel.classList.toggle('open');
    if (!mutinyCooldown) {
      mutinyToggle.innerHTML = isOpen ? '&#x2620; MUTINY' : '&#x2620; Close';
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mutinyPanel.classList.contains('open')) {
      mutinyPanel.classList.remove('open');
      if (!mutinyCooldown) mutinyToggle.innerHTML = '&#x2620; MUTINY';
    }
  });

  mutinyFire.addEventListener('click', async () => {
    if (mutinyCooldown) return;
    mutinyCooldown = true;
    mutinyFire.disabled = true;
    mutinyFire.textContent = '...';
    try {
      const res = await fetch(STATION.mutinyEndpoint, { method: 'POST' });
      if (!res.ok && res.status !== 429) {
        throw new Error('HTTP ' + res.status);
      }
      const data = await res.json();
      if (res.status === 429) {
        showMutinyToast(data.message);
        setMutinyCooldown(data.remaining || 300);
        mutinyPanel.classList.remove('open');
        return;
      }
      if (data.action === 'skipped') {
        showMutinyToast(data.message);
        mutinyPanel.classList.remove('open');
        setMutinyCooldown(300);
      } else if (data.action === 'voted') {
        mutinyToggle.classList.add('voted');
        mutinyStatus.textContent = data.votes + '/' + data.needed + ' VOTES';
        mutinyDesc.textContent = data.message;
        mutinyFire.innerHTML = '&#x2620; VOTED';
        showMutinyToast(data.message, 5000);
      }
    } catch (e) {
      mutinyCooldown = false;
      mutinyFire.disabled = false;
      showMutinyToast('Mutiny failed. Radio resists.');
      mutinyFire.innerHTML = '&#x2620; WALK THE PLANK';
    }
  });
})();
