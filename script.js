const $ = id => document.getElementById(id);
    const records = new Map();
    let selectedId = null;
    let sdkReady = false;
    let previousFocus = null;
    const categories = new Set(['Jardinage','Bricolage','Courses','Informatique','Transport','Animaux','Autre']);

    function message(id, text, error = false) {
      const node = $(id);
      node.textContent = text;
      node.style.color = error ? '#a84839' : '#173e35';
    }
    function formatDate(value) {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('fr-FR', {day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(date);
    }
    async function hashCode(code) {
      const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code));
      return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2,'0')).join('');
    }
    function openModal(id) {
      previousFocus = document.activeElement;
      $(id).hidden = false;
      document.body.style.overflow = 'hidden';
      $(id).querySelector('button, input').focus();
    }
    function closeModals() {
      document.querySelectorAll('.modal-backdrop').forEach(el => el.hidden = true);
      document.body.style.overflow = '';
      previousFocus?.focus();
    }
    function updateCard(node, item) {
      const label = item.type === 'offre' ? 'JE PROPOSE' : 'J’AI BESOIN';
      const photo = node.querySelector('[data-template-id="listing-photo"]');
      const photoUrl = String(item.photo_url || '').trim();
      node.querySelector('[data-template-id="listing-type"]').textContent = label;
      photo.hidden = !/^https:\/\//i.test(photoUrl);
      if (!photo.hidden) photo.src = photoUrl;
      else photo.removeAttribute('src');
      node.querySelector('[data-template-id="listing-title"]').textContent = item.titre || '';
      node.querySelector('[data-template-id="listing-description"]').textContent = item.description || '';
      node.querySelector('[data-template-id="listing-meta"]').textContent = `${item.categorie || 'Autre'} · ${item.commune || ''} · ${formatDate(item.created_at)}`;
    }
    function render() {
      const query = $('search').value.trim().toLocaleLowerCase('fr');
      const type = $('type-filter').value;
      const category = $('category-filter').value;
      const matches = [...records.values()].filter(item =>
        (!type || item.type === type) &&
        (!category || item.categorie === category) &&
        (!query || [item.titre,item.description,item.commune].some(v => String(v || '').toLocaleLowerCase('fr').includes(query)))
      ).sort((a,b) => String(b.created_at).localeCompare(String(a.created_at)));
      const list = $('list');
      const visible = new Set(matches.map(item => item.__backendId));
      [...list.children].forEach(node => { if (!visible.has(node.dataset.recordId)) node.remove(); });
      matches.forEach(item => {
        let node = [...list.children].find(el => el.dataset.recordId === item.__backendId);
        if (!node) {
          node = $('listing-template').content.firstElementChild.cloneNode(true);
          node.dataset.recordId = item.__backendId;
          node.querySelector('button').addEventListener('click', () => showDetail(item.__backendId));
        }
        updateCard(node, item);
        list.appendChild(node);
      });
      $('count').textContent = `${matches.length} annonce${matches.length > 1 ? 's' : ''}`;
      $('empty').hidden = matches.length !== 0;
      if (records.size >= 999) message('status','La limite de 999 annonces est atteinte. Supprimez une annonce avant d’en publier une autre.',true);
    }
    function showDetail(id) {
      const item = records.get(id);
      if (!item) return;
      selectedId = id;
      $('detail-type').textContent = item.type === 'offre' ? 'JE PROPOSE' : 'J’AI BESOIN';
      $('detail-title').textContent = item.titre || '';
      $('detail-meta').textContent = [item.categorie,item.commune,formatDate(item.created_at)].filter(Boolean).join(' · ');
      const detailPhoto = $('detail-photo');
      const detailPhotoUrl = String(item.photo_url || '').trim();
      detailPhoto.hidden = !/^https:\/\//i.test(detailPhotoUrl);
      if (!detailPhoto.hidden) detailPhoto.src = detailPhotoUrl;
      else detailPhoto.removeAttribute('src');
      $('detail-description').textContent = item.description || '';
      $('request-pending').classList.toggle('hidden', item.status === 'accepted');
      $('request-accepted').classList.toggle('hidden', item.status !== 'accepted');
      $('delete-form').classList.add('hidden');
      $('delete-form').reset();
      message('delete-message','');
      openModal('detail-modal');
    }
    const handler = {
      onDataChanged(data) {
        const fresh = new Set(data.map(item => item.__backendId));
        for (const id of records.keys()) if (!fresh.has(id)) records.delete(id);
        for (const item of data) records.set(item.__backendId,item);
        render();
      }
    };
    async function init() {
      if (!window.dataSdk) { message('status','Impossible de charger les annonces. Réessayez plus tard.',true); return; }
      try {
        const result = await window.dataSdk.init(handler);
        sdkReady = result.isOk;
        if (!result.isOk) message('status','Impossible de charger les annonces. Réessayez plus tard.',true);
        else message('status','');
      } catch (_) { message('status','Impossible de charger les annonces. Réessayez plus tard.',true); }
    }
    document.querySelectorAll('[data-open="publish"]').forEach(button => button.addEventListener('click', () => {
      message('publish-message','');
      openModal('publish-modal');
    }));
    document.querySelectorAll('.close-modal').forEach(button => button.addEventListener('click',closeModals));
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.addEventListener('click', event => {
      if (event.target === backdrop) closeModals();
    }));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && [...document.querySelectorAll('.modal-backdrop')].some(el => !el.hidden)) closeModals();
    });
    ['search','type-filter','category-filter'].forEach(id => $(id).addEventListener(id === 'search' ? 'input' : 'change',render));
    $('publish-form').addEventListener('submit',async event => {
      event.preventDefault();
      if (!sdkReady) { message('publish-message','Les annonces ne sont pas disponibles. Réessayez plus tard.',true); return; }
      if (records.size >= 999) { message('publish-message','La limite de 999 annonces est atteinte.',true); return; }
      const button = $('publish-submit');
      button.disabled = true;
      message('publish-message','Publication en cours…');
      try {
        if (!$('engagement-check').checked) { message('publish-message','Vous devez accepter l’engagement avant de publier votre annonce.',true); return; }
        const code = $('publish-code').value.trim();
        if (!/^\d{5}$/.test(code)) { message('publish-message','Saisissez exactement cinq chiffres.',true); return; }
        const result = await window.dataSdk.create({
          type:$('publish-type').value,
          categorie:categories.has($('publish-category').value) ? $('publish-category').value : 'Autre',
          titre:$('publish-name').value.trim(),
          description:$('publish-description').value.trim(),
          commune:$('publish-town').value.trim(),
          code_hash:await hashCode(code),
          created_at:new Date().toISOString(),
          status:'pending'
        });
        if (!result.isOk) { message('publish-message','La publication a échoué. Réessayez.',true); return; }
        $('publish-form').reset();
        closeModals();
        message('status','Votre annonce a bien été publiée.');
      } catch (_) { message('publish-message','La publication a échoué. Réessayez.',true); }
      finally { button.disabled = false; }
    });
    $('request-pending').addEventListener('click',async () => {
      const item = records.get(selectedId);
      if (!sdkReady || !item || item.status === 'accepted') return;
      const button = $('request-pending');
      button.disabled = true;
      const result = await window.dataSdk.update({...item, status:'accepted'});
      button.disabled = false;
      if (result.isOk) {
        item.status = 'accepted';
        $('request-pending').classList.add('hidden');
        $('request-accepted').classList.remove('hidden');
        window.open('https://form.jotform.com/263102513390042', '_blank', 'noopener,noreferrer');
      } else {
        message('delete-message','Impossible d’accepter la demande. Réessayez.',true);
      }
    });
    $('show-delete').addEventListener('click',() => { $('delete-form').classList.remove('hidden'); $('delete-code').focus(); });
    $('cancel-delete').addEventListener('click',() => { $('delete-form').classList.add('hidden'); $('delete-form').reset(); message('delete-message',''); });
    $('delete-form').addEventListener('submit',async event => {
      event.preventDefault();
      const item = records.get(selectedId);
      if (!sdkReady || !item) { message('delete-message','Annonce indisponible. Réessayez.',true); return; }
      const button = $('delete-submit');
      button.disabled = true;
      message('delete-message','Vérification en cours…');
      try {
        const entered = $('delete-code').value.trim();
        const expectedHash = String(item.code_hash || '').trim().toLowerCase();
        const enteredHash = await hashCode(entered);
        if (!/^\d{5}$/.test(entered) || !expectedHash || enteredHash.toLowerCase() !== expectedHash) {
          message('delete-message','Code incorrect. Vérifiez les cinq chiffres saisis.',true); return;
        }
        const result = await window.dataSdk.delete(item);
        if (!result.isOk) { message('delete-message','La suppression a échoué. Réessayez.',true); return; }
        closeModals();
        message('status','Votre annonce a bien été supprimée.');
      } catch (_) { message('delete-message','La suppression a échoué. Réessayez.',true); }
      finally { button.disabled = false; }
    });
    if (window.lucide) lucide.createIcons();
    init();
