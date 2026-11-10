(() => {
  'use strict';
  const section = document.querySelector('.scroll-scene');
  const scene = document.querySelector('.scene');
  const images = [...document.querySelectorAll('.house-layer')];
  const buttons = [...document.querySelectorAll('[data-layer]')];
  const counter = document.querySelector('.layer-counter');
  const copy = document.querySelector('.layer-copy');
  const wipe = document.querySelector('.wipe-line');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const layers = [
    ['План-проект', 'Планировка и архитектурное решение.'],
    ['Основание', 'Фундамент и подготовка основания.'],
    ['Конструкция', 'Несущие стены и перекрытия.'],
    ['Внутри дома', 'Помещения и инженерные коммуникации.'],
    ['Экстерьер', 'Облицовка и готовый облик дома.']
  ];
  const modelImages = document.querySelector('.model-images');
  const intro = document.querySelector('.intro');
  const bottom = document.querySelector('.scene-bottom');
  const caption = document.querySelector('.model figcaption');
  let modelStart = {x: 0, y: 0, scale: 1};
  let measureFrame = 0;
  const clamp = value => Math.min(1, Math.max(0, value));
  const ease = value => 1 - Math.pow(1 - value, 3);
  function scrollMetrics() {
    const range = Math.max(1, section.offsetHeight - scene.offsetHeight);
    const introRange = reducedMotion.matches ? 0 : Math.min(scene.offsetHeight * 1.25, range);
    return {range, introRange, scanRange: Math.max(1, range - introRange)};
  }
  // Read the final layout only when it changes, with our transform removed.
  function measureModel() {
    measureFrame = 0;
    const previousTransform = modelImages.style.transform;
    modelImages.style.transform = 'none';
    const box = modelImages.getBoundingClientRect();
    const sceneBox = scene.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight;
    const imageRatio = images[0].naturalWidth && images[0].naturalHeight
      ? images[0].naturalWidth / images[0].naturalHeight : 1.5;
    const imageWidth = Math.min(box.width, box.height * imageRatio);
    const targetWidth = Math.min(viewportWidth * 0.95, viewportHeight * 1.5);
    modelStart = {
      x: viewportWidth / 2 - (box.left + box.width / 2),
      y: viewportHeight / 2 - (box.top - sceneBox.top + box.height / 2),
      scale: imageWidth > 0 ? targetWidth / imageWidth : 1
    };
    modelImages.style.transform = previousTransform;
    requestRender();
  }
  function requestMeasure() {
    if (!measureFrame) measureFrame = requestAnimationFrame(measureModel);
  }
  function showIntroPart(element, amount, distance) {
    element.style.opacity = amount.toFixed(4);
    element.style.transform = 'translateY(' + ((1 - amount) * distance).toFixed(3) + 'px)';
    element.inert = amount < 0.8;
  }
  let active = -1;
  let frame = 0;
  function render() {
    frame = 0;
    const {introRange, scanRange} = scrollMetrics();
    const travelled = Math.max(0, -section.getBoundingClientRect().top);
    const introProgress = introRange ? clamp(travelled / introRange) : 1;
    const cue = document.querySelector('.intro-scroll-cue');
    if(cue) cue.style.opacity = String(1 - clamp(introProgress * 4));
    const introImage = document.querySelector('.intro-house');
    const introFade = reducedMotion.matches ? 1 : clamp((introProgress - .72) / .28);
    introImage.style.opacity = String(1 - introFade);
    images.forEach(img => img.style.opacity = String(introFade));
    const arrival = ease(introProgress);
    const remaining = 1 - arrival;
    modelImages.style.transformOrigin = 'center center';
    modelImages.style.transform = 'translate(' + (modelStart.x * remaining).toFixed(3) + 'px,'
      + (modelStart.y * remaining).toFixed(3) + 'px) scale('
      + (1 + (modelStart.scale - 1) * remaining).toFixed(5) + ')';
    showIntroPart(intro, ease(clamp((introProgress - 0.25) / 0.75)), 26);
    showIntroPart(bottom, ease(clamp((introProgress - 0.65) / 0.35)), 12);
    showIntroPart(caption, ease(clamp((introProgress - 0.7) / 0.3)), 8);
    const progress = clamp((travelled - introRange) / scanRange);
    // Each layer gets a pause; the wipe occupies the middle of each interval.
    const position = progress * (layers.length - 1);
    const segment = Math.min(layers.length - 2, Math.floor(position));
    const fraction = Math.min(1, Math.max(0, (position - segment - 0.15) / 0.7));
    let nextActive = 0;
    const reveals = images.map((_, index) => index === 0 ? 1 : reducedMotion.matches
      ? (position >= index - 0.5 ? 1 : 0)
      : clamp((position - (index - 1) - 0.15) / 0.7));
    images.forEach((img, index) => {
      const reveal = reveals[index];
      const covered = reveals[index + 1] || 0;
      img.style.clipPath = 'inset(' + (covered * 100).toFixed(3) + '% 0 ' + ((1 - reveal) * 100).toFixed(3) + '% 0)';
      if (reveal >= 0.5) nextActive = index;
    });
    wipe.style.opacity = !reducedMotion.matches && fraction > 0 && fraction < 1 ? '0.6' : '0';
    wipe.style.top = (fraction * 100) + '%';
    if (nextActive !== active) {
      active = nextActive;
      counter.textContent = String(active + 1).padStart(2, '0') + ' / 05';
      copy.replaceChildren(document.createTextNode(layers[active][0]));
      const detail = document.createElement('span');
      detail.textContent = layers[active][1];
      copy.append(detail);
      buttons.forEach((button, index) => {
        button.classList.toggle('is-active', index === active);
        if (index === active) button.setAttribute('aria-current', 'step');
        else button.removeAttribute('aria-current');
      });
      images[0].alt = 'Концептуальная модель дома: ' + layers[active][0].toLowerCase() + '. ' + layers[active][1];
    }
  }
  function requestRender() { if (!frame) frame = requestAnimationFrame(render); }
  buttons.forEach(button => button.addEventListener('click', () => {
    const top = window.scrollY + section.getBoundingClientRect().top;
    const {introRange, scanRange} = scrollMetrics();
    window.scrollTo({top: top + introRange + scanRange * Number(button.dataset.layer) / (layers.length - 1), behavior: 'instant'});
  }));
  window.addEventListener('scroll', requestRender, {passive: true});
  window.addEventListener('resize', requestMeasure);
  reducedMotion.addEventListener('change', requestMeasure);
  const layoutObserver = new ResizeObserver(requestMeasure);
  layoutObserver.observe(scene);
  layoutObserver.observe(modelImages);
  images[0].addEventListener('load', requestMeasure);
  document.fonts.ready.then(requestMeasure);
  const trigger = document.querySelector('.discuss-button');
  const discussion = document.querySelector('#discussion');
  const notes = document.querySelector('#project-notes');
  function closeDiscussion() {
    discussion.hidden = true;
    scene.classList.remove('discussion-open');
    trigger.setAttribute('aria-expanded', 'false');
    requestMeasure();
    trigger.focus({preventScroll: true});
  }
  trigger.addEventListener('click', () => {
    if (!discussion.hidden) { closeDiscussion(); return; }
    discussion.hidden = false;
    scene.classList.add('discussion-open');
    trigger.setAttribute('aria-expanded', 'true');
    requestMeasure();
    notes.focus({preventScroll: true});
  });
  document.querySelector('.close-discussion').addEventListener('click', closeDiscussion);
  discussion.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); closeDiscussion(); }
  });
  measureModel();
  render();
})();

const leadForm=document.querySelector('#lead-form');
let pendingLead=null;
leadForm.addEventListener('submit',async event=>{event.preventDefault();if(!leadForm.reportValidity())return;const button=leadForm.querySelector('[type=submit]'),status=document.querySelector('#lead-status');const data=new FormData(leadForm);const fields={name:data.get('name'),contact:data.get('contact'),notes:data.get('notes'),website:data.get('website')||'',consent:data.get('consent')==='on'};const fingerprint=JSON.stringify(fields);if(!pendingLead||pendingLead.fingerprint!==fingerprint)pendingLead={id:crypto.randomUUID(),fingerprint};button.disabled=true;status.textContent='Сохраняем заявку и отправляем уведомление…';try{const response=await fetch('https://dimon-stroi-43-leads.proud-root-3195.chatgpt.site/api/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...fields,id:pendingLead.id}),signal:AbortSignal.timeout(50000)});const result=await response.json();if(!response.ok||!result.ok)throw new Error(result.error||'Не удалось подтвердить отправку.');status.textContent='Заявка сохранена в таблице и отправлена в Telegram. Спасибо!';leadForm.reset();pendingLead=null}catch(error){status.textContent=error.name==='TimeoutError'?'Ответ не получен. Повторите позже: номер заявки сохранён для защиты от повторной записи.':error.message}finally{button.disabled=false}});
