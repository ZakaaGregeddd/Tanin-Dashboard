const BLYNK_AUTH = "W5NiDhgfgxhvZMF8Qh_gg0AsITSdqhci";
const BLYNK_URL = "https://blynk.cloud/external/api";

(function initPalkaDashboard() {
  let waterPercent = 0;
  let salinity = 0.0;
  let isManualOverride = false;

  async function pushSalinityToBlynk(val) {
    try {
      await fetch(`${BLYNK_URL}/update?token=${BLYNK_AUTH}&V3=${val}`);
    } catch (err) {
      console.error("Gagal update Blynk", err);
    }
  }

  async function fetchBlynkData() {
    try {
      // Hanya tarik data sensor ketinggian air (V0)
      const resV0 = await fetch(`${BLYNK_URL}/get?token=${BLYNK_AUTH}&V0`);
      waterPercent = parseInt(await resV0.text()) || 0;

      updateDashboard();
    } catch (err) {
      console.error("Gagal mengambil data dari Blynk", err);
    }
  }

  const safeGet = (id) => safeGet(id) || {
    get textContent() { return ''; }, set textContent(v) {},
    get className() { return ''; }, set className(v) {},
    get innerHTML() { return ''; }, set innerHTML(v) {},
    get value() { return ''; }, set value(v) {},
    classList: { add: ()=>{}, remove: ()=>{} },
    style: {},
    addEventListener: ()=>{}
  };

  const salinityRange = safeGet("salinityRange");
  const salinityNumberInput = safeGet("salinityNumberInput");
  const salinityBigDisplay = safeGet("salinityBigDisplay");
  const salinityGradeTag = safeGet("salinityGradeTag");

  const waterPercentageValue = safeGet("waterPercentageValue");
  const waterProgressRing = safeGet("waterProgressRing");
  const waterStatusPill = safeGet("waterStatusPill");

  const headerWaterStatus = safeGet("headerWaterStatus");
  const headerGateBadge = safeGet("headerGateBadge");
  const headerAlarmText = safeGet("headerAlarmText");
  const alarmBeaconDot = safeGet("alarmBeaconDot");

  const sluiceStateLabel = safeGet("sluiceStateLabel");
  const sluiceGateVisual = safeGet("sluiceGateVisual");
  const ledD14Box = safeGet("ledD14Box");
  const ledD14Indicator = safeGet("ledD14Indicator");
  const ledD14Status = safeGet("ledD14Status");
  const ledD13Box = safeGet("ledD13Box");
  const ledD13Indicator = safeGet("ledD13Indicator");
  const ledD13Status = safeGet("ledD13Status");
  const alarmCardFooter = safeGet("alarmCardFooter");
  const alarmStreamDesc = safeGet("alarmStreamDesc");

  const flowStep1Result = safeGet("flowStep1Result");
  const flowStep2Result = safeGet("flowStep2Result");
  const flowStep3Result = safeGet("flowStep3Result");
  const logicBannerBox = safeGet("logicBannerBox");
  const logicBannerIcon = safeGet("logicBannerIcon");
  const logicBannerText = safeGet("logicBannerText");

  const tblV0 = safeGet("tblV0");
  const tblV1 = safeGet("tblV1");
  const tblV2 = safeGet("tblV2");
  const tblV3 = safeGet("tblV3");
  const tblV4 = safeGet("tblV4");

  const btnRefresh = safeGet("btnRefresh");
  const btnOverride = safeGet("btnOverride");

  function updateDashboard() {
    // 1. Water Gauge Update
    waterPercentageValue.textContent = waterPercent + "%";
    tblV0.textContent = waterPercent + "%";
    const perimeter = 314.159;
    const offset = perimeter - (waterPercent / 100) * perimeter;
    waterProgressRing.style.strokeDashoffset = offset;

    const isWaterLow = waterPercent < 30;
    if (isWaterLow) {
      waterProgressRing.classList.remove("text-crop-emerald");
      waterProgressRing.classList.add("text-warning-amber");
      waterStatusPill.className =
        "mt-1 font-label-sm text-label-sm px-space-sm py-0.5 rounded-full bg-warning-amber-surface text-warning-amber font-semibold";
      waterStatusPill.textContent = "Status V1: Kering";
      headerWaterStatus.textContent = "Kering (< 30%)";
      tblV1.textContent = '"Kering"';
      flowStep1Result.textContent =
        waterPercent + "% < 30% (Kebutuhan Terdeteksi)";
    } else {
      waterProgressRing.classList.remove("text-warning-amber");
      waterProgressRing.classList.add("text-crop-emerald");
      waterStatusPill.className =
        "mt-1 font-label-sm text-label-sm px-space-sm py-0.5 rounded-full bg-crop-emerald-surface text-primary font-semibold";
      waterStatusPill.textContent = "Status V1: Cukup";
      headerWaterStatus.textContent = "Air Tercukupi";
      tblV1.textContent = '"Cukup"';
      flowStep1Result.textContent = waterPercent + "% >= 30% (Lahan Basah)";
    }

    // 2. Salinity Display
    salinityBigDisplay.textContent = salinity.toFixed(2);
    tblV3.textContent = salinity.toFixed(2) + " ppt";
    const isSalinityDangerous = salinity > 0.5;

    if (isSalinityDangerous) {
      salinityGradeTag.className =
        "font-label-sm text-label-sm bg-alarm-crimson-surface text-alarm-crimson px-space-sm py-0.5 rounded font-semibold";
      salinityGradeTag.textContent = "INTRUSI AIR ASIN";
      flowStep2Result.textContent =
        salinity.toFixed(2) + " ppt > 0.50 ppt (Bahaya Payau)";
    } else {
      salinityGradeTag.className =
        "font-label-sm text-label-sm bg-crop-emerald-surface text-primary px-space-sm py-0.5 rounded font-semibold";
      salinityGradeTag.textContent = "LAYAK IRIGASI";
      flowStep2Result.textContent =
        salinity.toFixed(2) + " ppt <= 0.50 ppt (Aman)";
    }

    // 3. Logic & Palka Actuation Rules
    // Rule 1: Salinity > 0.50 -> TUTUP DARURAT
    // Rule 2: Salinity <= 0.50 AND Water < 30 -> TERBUKA (Alir Air)
    // Rule 3: Salinity <= 0.50 AND Water >= 30 -> TERTUTUP (Air sudah cukup)

    if (isSalinityDangerous) {
      // TUTUP DARURAT
      headerGateBadge.textContent = "TUTUP DARURAT";
      headerGateBadge.className =
        "font-headline-sm text-headline-sm text-alarm-crimson font-bold";
      headerAlarmText.textContent = "BAHAYA SALINITAS!";
      alarmBeaconDot.className =
        "w-3 h-3 rounded-full bg-alarm-crimson animate-ping absolute";

      sluiceStateLabel.textContent = "POSISI: TERKUNCI RAPAT";
      sluiceStateLabel.className = "text-alarm-crimson font-bold";
      sluiceGateVisual.className =
        "w-32 h-14 bg-alarm-crimson rounded-md shadow-md flex items-center justify-center transition-all duration-700 translate-y-3";
      sluiceGateVisual.innerHTML =
        '<span class="material-symbols-outlined text-on-primary text-[24px]">lock</span><span class="font-label-sm text-label-sm text-on-primary font-semibold ml-1">LOCKED</span>';

      // LEDs: D14 MATI, D13 MENYALA HIJAU AMAN/TERTUTUP
      ledD14Box.className =
        "flex items-center gap-space-xs bg-surface-subtle p-space-xs rounded-lg px-space-sm opacity-50 transition-colors";
      ledD14Indicator.className = "w-3 h-3 rounded-full bg-text-muted";
      ledD14Status.textContent = "MATI (Standby)";
      ledD14Status.className = "font-body-sm text-body-sm text-text-muted";

      ledD13Box.className =
        "flex items-center gap-space-xs bg-crop-emerald-surface p-space-xs rounded-lg px-space-sm transition-colors";
      ledD13Indicator.className =
        "w-3 h-3 rounded-full bg-crop-emerald shadow-[0_0_8px_rgba(16,185,129,0.6)]";
      ledD13Status.textContent = "AKTIF (Tertutup)";
      ledD13Status.className =
        "font-body-sm text-body-sm text-primary font-medium";

      alarmCardFooter.className =
        "bg-alarm-crimson-surface rounded-lg p-space-sm flex items-center justify-between";
      alarmStreamDesc.className =
        "font-body-sm text-body-sm font-semibold text-alarm-crimson";
      alarmStreamDesc.textContent =
        "V4 Sinyal Darurat: Salinitas tinggi terdeteksi (> 0.50 ppt)";

      flowStep3Result.textContent = "Kunci Palka (D13 HIGH / Palka Ditutup)";
      flowStep3Result.className =
        "material-symbols-outlined text-alarm-crimson text-[16px]";

      logicBannerBox.className =
        "w-full bg-alarm-crimson-surface rounded-lg p-space-md flex items-center gap-space-md transition-colors duration-300";
      logicBannerIcon.className =
        "w-10 h-10 rounded-full bg-alarm-crimson text-on-primary flex items-center justify-center shrink-0";
      logicBannerIcon.innerHTML =
        '<span class="material-symbols-outlined text-[24px]">gpp_bad</span>';
      logicBannerText.textContent =
        "PERINGATAN: Intrusi salinitas (" +
        salinity.toFixed(2) +
        " ppt > 0.50 ppt) terdeteksi. Palka segera DIKUNCI DARURAT untuk mencegah kerusakan bibit sawah!";

      tblV2.textContent = "0 (Terkunci Darurat)";
      tblV2.className =
        "py-2.5 px-space-sm text-right font-mono-metric text-mono-metric font-semibold text-alarm-crimson";
      tblV4.textContent = "EMERGENCY LOCK";
      tblV4.className =
        "py-2.5 px-space-sm text-right font-mono-metric text-mono-metric font-semibold text-alarm-crimson";
    } else if (isWaterLow) {
      // NORMAL TERBUKA
      headerGateBadge.textContent = "TERBUKA";
      headerGateBadge.className =
        "font-headline-sm text-headline-sm text-primary font-bold";
      headerAlarmText.textContent = "Irigasi Berjalan";
      alarmBeaconDot.className =
        "w-3 h-3 rounded-full bg-warning-amber animate-ping absolute";

      sluiceStateLabel.textContent = "POSISI: NAIK (MENGALIR)";
      sluiceStateLabel.className = "text-primary font-bold";
      sluiceGateVisual.className =
        "w-32 h-14 bg-crop-emerald/80 rounded-md shadow-md flex items-center justify-center transition-all duration-700 -translate-y-4";
      sluiceGateVisual.innerHTML =
        '<span class="material-symbols-outlined text-on-primary text-[24px]">vertical_align_top</span><span class="font-label-sm text-label-sm text-on-primary font-semibold ml-1">TERBUKA</span>';

      // LEDs: D14 MENYALA MERAH, D13 MATI
      ledD14Box.className =
        "flex items-center gap-space-xs bg-alarm-crimson-surface p-space-xs rounded-lg px-space-sm transition-colors";
      ledD14Indicator.className =
        "w-3 h-3 rounded-full bg-alarm-crimson shadow-[0_0_8px_rgba(239,68,68,0.6)]";
      ledD14Status.textContent = "AKTIF (Terbuka)";
      ledD14Status.className =
        "font-body-sm text-body-sm text-alarm-crimson font-medium";

      ledD13Box.className =
        "flex items-center gap-space-xs bg-surface-subtle p-space-xs rounded-lg px-space-sm opacity-50 transition-colors";
      ledD13Indicator.className = "w-3 h-3 rounded-full bg-text-muted";
      ledD13Status.textContent = "MATI (Standby)";
      ledD13Status.className = "font-body-sm text-body-sm text-text-muted";

      alarmCardFooter.className =
        "bg-crop-emerald-surface rounded-lg p-space-sm flex items-center justify-between";
      alarmStreamDesc.className =
        "font-body-sm text-body-sm font-semibold text-primary";
      alarmStreamDesc.textContent =
        "V4 Sinyal Normal: Irigasi Berlangsung Aman";

      flowStep3Result.textContent = "Buka Palka (D14 HIGH / V2 ON)";
      flowStep3Result.className =
        "material-symbols-outlined text-crop-emerald text-[16px]";

      logicBannerBox.className =
        "w-full bg-crop-emerald-surface rounded-lg p-space-md flex items-center gap-space-md transition-colors duration-300";
      logicBannerIcon.className =
        "w-10 h-10 rounded-full bg-crop-emerald text-on-primary flex items-center justify-center shrink-0";
      logicBannerIcon.innerHTML =
        '<span class="material-symbols-outlined text-[24px]">published_with_changes</span>';
      logicBannerText.textContent =
        "Mode Otomatis Aktif: Sawah membutuhkan air (" +
        waterPercent +
        "%) & Salinitas aman (" +
        salinity.toFixed(2) +
        " ppt) -> Palka DIBUKA secara aman.";

      tblV2.textContent = "1 (Terbuka)";
      tblV2.className =
        "py-2.5 px-space-sm text-right font-mono-metric text-mono-metric font-semibold text-crop-emerald";
      tblV4.textContent = "HIGH (Mengalir)";
      tblV4.className =
        "py-2.5 px-space-sm text-right font-mono-metric text-mono-metric font-semibold text-crop-emerald";
    } else {
      // AIR TERCUKUPI, SALINITAS AMAN -> TERTUTUP NORMAL
      headerGateBadge.textContent = "TERTUTUP";
      headerGateBadge.className =
        "font-headline-sm text-headline-sm text-text-secondary font-bold";
      headerAlarmText.textContent = "Siaga Normal";
      alarmBeaconDot.className = "hidden";

      sluiceStateLabel.textContent = "POSISI: TERTUTUP BIASA";
      sluiceStateLabel.className = "text-text-secondary font-bold";
      sluiceGateVisual.className =
        "w-32 h-14 bg-text-muted rounded-md shadow-md flex items-center justify-center transition-all duration-700 translate-y-3";
      sluiceGateVisual.innerHTML =
        '<span class="material-symbols-outlined text-on-primary text-[24px]">check</span><span class="font-label-sm text-label-sm text-on-primary font-semibold ml-1">TERTUTUP</span>';

      ledD14Box.className =
        "flex items-center gap-space-xs bg-surface-subtle p-space-xs rounded-lg px-space-sm opacity-50 transition-colors";
      ledD14Indicator.className = "w-3 h-3 rounded-full bg-text-muted";
      ledD14Status.textContent = "MATI";

      ledD13Box.className =
        "flex items-center gap-space-xs bg-crop-emerald-surface p-space-xs rounded-lg px-space-sm transition-colors";
      ledD13Indicator.className = "w-3 h-3 rounded-full bg-crop-emerald";
      ledD13Status.textContent = "AKTIF (Tertutup)";
      ledD13Status.className =
        "font-body-sm text-body-sm text-primary font-medium";

      alarmCardFooter.className =
        "bg-surface-subtle rounded-lg p-space-sm flex items-center justify-between";
      alarmStreamDesc.className =
        "font-body-sm text-body-sm font-semibold text-text-secondary";
      alarmStreamDesc.textContent =
        "V4 Sinyal Standby: Ketinggian Air Lahan Optimal";

      flowStep3Result.textContent = "Palka Ditutup (Air Cukup >= 30%)";

      logicBannerBox.className =
        "w-full bg-surface-subtle rounded-lg p-space-md flex items-center gap-space-md transition-colors duration-300";
      logicBannerIcon.className =
        "w-10 h-10 rounded-full bg-text-secondary text-surface-card flex items-center justify-center shrink-0";
      logicBannerIcon.innerHTML =
        '<span class="material-symbols-outlined text-[24px]">water_full</span>';
      logicBannerText.textContent =
        "Sawah tercukupi (" +
        waterPercent +
        "% >= 30%). Pintu palka tertutup untuk efisiensi debit air.";

      tblV2.textContent = "0 (Tertutup Normal)";
      tblV2.className =
        "py-2.5 px-space-sm text-right font-mono-metric text-mono-metric font-semibold text-text-secondary";
      tblV4.textContent = "LOW (Standby)";
      tblV4.className =
        "py-2.5 px-space-sm text-right font-mono-metric text-mono-metric font-semibold text-text-secondary";
    }
  }

  // Interactivity: Range Slider & Input Binding
  // Ubah ke 'change' agar tidak spam API saat di-drag
  salinityRange.addEventListener("change", function (e) {
    salinity = parseFloat(e.target.value);
    salinityNumberInput.value = salinity.toFixed(2);
    pushSalinityToBlynk(salinity);
    updateDashboard();
  });

  salinityRange.addEventListener("input", function (e) {
    // Update UI dan logika lokal secara live saat di-drag
    salinity = parseFloat(e.target.value);
    salinityNumberInput.value = salinity.toFixed(2);
    updateDashboard(); // Memperbarui angka besar di card secara instan
  });

  salinityNumberInput.addEventListener("change", function (e) {
    let val = parseFloat(e.target.value);
    if (isNaN(val)) val = 0.0;
    if (val < 0) val = 0;
    if (val > 40) val = 40;
    salinity = val;
    salinityRange.value = Math.min(val, 40.0);
    pushSalinityToBlynk(salinity);
    updateDashboard();
  });

  // Refresh Micro-Interaction
  btnRefresh.addEventListener("click", function () {
    btnRefresh.classList.add("rotate-180");
    fetchBlynkData().then(() => {
      setTimeout(function () {
        btnRefresh.classList.remove("rotate-180");
      }, 350);
    });
  });

  // Manual Override toggle simulation
  btnOverride.addEventListener("click", function () {
    isManualOverride = !isManualOverride;
    if (isManualOverride) {
      btnOverride.classList.remove("bg-primary");
      btnOverride.classList.add("bg-warning-amber", "text-text-primary");
      btnOverride.innerHTML =
        '<span class="material-symbols-outlined text-[18px]">lock</span><span>Override Aktif (Manual)</span>';
    } else {
      btnOverride.classList.remove("bg-warning-amber", "text-text-primary");
      btnOverride.classList.add("bg-primary", "text-on-primary");
      btnOverride.innerHTML =
        '<span class="material-symbols-outlined text-[18px]">tune</span><span>Buka Manual Override</span>';
    }
  });

  // Initial calculation run
  fetchBlynkData();
  setInterval(fetchBlynkData, 2000); // Polling otomatis tiap 2 detik ke Blynk
})();
