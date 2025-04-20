window.launchReverseDCF = function () { 
  if (document.getElementById('myBookmarkletPopup')) return;

  const popup = document.createElement('div');
  popup.id = 'myBookmarkletPopup';
  popup.style = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 99999;
    background: #fff;
    border: 1px solid #ccc;
    padding: 10px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  `;

  const labels = ['P/E', 'P/BV', 'EV/EBITDA'];
  let m = '', n = '', m1 = 18, m2 = 15, m3 = 20;

  function updateValues(label) {
    if (label === 'P/E') {
      n = Array.from(document.querySelectorAll('#profit-loss table.data-table tbody tr'))
        .find(r => r.cells[0].innerText.includes('Net Profit'))
        ?.querySelectorAll('td:last-child')[0]?.innerText?.replaceAll(',', '');

      m = document.querySelector('#top-ratios li')
        ?.getElementsByClassName('value')[0]
        ?.getElementsByClassName('number')[0]
        ?.innerText?.replaceAll(',', '');

    } else if (label === 'P/BV') {
      m = document.querySelectorAll('#top-ratios li')[1]
        ?.getElementsByClassName('value')[0]
        ?.getElementsByClassName('number')[0]
        ?.innerText?.replaceAll(',', '');

      n = document.querySelectorAll('#top-ratios li')[4]
        ?.getElementsByClassName('value')[0]
        ?.getElementsByClassName('number')[0]
        ?.innerText?.replaceAll(',', '');

      m1 = 4; m2 = 4; m3 = 5;

    } else if (label === 'EV/EBITDA') {
      const allRatios = document.querySelectorAll('#top-ratios li');

      for (let indx = 0; indx <= allRatios.length; ++indx) {
        const elem = document.querySelectorAll("#top-ratios li")[indx];
        if (elem?.getElementsByClassName("name")?.[0]?.innerText === "Enterprise Value") {
          m = elem?.getElementsByClassName("value")?.[0]?.innerText?.match(/[\d,]+/)[0].replace(/,/g, '');
          break;
        }
      }

      n = Array.from(document.querySelectorAll('#profit-loss table.data-table tbody tr'))
        .find(r => r.cells[0].innerText.includes('Operating Profit'))
        ?.querySelectorAll('td:last-child')[0]?.innerText?.replaceAll(',', '');

      m1 = 15; m2 = 15; m3 = 18;
    }

    cleanup();
    openPopup();
  }

  labels.forEach(label => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style = 'margin:5px;padding:6px 10px;cursor:pointer;';
    btn.onclick = () => updateValues(label);
    popup.appendChild(btn);
  });

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.style = `
    top:2px;
    right:5px;
    background:none;
    border:none;
    font-size:16px;
    cursor:pointer;
    color:#888;
  `;
  closeBtn.onclick = () => cleanup();
  popup.appendChild(closeBtn);

  document.body.appendChild(popup);

  function handleClickOutside(e) {
    if (!popup.contains(e.target)) cleanup();
  }

  function cleanup() {
    document.removeEventListener('click', handleClickOutside, true);
    popup.remove();
  }

  setTimeout(() => {
    document.addEventListener('click', handleClickOutside, true);
  }, 0);

  function openPopup() {
    const t = `mc=${m}&e=${n}&dr=25&m1=${m1}&m2=${m2}&m3=${m3}&d3=3`;
    const k = 'calc_encryption_key_13624';

    if (t && k && window.CryptoJS) {
      const encrypted = CryptoJS.RC4.encrypt(t, k).toString();
      const url = `https://calc-fin.netlify.app/#/calculator/reverse-dcf?calcId=${encodeURIComponent(encrypted)}`;
      window.open(url);
    } else {
      console.error('Text and key are required, or CryptoJS not loaded!');
    }
  }

  if (typeof CryptoJS === 'undefined') {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js';
    document.head.appendChild(s);
  }
}
