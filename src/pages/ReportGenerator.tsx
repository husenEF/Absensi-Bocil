import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { escapeHtml } from '../roster';
import { isTooLongForWhatsApp, shareToWhatsApp } from '../utils/share';
import { Button } from '../ui/Button';
import { formatIndonesianDate } from '../utils/date';
import { db, ExcelReportRecord } from '../db';
import { AlertCircle, BookOpen, Calendar, Check, CheckSquare, ChevronRight, Copy, FileSpreadsheet, FileText, HelpCircle, Info, Play, Plus, RefreshCw, Save, Send, Sliders, Smartphone, Square, Trash2, UserCheck, UserPlus, X } from 'lucide-react';

interface StudentRow {
  name: string;
  category: 'K' | 'P';
  attendance: string[]; // parallel to 5 columns
  pendampingan: string;
  hs: string;
  jm: string;
  sppKeterangan: string; // V, T, S, I, A or empty
  sppNominal: number;
  buletinCetak: boolean;
  buletinDigital: boolean;
}

export const ReportGenerator: React.FC = () => {
  const {
    selectedPeriodKey,
    setSelectedPeriodKey,
    reportScheduleFilter,
    setReportScheduleFilter,
    reportSelectedRecordIds,
    setReportSelectedRecordIds,
    reportText,
    reportGenerated,
    copied,
    availablePeriods,
    currentPeriod,
    filteredRecordsForReport,
    recordsInSelectedPeriod,
    handleGenerateReport,
    handleCopyReport,
    reportTextareaRef,
    schedules,
    todayIsThirdWeek,
    hideWeekReminder,
    handleDismissWeekReminder,
    handleLoadSampleData,
    records,
    showToast
  } = useApp();

  // Sub-tabs state: 'whatsapp' (original) or 'excel' (new)
  const [reportMode, setReportMode] = useState<'whatsapp' | 'excel'>('whatsapp');

  // Excel Form States
  const [guruName, setGuruName] = useState<string>('Guru 1');
  const [kitabName, setKitabName] = useState<string>('Nama Kitab');
  const [tanggalAktif, setTanggalAktif] = useState<string>('');
  const [weeks, setWeeks] = useState<string[]>(['Pekan 1', 'Pekan 2', 'Pekan 3', 'Pekan 4', 'Pekan 5']);
  const [studentsData, setStudentsData] = useState<StudentRow[]>([]);
  const [catatan, setCatatan] = useState<string>('');
  
  /**
   * Hand the report to WhatsApp.
   *
   * Called straight from the tap so the share sheet keeps its user
   * activation; awaiting anything first would lose it.
   */
  const handleShareReport = async () => {
    if (!reportText) return;

    if (isTooLongForWhatsApp(reportText)) {
      showToast(
        'Laporan terlalu panjang untuk satu pesan WhatsApp. Pilih lebih sedikit sesi.',
        'error'
      );
      return;
    }

    const outcome = await shareToWhatsApp(reportText);
    if (outcome === 'copied-and-opened') {
      showToast('Teks laporan disalin dan WhatsApp dibuka.', 'success');
    } else if (outcome === 'failed') {
      showToast('Tidak dapat membuka WhatsApp. Salin teksnya secara manual.', 'error');
    }
  };

  // Mobile responsiveness helper
  const [editingStudentIndex, setEditingStudentIndex] = useState<number | null>(null);

  // Helper: Format Indonesian Date to Short format (e.g. "20 Jun")
  const formatDateIDShort = (dateStr: string): string => {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return '';
    const day = parseInt(parts[2], 10);
    const month = parseInt(parts[1], 10);
    const monthsShort = [
      'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
      'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
    ];
    return `${day} ${monthsShort[month - 1]}`;
  };

  // Helper: Get automatic range representation (e.g. "20 Jun - 17 Jul 2026")
  const getAutoDateRange = (sortedDates: string[]): string => {
    if (sortedDates.length === 0) return '';
    const startLabel = formatDateIDShort(sortedDates[0]);
    const endLabel = formatDateIDShort(sortedDates[sortedDates.length - 1]);
    const year = sortedDates[sortedDates.length - 1].split('-')[0];
    return `${startLabel} - ${endLabel} ${year}`;
  };

  // Function: Scan and generate default spreadsheet data based on actual database records
  const handleAutoFillFromDB = () => {
    if (recordsInSelectedPeriod.length === 0) {
      // Return 15 empty rows if no records
      const emptyRows: StudentRow[] = Array.from({ length: 15 }, () => ({
        name: '',
        category: 'P',
        attendance: ['', '', '', '', ''],
        pendampingan: '',
        hs: '',
        jm: '',
        sppKeterangan: '',
        sppNominal: 0,
        buletinCetak: false,
        buletinDigital: false,
      }));
      setStudentsData(emptyRows);
      setWeeks(['Pekan 1', 'Pekan 2', 'Pekan 3', 'Pekan 4', 'Pekan 5']);
      setTanggalAktif('');
      return;
    }

    // 1. Extract unique class dates in this period (up to 5)
    const uniqueDates = Array.from(new Set(recordsInSelectedPeriod.map(r => r.tanggal as string))).sort() as string[];
    const defaultWeeks = ['Pekan 1', 'Pekan 2', 'Pekan 3', 'Pekan 4', 'Pekan 5'];
    const activeWeeks = defaultWeeks.map((def, idx) => {
      if (uniqueDates[idx]) {
        return formatDateIDShort(uniqueDates[idx]);
      }
      return def;
    });
    setWeeks(activeWeeks);

    // Set automatic date range description
    const autoRange = getAutoDateRange(uniqueDates);
    setTanggalAktif(autoRange);

    // 2. Extract unique student names present in this period
    const uniqueStudents = Array.from(
      new Set(recordsInSelectedPeriod.flatMap(r => r.peserta as string[]))
    ).sort((a, b) => (a as string).localeCompare(b as string, 'id', { sensitivity: 'base' })) as string[];

    // 3. Build student rows
    const rows: StudentRow[] = uniqueStudents.map((studentStr) => {
      const student = studentStr as string;
      // For each week date, see if the student attended
      const attendance = activeWeeks.map((_, idx) => {
        const dateStr = uniqueDates[idx];
        if (!dateStr) return '';
        const wasPresent = recordsInSelectedPeriod.some(
          r => r.tanggal === dateStr && (r.peserta as string[]).some(name => name.toLowerCase() === student.toLowerCase())
        );
        return wasPresent ? 'V' : '';
      });

      return {
        name: student,
        category: 'P', // default
        attendance,
        pendampingan: '',
        hs: '',
        jm: '',
        sppKeterangan: '',
        sppNominal: 0,
        buletinCetak: false,
        buletinDigital: false,
      };
    });

    // Make sure we have at least 15 rows to match the image template
    while (rows.length < 15) {
      rows.push({
        name: '',
        category: 'P',
        attendance: ['', '', '', '', ''],
        pendampingan: '',
        hs: '',
        jm: '',
        sppKeterangan: '',
        sppNominal: 0,
        buletinCetak: false,
        buletinDigital: false,
      });
    }

    setStudentsData(rows);
    showToast('Berhasil memuat & menyinkronkan data presensi otomatis!', 'success');
  };

  // Effect: Load saved Excel sheet report for this period from IndexedDB, or fallback to auto-scanning
  useEffect(() => {
    if (!selectedPeriodKey) return;

    db.excelReports.where('periodKey').equals(selectedPeriodKey).first()
      .then((savedReport) => {
        if (savedReport) {
          setGuruName(savedReport.guruName || 'Guru 1');
          setKitabName(savedReport.kitabName || 'Nama Kitab');
          setTanggalAktif(savedReport.tanggalAktif || '');
          setCatatan(savedReport.catatan || '');
          setWeeks(savedReport.weeks || ['Pekan 1', 'Pekan 2', 'Pekan 3', 'Pekan 4', 'Pekan 5']);
          
          // Ensure at least 15 rows
          const rows = [...savedReport.studentsData];
          while (rows.length < 15) {
            rows.push({
              name: '',
              category: 'P',
              attendance: ['', '', '', '', ''],
              pendampingan: '',
              hs: '',
              jm: '',
              sppKeterangan: '',
              sppNominal: 0,
              buletinCetak: false,
              buletinDigital: false,
            });
          }
          setStudentsData(rows);
        } else {
          // No saved report: auto-fill from attendance logs
          handleAutoFillFromDB();
        }
      })
      .catch((err) => {
        console.error('[Load Excel report from DB error]', err);
        handleAutoFillFromDB();
      });
  }, [selectedPeriodKey, recordsInSelectedPeriod]);

  // Function: Save current Excel sheet data to IndexedDB
  const handleSaveExcelReport = async () => {
    try {
      const payload: ExcelReportRecord = {
        periodKey: selectedPeriodKey,
        guruName,
        kitabName,
        tanggalAktif,
        weeks,
        studentsData: studentsData.filter(row => row.name.trim() !== '' || row.attendance.some(a => a !== '')),
        catatan,
        createdAt: Date.now()
      };

      const existing = await db.excelReports.where('periodKey').equals(selectedPeriodKey).first();
      if (existing && existing.id) {
        await db.excelReports.put({ ...payload, id: existing.id });
      } else {
        await db.excelReports.add(payload);
      }
      showToast('Berhasil menyimpan draf lembar kerja Excel ke database lokal!', 'success');
    } catch (err) {
      console.error('[Save Excel report error]', err);
      showToast('Gagal menyimpan draf lembar kerja.', 'error');
    }
  };

  // Function: Reset sheet to match attendance log defaults
  const handleResetToAttendanceDB = () => {
    const conf = window.confirm('Apakah Anda yakin ingin memuat ulang lembar kerja? Perubahan SPP, K/P, Hafalan, dan Buletin yang belum disimpan mungkin akan hilang.');
    if (conf) {
      handleAutoFillFromDB();
    }
  };

  // Function: Add custom student row at the bottom
  const handleAddStudentRow = () => {
    setStudentsData(prev => [
      ...prev,
      {
        name: '',
        category: 'P',
        attendance: ['', '', '', '', ''],
        pendampingan: '',
        hs: '',
        jm: '',
        sppKeterangan: '',
        sppNominal: 0,
        buletinCetak: false,
        buletinDigital: false,
      }
    ]);
    showToast('Baris santri kosong ditambahkan di baris paling bawah.', 'info');
  };

  // Function: Delete custom student row
  const handleDeleteStudentRow = (index: number) => {
    if (studentsData.length <= 1) return;
    setStudentsData(prev => prev.filter((_, idx) => idx !== index));
  };

  // Function: Edit student row properties
  const handleUpdateStudentField = (index: number, field: keyof StudentRow, value: any) => {
    setStudentsData(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]: value
      };
      return copy;
    });
  };

  // Function: Edit attendance cell code inside row
  const handleUpdateAttendanceCell = (rowIndex: number, weekIndex: number, value: string) => {
    setStudentsData(prev => {
      const copy = [...prev];
      const attCopy = [...copy[rowIndex].attendance];
      attCopy[weekIndex] = value;
      copy[rowIndex] = {
        ...copy[rowIndex],
        attendance: attCopy
      };
      return copy;
    });
  };

  // Function: Generate & Download Official Styled Excel spreadsheet (.xls) matching the image exactly
  const handleExportStyledExcel = () => {
    const periodLabel = currentPeriod ? currentPeriod.label : selectedPeriodKey;
    
    // Build HTML/XML document with precise CSS styles
    let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
    <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
    <!--[if gte mso 9]>
    <xml>
     <x:ExcelWorkbook>
      <x:ExcelWorksheets>
       <x:ExcelWorksheet>
        <x:Name>Laporan Bulanan</x:Name>
        <x:WorksheetOptions>
         <x:DisplayGridlines/>
        </x:WorksheetOptions>
       </x:ExcelWorksheet>
      </x:ExcelWorksheets>
     </x:ExcelWorkbook>
    </xml>
    <![endif]-->
    <style>
      table { border-collapse: collapse; font-family: 'Arial', sans-serif; font-size: 10pt; }
      td, th { border: 1px solid #7f7f7f; padding: 6px; text-align: center; vertical-align: middle; }
      .title-main { font-weight: bold; font-size: 14pt; text-align: center; border: none; height: 35px; }
      .title-sub { font-weight: bold; font-size: 11pt; text-align: center; background-color: #fce4d6; height: 28px; border: 1px solid #7f7f7f; }
      .title-tanggal { font-weight: bold; font-size: 10pt; text-align: center; background-color: #ffffff; height: 24px; border: 1px solid #7f7f7f; }
      .hdr { background-color: #f2f2f2; font-weight: bold; font-size: 9pt; }
      .text-left { text-align: left; }
      .text-center { text-align: center; }
      .bg-guru { background-color: #e2efda; font-weight: bold; }
      .bg-green-row { background-color: #e2efda; }
      .bg-blue-row { background-color: #d9e1f2; }
      .legend-cell { border: 1px solid #7f7f7f; font-size: 8pt; padding: 4px; }
      .catatan-lbl { font-weight: bold; text-align: left; background-color: #ffffff; }
    </style>
    </head>
    <body>
    <table>
      <!-- Main Title Block -->
      <tr>
        <td colspan="17" class="title-main">LAPORAN PETUGAS NGAGLIK</td>
      </tr>
      <tr>
        <td colspan="17" class="title-sub">LAPORAN BULAN : ${escapeHtml(periodLabel.toUpperCase())}</td>
      </tr>
      <tr>
        <td colspan="17" class="title-tanggal">TANGGAL AKTIF PEMBELAJARAN : ${escapeHtml(tanggalAktif.toUpperCase()) || '-'}</td>
      </tr>
      
      <!-- Blank Separator Row -->
      <tr style="height: 12px;"><td colspan="17" style="border:none;"></td></tr>

      <!-- Double Table Headers (Row 1) -->
      <tr class="hdr" style="height: 25px;">
        <th rowspan="2" style="width: 40px; border: 1px solid #7f7f7f;">NO</th>
        <th rowspan="2" style="width: 150px; border: 1px solid #7f7f7f;">NAMA GURU</th>
        <th rowspan="2" style="width: 150px; border: 1px solid #7f7f7f;">KITAB</th>
        <th rowspan="2" style="width: 180px; border: 1px solid #7f7f7f;">NAMA SANTRI</th>
        <th rowspan="2" style="width: 50px; border: 1px solid #7f7f7f;">K/P</th>
        <th colspan="5" style="border: 1px solid #7f7f7f;">PERIODE KURSUS</th>
        <th rowspan="2" style="width: 140px; border: 1px solid #7f7f7f;">PENDAMPINGAN</th>
        <th rowspan="2" style="width: 50px; border: 1px solid #7f7f7f;">HS</th>
        <th rowspan="2" style="width: 50px; border: 1px solid #7f7f7f;">JM</th>
        <th colspan="2" style="border: 1px solid #7f7f7f;">SPP</th>
        <th colspan="2" style="border: 1px solid #7f7f7f;">SEBAR BULETIN</th>
      </tr>
      
      <!-- Double Table Headers (Row 2) -->
      <tr class="hdr" style="height: 25px;">
        <th style="width: 85px; border: 1px solid #7f7f7f;">${escapeHtml(weeks[0]) || 'Pekan 1'}</th>
        <th style="width: 85px; border: 1px solid #7f7f7f;">${escapeHtml(weeks[1]) || 'Pekan 2'}</th>
        <th style="width: 85px; border: 1px solid #7f7f7f;">${escapeHtml(weeks[2]) || 'Pekan 3'}</th>
        <th style="width: 85px; border: 1px solid #7f7f7f;">${escapeHtml(weeks[3]) || 'Pekan 4'}</th>
        <th style="width: 85px; border: 1px solid #7f7f7f;">${escapeHtml(weeks[4]) || 'Pekan 5'}</th>
        <th style="width: 110px; border: 1px solid #7f7f7f;">KETERANGAN</th>
        <th style="width: 100px; border: 1px solid #7f7f7f;">NOMINAL (Rp)</th>
        <th style="width: 60px; border: 1px solid #7f7f7f;">Cetak</th>
        <th style="width: 60px; border: 1px solid #7f7f7f;">Digital</th>
      </tr>
    `;

    // Process rows
    studentsData.forEach((row, idx) => {
      // Determine background color based on section (to match layout)
      let nameBg = '';
      if (idx < 5) nameBg = 'class="bg-green-row text-left"';
      else if (idx < 10) nameBg = 'class="bg-blue-row text-left"';
      else nameBg = 'class="text-left"';

      html += `<tr style="height: 22px;">`;
      html += `<td>${idx + 1}</td>`;
      
      // Merge "Nama Guru" and "Kitab" vertically for the entire list!
      if (idx === 0) {
        html += `<td rowspan="${studentsData.length}" class="bg-guru" style="border: 1px solid #7f7f7f;">${escapeHtml(guruName)}</td>`;
        html += `<td rowspan="${studentsData.length}" class="bg-guru" style="border: 1px solid #7f7f7f;">${escapeHtml(kitabName)}</td>`;
      }
      
      html += `<td ${nameBg} style="border: 1px solid #7f7f7f;">${escapeHtml(row.name)}</td>`;
      html += `<td style="border: 1px solid #7f7f7f;">${escapeHtml(row.category)}</td>`;
      
      // Attendance status (5 columns)
      for (let w = 0; w < 5; w++) {
        const val = row.attendance[w] || '';
        html += `<td style="border: 1px solid #7f7f7f; font-weight: bold;">${escapeHtml(val)}</td>`;
      }
      
      html += `<td class="text-left" style="border: 1px solid #7f7f7f;">${escapeHtml(row.pendampingan)}</td>`;
      html += `<td style="border: 1px solid #7f7f7f;">${escapeHtml(row.hs)}</td>`;
      html += `<td style="border: 1px solid #7f7f7f;">${escapeHtml(row.jm)}</td>`;
      html += `<td style="border: 1px solid #7f7f7f; font-weight: bold;">${escapeHtml(row.sppKeterangan)}</td>`;
      html += `<td style="border: 1px solid #7f7f7f;">${row.sppNominal > 0 ? row.sppNominal : ''}</td>`;
      html += `<td style="border: 1px solid #7f7f7f; font-weight: bold;">${row.buletinCetak ? 'V' : ''}</td>`;
      html += `<td style="border: 1px solid #7f7f7f; font-weight: bold;">${row.buletinDigital ? 'V' : ''}</td>`;
      html += `</tr>`;
    });

    // Notes Row
    html += `
      <tr style="height: 25px;">
        <td colspan="4" class="catatan-lbl" style="border: 1px solid #7f7f7f;">Catatan :</td>
        <td colspan="13" class="text-left" style="border: 1px solid #7f7f7f;">${catatan || ''}</td>
      </tr>
    `;

    // Spacing before legend tables
    html += `<tr style="height: 18px;"><td colspan="17" style="border:none;"></td></tr>`;

    // High-Fidelity Legend tables at bottom side-by-side
    html += `
      <tr>
        <td colspan="4" style="border:none; text-align: left; vertical-align: top;">
          <table style="border-collapse: collapse; width: 100%;">
            <tr><th colspan="2" class="hdr text-left" style="border: 1px solid #7f7f7f; padding: 4px; font-size: 8.5pt;">Keterangan :</th></tr>
            <tr><td class="legend-cell" style="font-weight:bold; width: 25px;">V</td><td class="legend-cell text-left">Hadir Tepat Waktu</td></tr>
            <tr><td class="legend-cell" style="font-weight:bold;">T</td><td class="legend-cell text-left">Hadir Tapi Terlambat &lt;15 menit</td></tr>
            <tr><td class="legend-cell" style="font-weight:bold;">S</td><td class="legend-cell text-left">Tidak Hadir Karena Sakit</td></tr>
            <tr><td class="legend-cell" style="font-weight:bold;">I</td><td class="legend-cell text-left">Tidak Hadir Tapi Izin (syar'i)</td></tr>
            <tr><td class="legend-cell" style="font-weight:bold;">A</td><td class="legend-cell text-left">Tidak Hadir Tanpa Keterangan</td></tr>
            <tr><td class="legend-cell" style="font-weight:bold;">B</td><td class="legend-cell text-left">Kosong (musyrif tidak hadir/berhalangan)</td></tr>
          </table>
        </td>
        <td style="border:none;"></td>
        <td colspan="5" style="border:none; text-align: left; vertical-align: top;">
          <table style="border-collapse: collapse; width: 100%;">
            <tr><th colspan="2" class="hdr text-left" style="border: 1px solid #7f7f7f; padding: 4px; font-size: 8.5pt;">Keterangan SPP:</th></tr>
            <tr><td class="legend-cell" style="font-weight:bold; width: 25px;">V</td><td class="legend-cell text-left">Bayar Tepat Waktu sebelum tgl 15</td></tr>
            <tr><td class="legend-cell" style="font-weight:bold;">T</td><td class="legend-cell text-left">Bayar Tapi Terlambat setelah tgl 15</td></tr>
            <tr><td class="legend-cell" style="font-weight:bold;">S</td><td class="legend-cell text-left">Tidak Bayar karena kesulitan</td></tr>
            <tr><td class="legend-cell" style="font-weight:bold;">I</td><td class="legend-cell text-left">Tidak Bayar dihutang bulan depan</td></tr>
            <tr><td class="legend-cell" style="font-weight:bold;">A</td><td class="legend-cell text-left">Tidak Bayar tanpa alasan</td></tr>
          </table>
        </td>
        <td style="border:none;"></td>
        <td colspan="3" style="border:none; text-align: left; vertical-align: top;">
          <table style="border-collapse: collapse; width: 100%;">
            <tr><th colspan="2" class="hdr text-left" style="border: 1px solid #7f7f7f; padding: 4px; font-size: 8.5pt;">Kategori K/P:</th></tr>
            <tr><td class="legend-cell" style="font-weight:bold; width: 25px;">K</td><td class="legend-cell text-left">KARYAWAN</td></tr>
            <tr><td class="legend-cell" style="font-weight:bold;">P</td><td class="legend-cell text-left">PELAJAR</td></tr>
          </table>
        </td>
        <td colspan="3" style="border:none;"></td>
      </tr>
    `;

    html += `
    </table>
    </body>
    </html>
    `;

    // Trigger download
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeFilename = `Laporan_Petugas_Ngaglik_${periodLabel.replace(/\s+/g, '_')}.xls`;
    a.href = url;
    a.download = safeFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Berhasil mengunduh dokumen Excel berformat resmi!', 'success');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="cs-shell space-y-6"
    >
      {/* Week 3 Sticky Alert / Announcement */}
      {todayIsThirdWeek && !hideWeekReminder && (
        <motion.section
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="cs-card cs-card--danger"
        >
          <div className="cs-card__head">
            <p className="cs-label">Pengingat pekan ketiga</p>
            <button
              onClick={handleDismissWeekReminder}
              className="cs-iconbtn"
              aria-label="Sembunyikan pengingat"
            >
              <X className="cs-icon" />
            </button>
          </div>
          <p className="cs-muted">
            Sudah tanggal 15-21. Waktunya menyusun laporan dua bulanan dan mengirimkannya ke koordinator.
          </p>
        </motion.section>
      )}

      {/* Main Filter & Control Area */}
      <section className="cs-card">
        <div className="cs-card__head">
          <p className="cs-label">Laporan</p>

          {/* Which report is being made. Same pressed-in chips as the class
              picker on the register, so the two read as one control type. */}
          <ul className="cs-groups">
            <li className="cs-group">
              <button
                type="button"
                className="cs-group__btn"
                aria-pressed={reportMode === 'whatsapp'}
                onClick={() => setReportMode('whatsapp')}
              >
                Laporan WA
                <span className="cs-group__when">Teks siap kirim</span>
              </button>
            </li>
            <li className="cs-group">
              <button
                type="button"
                className="cs-group__btn"
                aria-pressed={reportMode === 'excel'}
                onClick={() => setReportMode('excel')}
              >
                Format Excel
                <span className="cs-group__when">Lembar resmi</span>
              </button>
            </li>
          </ul>
        </div>

        <div className="cs-grid-2">
          <div className="cs-field">
            <label className="cs-field__label" htmlFor="report_period">
              Periode laporan (dua bulan)
            </label>
            <select
              id="report_period"
              value={selectedPeriodKey}
              onChange={(e) => setSelectedPeriodKey(e.target.value)}
              className="cs-select"
            >
              {availablePeriods.map(p => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </select>
          </div>

          <div className="cs-field">
            <label className="cs-field__label" htmlFor="report_schedule_filter">
              Kelompok kelas (khusus laporan WhatsApp)
            </label>
            <select
              id="report_schedule_filter"
              disabled={reportMode === 'excel'}
              value={reportScheduleFilter}
              onChange={(e) => setReportScheduleFilter(e.target.value)}
              className="cs-select"
            >
              <option value="all">Semua kelas</option>
              <option value="unlinked">Hanya sesi tanpa jadwal</option>
              {schedules.map(s => (
                <option key={s.id} value={s.id}>{s.title} ({s.hari})</option>
              ))}
            </select>
          </div>
        </div>

        <p className="cs-muted">
          {reportMode === 'whatsapp'
            ? 'Laporan disusun dalam format teks siap kirim ke koordinator.'
            : 'Isi lembar laporan resmi, lalu unduh sebagai Excel.'}
        </p>
      </section>

      {records.length === 0 ? (
        <section className="cs-card">
          <div className="cs-empty">
            <h3 className="cs-empty__title">Belum ada presensi untuk dilaporkan</h3>
            <p className="cs-empty__body">
              Catat presensi terlebih dahulu, atau muat data contoh untuk mencoba.
            </p>
            <Button icon={<Play className="cs-icon" />} onClick={handleLoadSampleData}>
              Muat data contoh
            </Button>
          </div>
        </section>
      ) : (
        <AnimatePresence mode="wait">
          {reportMode === 'whatsapp' ? (
            /* =======================================
               TAB 1: WHATSAPP COMPILER (ORIGINAL)
               ======================================= */
            <motion.div
              key="wa-mode"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              {/* List Sesi (Col left) */}
              <div className="lg:col-span-7">
                <section className="cs-card">
                  <p className="cs-label">
                    Sesi pada periode ini ({filteredRecordsForReport.length})
                    <span className="cs-label__count">
                      {currentPeriod ? currentPeriod.label : '-'}
                    </span>
                  </p>

                  {filteredRecordsForReport.length === 0 ? (
                    <div className="cs-empty">
                      <h3 className="cs-empty__title">Tidak ada sesi di periode ini</h3>
                      <p className="cs-empty__body">
                        Belum ada presensi tersimpan yang cocok dengan periode dan kelas
                        yang dipilih. Coba periode lain, atau ubah kelompok kelasnya.
                      </p>
                    </div>
                  ) : (
                    <div className="cs-scroll">
                      {filteredRecordsForReport.map((rec) => {
                        const isSelected = reportSelectedRecordIds.includes(rec.id!);
                        return (
                          /* A real checkbox: this was a div with an onClick,
                             so it could not be reached or operated by keyboard
                             and announced as nothing at all. */
                          <label
                            key={rec.id}
                            className={`cs-session${isSelected ? ' is-selected' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                if (rec.id) {
                                  setReportSelectedRecordIds(prev =>
                                    prev.includes(rec.id!) ? prev.filter(x => x !== rec.id) : [...prev, rec.id!]
                                  );
                                }
                              }}
                            />
                            <span className="cs-session__text">
                              <span className="cs-session__date">
                                {formatIndonesianDate(rec.tanggal)}
                              </span>
                              <span className="cs-session__names">
                                Hadir ({rec.peserta.length}): {rec.peserta.join(', ')}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  <div className="cs-row cs-row--end">
                    <Button
                      variant="primary"
                      icon={<RefreshCw className="cs-icon" />}
                      onClick={handleGenerateReport}
                      disabled={filteredRecordsForReport.length === 0}
                    >
                      Susun laporan
                    </Button>
                  </div>
                </section>
              </div>

              {/* compiled Output Display (Col right) */}
              <div className="lg:col-span-5">
                <section className="cs-card cs-card--sticky">
                  <p className="cs-label">
                    Hasil laporan WhatsApp
                    <span className="cs-label__count">Template WA</span>
                  </p>

                  {reportGenerated ? (
                    <>
                      <textarea
                        ref={reportTextareaRef}
                        className="cs-textarea cs-textarea--report"
                        rows={12}
                        readOnly
                        aria-label="Teks laporan WhatsApp"
                        value={reportText}
                      />

                      <div className="cs-row">
                        <Button
                          variant="primary"
                          icon={<Send className="cs-icon" />}
                          onClick={handleShareReport}
                        >
                          Bagikan ke WhatsApp
                        </Button>
                        <Button
                          icon={copied ? <Check className="cs-icon" /> : <Copy className="cs-icon" />}
                          onClick={handleCopyReport}
                        >
                          {copied ? 'Tersalin' : 'Salin teks'}
                        </Button>
                      </div>
                      <p className="cs-muted">
                        WhatsApp akan terbuka dengan teks ini sudah terisi. Anda yang
                        menekan kirim.
                      </p>
                    </>
                  ) : (
                    <div className="cs-empty">
                      <h3 className="cs-empty__title">Laporan belum disusun</h3>
                      <p className="cs-empty__body">
                        Pilih periode dan sesi di samping, lalu tekan <b>Susun laporan</b>.
                      </p>
                    </div>
                  )}
                </section>
              </div>
            </motion.div>
          ) : (
            /* =======================================
               TAB 2: HIGH-FIDELITY EXCEL SPREADSHEET EDITOR
               ======================================= */
            <motion.div
              key="excel-mode"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
              {/* Informational Banner */}
              <section className="cs-card cs-card--inset">
                <p className="cs-label">Lembar laporan Excel</p>
                <div>
                  <p className="cs-muted">
                    Atur data presensi, lengkapi status SPP, catatan hafalan, serta pengiriman buletin. Data akan otomatis tersimpan dalam database lokal per periode ketika mengklik <b>Simpan draf</b>. Ekspor langsung menghasilkan format resmi Excel berwarna!
                  </p>
                </div>
              </section>

              {/* Metadata Inputs Section */}
              <section className="cs-card">
                <p className="cs-label">Keterangan laporan</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-zinc-500 dark:text-zinc-400 mb-1.5">
                      Nama Guru
                    </label>
                    <input
                      type="text"
                      value={guruName}
                      onChange={(e) => setGuruName(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm font-bold text-zinc-800 dark:text-zinc-150 focus:outline-hidden focus:ring-1 focus:ring-red-600"
                      placeholder="Contoh: Guru 1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-zinc-500 dark:text-zinc-400 mb-1.5">
                      Kitab / Materi
                    </label>
                    <input
                      type="text"
                      value={kitabName}
                      onChange={(e) => setKitabName(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm font-bold text-zinc-800 dark:text-zinc-150 focus:outline-hidden focus:ring-1 focus:ring-red-600"
                      placeholder="Contoh: Nama Kitab"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-zinc-500 dark:text-zinc-400 mb-1.5">
                      Tanggal Aktif Pembelajaran
                    </label>
                    <input
                      type="text"
                      value={tanggalAktif}
                      onChange={(e) => setTanggalAktif(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm font-bold text-zinc-800 dark:text-zinc-150 focus:outline-hidden focus:ring-1 focus:ring-red-600"
                      placeholder="Contoh: 20 Jun - 17 Jul 2026"
                    />
                  </div>
                </div>

                {/* Sub-weeks Column title configuration */}
                <div className="pt-2">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="text-sm font-black text-zinc-500 dark:text-zinc-400">Nama kolom pekan</span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {weeks.map((wk, idx) => (
                      <div key={idx}>
                        <input
                          type="text"
                          aria-label={`Nama kolom pekan ${idx + 1}`}
                          value={wk}
                          onChange={(e) => {
                            const copy = [...weeks];
                            copy[idx] = e.target.value;
                            setWeeks(copy);
                          }}
                          className="w-full px-2 py-1.5 text-sm font-bold text-zinc-700 dark:text-white text-center focus:outline-hidden focus:ring-1 focus:ring-red-600"
                          placeholder={`Pekan ${idx + 1}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Main Spreadsheet Grid (Desktop viewport with overflow, mobile with single-row quick modal triggers) */}
              <section className="cs-card">
                <p className="cs-label">
                  Daftar santri ({studentsData.length})
                  <span className="cs-label__count">Terisi dari presensi tercatat</span>
                </p>

                <div className="cs-row cs-row--end">
                  <Button
                    icon={<UserPlus className="cs-icon" />}
                    onClick={handleAddStudentRow}
                  >
                    Tambah santri
                  </Button>
                </div>

                {/* The sheet is 17 columns wide, so on a phone it has to scroll
                    sideways. Make that scroll reachable by keyboard and say it
                    is there, and offer the per-santri form as the way to fill
                    it in without scrolling at all. */}
                <p className="cs-muted">
                  Tabel ini lebar. Geser ke samping untuk melihat semua kolom, atau
                  tekan <b>Ubah</b> pada baris santri untuk mengisi lewat formulir.
                </p>
                <div
                  className="cs-sheet"
                  role="region"
                  aria-label="Lembar laporan santri"
                  tabIndex={0}
                >
                  <table className="w-full min-w-[1250px] border-collapse text-left text-sm font-medium">
                    <thead>
                      <tr className="text-sm font-black text-zinc-500 dark:text-zinc-400 border-b">
                        <th className="p-2 border-r text-center w-12">No</th>
                        <th className="p-2 border-r w-48">Nama Santri</th>
                        <th className="p-2 border-r text-center w-16">K/P</th>
                        {weeks.map((wk, idx) => (
                          <th key={idx} className="p-2 border-r text-center w-20">{wk || `Pekan ${idx+1}`}</th>
                        ))}
                        <th className="p-2 border-r w-40">Pendampingan</th>
                        <th className="p-2 border-r text-center w-14">HS</th>
                        <th className="p-2 border-r text-center w-14">JM</th>
                        <th className="p-2 border-r text-center w-24">SPP KET</th>
                        <th className="p-2 border-r text-right w-28">SPP NOMINAL</th>
                        <th className="p-2 border-r text-center w-16">BULETIN CETAK</th>
                        <th className="p-2 border-r text-center w-16">BULETIN DGTL</th>
                        <th className="p-2 text-center w-44">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-150 dark:divide-zinc-805">
                      {studentsData.map((row, rIdx) => {
                        // Visual helper background groups (alternating to mimic the look of custom spreadsheets)
                        const isEvenGroup = Math.floor(rIdx / 5) % 2 === 0;
                        const rowBg = isEvenGroup 
                          ? 'bg-emerald-500/[0.01] dark:bg-emerald-500/[0.015]'
                          : 'bg-indigo-500/[0.01] dark:bg-indigo-500/[0.015]';

                        return (
                          <tr key={rIdx} className={`hover:bg-zinc-50 dark:hover:bg-zinc-950/60 transition-colors ${rowBg}`}>
                            {/* NO */}
                            <td className="p-1.5 border-r text-center font-bold text-zinc-550">
                              <span>{rIdx + 1}</span>
                            </td>

                            {/* NAMA SANTRI */}
                            <td className="p-1.5 border-r">
                              <input
                                type="text"
                                value={row.name}
                                onChange={(e) => handleUpdateStudentField(rIdx, 'name', e.target.value)}
                                className="w-full bg-transparent border-0 font-bold text-zinc-800 dark:text-zinc-100 focus:ring-0 focus:outline-hidden p-1 focus: dark:focus:bg-zinc-800"
                                placeholder="-- Kosong --"
                              />
                            </td>

                            {/* K/P */}
                            <td className="p-1.5 border-r text-center">
                              <select
                                value={row.category}
                                onChange={(e) => handleUpdateStudentField(rIdx, 'category', e.target.value)}
                                className="bg-transparent border-0 text-center font-bold text-zinc-700 dark:text-white focus:ring-0 focus:outline-hidden cursor-pointer"
                              >
                                <option value="K">K</option>
                                <option value="P">P</option>
                              </select>
                            </td>

                            {/* ATTENDANCE (5 Columns) */}
                            {weeks.map((_, wIdx) => {
                              const cellValue = row.attendance[wIdx] || '';
                              
                              // Color codes: V=green, T=yellow, S/I=blue, A=red, B=gray
                              let badgeStyle = 'bg-transparent text-zinc-400';
                              if (cellValue === 'V') badgeStyle = 'bg-emerald-100/70 dark:bg-emerald-950/40 text-emerald-750 dark:text-emerald-400';
                              else if (cellValue === 'T') badgeStyle = 'bg-amber-100/70 dark:bg-amber-950/40 text-amber-750 dark:text-amber-400';
                              else if (cellValue === 'S' || cellValue === 'I') badgeStyle = 'bg-sky-100/70 dark:bg-sky-950/40 text-sky-750 dark:text-sky-400';
                              else if (cellValue === 'A') badgeStyle = 'bg-rose-100/70 dark:bg-rose-950/40 text-rose-750 dark:text-rose-400';
                              else if (cellValue === 'B') badgeStyle = 'bg-zinc-100 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-400';

                              return (
                                <td key={wIdx} className="p-1 border-r text-center">
                                  <select
                                    value={cellValue}
                                    onChange={(e) => handleUpdateAttendanceCell(rIdx, wIdx, e.target.value)}
                                    className={`w-11 h-8 rounded-lg text-center font-extrabold focus:ring-0 focus:outline-hidden cursor-pointer transition-all ${badgeStyle}`}
                                  >
                                    <option value="">-</option>
                                    <option value="V">V</option>
                                    <option value="T">T</option>
                                    <option value="S">S</option>
                                    <option value="I">I</option>
                                    <option value="A">A</option>
                                    <option value="B">B</option>
                                  </select>
                                </td>
                              );
                            })}

                            {/* PENDAMPINGAN */}
                            <td className="p-1.5 border-r">
                              <input
                                type="text"
                                value={row.pendampingan}
                                onChange={(e) => handleUpdateStudentField(rIdx, 'pendampingan', e.target.value)}
                                className="w-full bg-transparent border-0 text-zinc-700 dark:text-white font-semibold focus:ring-0 focus:outline-hidden p-1 focus: dark:focus:bg-zinc-800"
                                placeholder="..."
                              />
                            </td>

                            {/* HS */}
                            <td className="p-1.5 border-r text-center">
                              <select
                                value={row.hs}
                                onChange={(e) => handleUpdateStudentField(rIdx, 'hs', e.target.value)}
                                className="w-14 bg-transparent border-0 text-center font-bold text-zinc-700 dark:text-white focus:ring-0 focus:outline-hidden cursor-pointer"
                              >
                                <option value="" className="dark:text-white">-</option>
                                <option value="V" className="dark:text-white">V</option>
                                <option value="S" className="dark:text-white">S</option>
                                <option value="I" className="dark:text-white">I</option>
                                <option value="A" className="dark:text-white">A</option>
                                <option value="T" className="dark:text-white">T</option>
                                <option value="B" className="dark:text-white">B</option>
                              </select>
                            </td>

                            {/* JM */}
                            <td className="p-1.5 border-r text-center">
                              <select
                                value={row.jm}
                                onChange={(e) => handleUpdateStudentField(rIdx, 'jm', e.target.value)}
                                className="w-14 bg-transparent border-0 text-center font-bold text-zinc-700 dark:text-white focus:ring-0 focus:outline-hidden cursor-pointer"
                              >
                                <option value="" className="dark:text-white">-</option>
                                <option value="V" className="dark:text-white">V</option>
                                <option value="S" className="dark:text-white">S</option>
                                <option value="I" className="dark:text-white">I</option>
                                <option value="A" className="dark:text-white">A</option>
                                <option value="T" className="dark:text-white">T</option>
                                <option value="B" className="dark:text-white">B</option>
                              </select>
                            </td>

                            {/* SPP KET */}
                            <td className="p-1 border-r text-center">
                              <select
                                value={row.sppKeterangan}
                                onChange={(e) => handleUpdateStudentField(rIdx, 'sppKeterangan', e.target.value)}
                                className="w-14 bg-transparent border-0 text-center font-bold text-zinc-700 dark:text-white focus:ring-0 focus:outline-hidden cursor-pointer"
                              >
                                <option value="" className="dark:text-white">-</option>
                                <option value="V" className="dark:text-white">V</option>
                                <option value="T" className="dark:text-white">T</option>
                                <option value="S" className="dark:text-white">S</option>
                                <option value="I" className="dark:text-white">I</option>
                                <option value="A" className="dark:text-white">A</option>
                              </select>
                            </td>

                            {/* SPP NOMINAL */}
                            <td className="p-1.5 border-r">
                              <input
                                type="number"
                                value={row.sppNominal || ''}
                                onChange={(e) => handleUpdateStudentField(rIdx, 'sppNominal', Number(e.target.value))}
                                className="w-full bg-transparent border-0 text-right font-mono text-zinc-700 dark:text-white focus:ring-0 focus:outline-hidden p-1"
                                placeholder="0"
                              />
                            </td>

                            {/* BULETIN CETAK */}
                            <td className="p-1.5 border-r text-center">
                              <input
                                type="checkbox"
                                checked={row.buletinCetak}
                                onChange={(e) => handleUpdateStudentField(rIdx, 'buletinCetak', e.target.checked)}
                                className="w-4 h-4 text-red-600 focus:ring-red-500 cursor-pointer"
                              />
                            </td>

                            {/* BULETIN DIGITAL */}
                            <td className="p-1.5 border-r text-center">
                              <input
                                type="checkbox"
                                checked={row.buletinDigital}
                                onChange={(e) => handleUpdateStudentField(rIdx, 'buletinDigital', e.target.checked)}
                                className="w-4 h-4 text-red-600 focus:ring-red-500 cursor-pointer"
                              />
                            </td>

                            {/* ACTIONS — labelled, because an icon with a title
                                tooltip tells a phone user nothing. */}
                            <td className="p-1.5 text-center">
                              <div className="cs-sheet__actions">
                                <Button onClick={() => setEditingStudentIndex(rIdx)}>
                                  Ubah
                                </Button>
                                <Button
                                  variant="ghost"
                                  icon={<Trash2 className="cs-icon" />}
                                  onClick={() => handleDeleteStudentRow(rIdx)}
                                  disabled={studentsData.length <= 1}
                                >
                                  Hapus
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Legend Table bottom representation */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 p-5">
                  {/* Presensi */}
                  <div className="space-y-3">
                    <p className="font-extrabold text-sm text-zinc-500 dark:text-zinc-400 border-b pb-2">
                      Keterangan Presensi
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-sm font-bold text-zinc-700 dark:text-zinc-300">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center justify-center w-5 h-5 bg-emerald-50 dark:bg-emerald-950/45 text-emerald-600 dark:text-emerald-400 font-mono font-black text-sm border-emerald-200 dark:border-emerald-900/50">V</span>
                        <span>Hadir Tepat</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center justify-center w-5 h-5 bg-amber-50 dark:bg-amber-950/45 text-amber-600 dark:text-amber-400 font-mono font-black text-sm border-amber-200 dark:border-amber-900/50">T</span>
                        <span>Terlambat &lt;15m</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center justify-center w-5 h-5 bg-sky-50 dark:bg-sky-950/45 text-sky-600 dark:text-sky-400 font-mono font-black text-sm border-sky-200 dark:border-sky-900/50">S</span>
                        <span>Sakit</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center justify-center w-5 h-5 bg-indigo-50 dark:bg-indigo-950/45 text-indigo-600 dark:text-indigo-400 font-mono font-black text-sm border-indigo-200 dark:border-indigo-900/50">I</span>
                        <span>Izin</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center justify-center w-5 h-5 bg-rose-50 dark:bg-rose-950/45 text-rose-600 dark:text-rose-400 font-mono font-black text-sm border-rose-200 dark:border-rose-900/50">A</span>
                        <span>Alpa</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center justify-center w-5 h-5 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono font-black text-sm">B</span>
                        <span>Musyrif Absen</span>
                      </div>
                    </div>
                  </div>

                  {/* SPP */}
                  <div className="space-y-3 border-t md:border-t-0 md:border-l pt-3 md:pt-0 md:pl-5">
                    <p className="font-extrabold text-sm text-zinc-500 dark:text-zinc-400 border-b pb-2">
                      Keterangan SPP
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-sm font-bold text-zinc-700 dark:text-zinc-300">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center justify-center w-5 h-5 bg-emerald-50 dark:bg-emerald-950/45 text-emerald-600 dark:text-emerald-400 font-mono font-black text-sm border-emerald-200 dark:border-emerald-900/50">V</span>
                        <span>Sblm Tgl 15</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center justify-center w-5 h-5 bg-amber-50 dark:bg-amber-950/45 text-amber-600 dark:text-amber-400 font-mono font-black text-sm border-amber-200 dark:border-amber-900/50">T</span>
                        <span>Stlh Tgl 15</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center justify-center w-5 h-5 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono font-black text-sm">S</span>
                        <span>Sulit Bayar</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center justify-center w-5 h-5 bg-indigo-50 dark:bg-indigo-950/45 text-indigo-600 dark:text-indigo-400 font-mono font-black text-sm border-indigo-200 dark:border-indigo-900/50">I</span>
                        <span>Dihutang</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center justify-center w-5 h-5 bg-rose-50 dark:bg-rose-950/45 text-rose-600 dark:text-rose-400 font-mono font-black text-sm border-rose-200 dark:border-rose-900/50">A</span>
                        <span>Tanpa Alasan</span>
                      </div>
                    </div>
                  </div>

                  {/* Kategori */}
                  <div className="space-y-3 border-t md:border-t-0 md:border-l pt-3 md:pt-0 md:pl-5">
                    <p className="font-extrabold text-sm text-zinc-500 dark:text-zinc-400 border-b pb-2">
                      Kategori &amp; Buletin
                    </p>
                    <div className="space-y-2.5 text-sm font-bold text-zinc-700 dark:text-zinc-300">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono font-black text-sm">K / P</span>
                        <span>Karyawan / Pelajar</span>
                      </div>
                      <div className="flex flex-col gap-1 bg-red-500/[0.03] dark:bg-red-500/[0.02] border-red-500/10 p-2">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-red-650 animate-pulse"></span>
                          <span className="font-extrabold text-sm text-red-650 dark:text-red-400">Sebar Buletin</span>
                        </div>
                        <span className="text-sm text-zinc-500 dark:text-zinc-400 leading-normal font-semibold">
                          Centang kolom cetak/digital jika buletin telah diserahkan.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Catatan Area */}
                <div>
                  <label className="block text-sm font-bold text-zinc-500 dark:text-zinc-400 mb-2">
                    Catatan
                  </label>
                  <textarea
                    rows={2}
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    className="w-full p-3 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-hidden focus:ring-1 focus:ring-red-600"
                    placeholder="Masukkan catatan evaluasi kelas bulan ini..."
                  />
                </div>

                {/* Excel Actions Panel */}
                <div className="pt-3 border-t flex flex-wrap gap-2.5 justify-between">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleResetToAttendanceDB}
                      className="px-4 py-2 dark:bg-zinc-850 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-white text-sm font-black transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Ambil ulang dari presensi</span>
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSaveExcelReport}
                      className="px-4.5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-black transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5 text-zinc-300" />
                      <span>Simpan draf</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportStyledExcel}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-100" />
                      <span>Unduh Excel</span>
                    </button>
                  </div>
                </div>
              </section>

              {/* Mobile Quick Row Editor Dialog / Modal (Ensures stellar mobile editing ergonomics!) */}
              <AnimatePresence>
                {editingStudentIndex !== null && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 15 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 15 }}
                      className="p-5 w-full max-w-md max-h-[85vh] overflow-y-auto space-y-4"
                    >
                      {/* Modal Header */}
                      <div className="flex items-center justify-between border-b pb-3">
                        <div>
                          <span className="cs-muted">
                            Baris {editingStudentIndex + 1}
                          </span>
                          <h4 className="text-sm font-black text-zinc-900 dark:text-zinc-100 mt-1">Detail santri</h4>
                        </div>
                        <button
                          onClick={() => setEditingStudentIndex(null)}
                          className="p-1.5 text-zinc-450 hover: dark:hover:bg-zinc-800 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Modal Body / Fields list */}
                      <div className="space-y-4 font-sans">
                        {/* Name */}
                        <div>
                          <label className="block text-sm font-black text-zinc-500 dark:text-zinc-400 mb-1.5">Nama Santri</label>
                          <input
                            type="text"
                            value={studentsData[editingStudentIndex].name}
                            onChange={(e) => handleUpdateStudentField(editingStudentIndex, 'name', e.target.value)}
                            className="w-full px-3.5 py-2.5 text-sm font-bold text-zinc-800 dark:text-zinc-150 focus:outline-hidden focus:ring-1 focus:ring-red-600"
                            placeholder="Nama Santri"
                          />
                        </div>

                        {/* Category & SPP Ket */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-black text-zinc-500 dark:text-zinc-400 mb-1.5">Kategori (K/P)</label>
                            <select
                              value={studentsData[editingStudentIndex].category}
                              onChange={(e) => handleUpdateStudentField(editingStudentIndex, 'category', e.target.value as 'K' | 'P')}
                              className="w-full px-3.5 py-2.5 text-sm font-bold text-zinc-800 dark:text-zinc-150 focus:outline-hidden"
                            >
                              <option value="K" className="dark:text-white">Karyawan (K)</option>
                              <option value="P" className="dark:text-white">Pelajar (P)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-black text-zinc-500 dark:text-zinc-400 mb-1.5">SPP Keterangan</label>
                            <select
                              value={studentsData[editingStudentIndex].sppKeterangan}
                              onChange={(e) => handleUpdateStudentField(editingStudentIndex, 'sppKeterangan', e.target.value)}
                              className="w-full px-3.5 py-2.5 text-sm font-bold text-zinc-800 dark:text-zinc-150 focus:outline-hidden"
                            >
                              <option value="" className="dark:text-white">-- Kosong --</option>
                              <option value="V" className="dark:text-white">V - Tepat waktu</option>
                              <option value="T" className="dark:text-white">T - Terlambat</option>
                              <option value="S" className="dark:text-white">S - Kesulitan</option>
                              <option value="I" className="dark:text-white">I - Dihutang</option>
                              <option value="A" className="dark:text-white">A - Tanpa Alasan</option>
                            </select>
                          </div>
                        </div>

                        {/* SPP Nominal & HS & JM */}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="col-span-1">
                            <label className="block text-sm font-black text-zinc-500 dark:text-zinc-400 mb-1.5">Hafalan (HS)</label>
                            <select
                              value={studentsData[editingStudentIndex].hs}
                              onChange={(e) => handleUpdateStudentField(editingStudentIndex, 'hs', e.target.value)}
                              className="w-full px-2 py-2.5 text-sm font-bold text-zinc-800 dark:text-zinc-150 text-center focus:outline-hidden cursor-pointer"
                            >
                              <option value="" className="dark:text-white">-</option>
                              <option value="V" className="dark:text-white">V</option>
                              <option value="S" className="dark:text-white">S</option>
                              <option value="I" className="dark:text-white">I</option>
                              <option value="A" className="dark:text-white">A</option>
                              <option value="T" className="dark:text-white">T</option>
                              <option value="B" className="dark:text-white">B</option>
                            </select>
                          </div>
                          <div className="col-span-1">
                            <label className="block text-sm font-black text-zinc-500 dark:text-zinc-400 mb-1.5">Juz (JM)</label>
                            <select
                              value={studentsData[editingStudentIndex].jm}
                              onChange={(e) => handleUpdateStudentField(editingStudentIndex, 'jm', e.target.value)}
                              className="w-full px-2 py-2.5 text-sm font-bold text-zinc-800 dark:text-zinc-150 text-center focus:outline-hidden cursor-pointer"
                            >
                              <option value="" className="dark:text-white">-</option>
                              <option value="V" className="dark:text-white">V</option>
                              <option value="S" className="dark:text-white">S</option>
                              <option value="I" className="dark:text-white">I</option>
                              <option value="A" className="dark:text-white">A</option>
                              <option value="T" className="dark:text-white">T</option>
                              <option value="B" className="dark:text-white">B</option>
                            </select>
                          </div>
                          <div className="col-span-1">
                            <label className="block text-sm font-black text-zinc-500 dark:text-zinc-400 mb-1.5">SPP (Rp)</label>
                            <input
                              type="number"
                              value={studentsData[editingStudentIndex].sppNominal || ''}
                              onChange={(e) => handleUpdateStudentField(editingStudentIndex, 'sppNominal', Number(e.target.value))}
                              className="w-full px-2 py-2.5 font-mono text-sm font-bold text-zinc-800 dark:text-zinc-150 text-right focus:outline-hidden"
                              placeholder="0"
                            />
                          </div>
                        </div>

                        {/* Pendampingan */}
                        <div>
                          <label className="block text-sm font-black text-zinc-500 dark:text-zinc-400 mb-1.5">Pendampingan</label>
                          <input
                            type="text"
                            value={studentsData[editingStudentIndex].pendampingan}
                            onChange={(e) => handleUpdateStudentField(editingStudentIndex, 'pendampingan', e.target.value)}
                            className="w-full px-3.5 py-2.5 text-sm font-bold text-zinc-800 dark:text-zinc-150 focus:outline-hidden"
                            placeholder="Keterangan pendampingan"
                          />
                        </div>

                        {/* Attendance weeks */}
                        <div>
                          <label className="block text-sm font-black text-zinc-500 dark:text-zinc-400 mb-2">Presensi Kehadiran Sesi</label>
                          <div className="space-y-2">
                            {weeks.map((wk, wIdx) => {
                              const cellValue = studentsData[editingStudentIndex!].attendance[wIdx] || '';
                              return (
                                <div key={wIdx} className="flex items-center justify-between p-2">
                                  <span className="text-sm font-extrabold text-zinc-500">{wk || `Pekan ${wIdx + 1}`}</span>
                                  
                                  {/* Code select buttons */}
                                  <div className="flex gap-1">
                                    {['V', 'T', 'S', 'I', 'A', 'B'].map((code) => {
                                      const isAct = cellValue === code;
                                      
                                      let actStyle = 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-650 dark:text-white';
                                      if (isAct) {
                                        if (code === 'V') actStyle = 'bg-emerald-600 text-white shadow-xs';
                                        else if (code === 'T') actStyle = 'bg-amber-500 text-white shadow-xs';
                                        else if (code === 'S' || code === 'I') actStyle = 'bg-sky-500 text-white shadow-xs';
                                        else if (code === 'A') actStyle = 'bg-rose-600 text-white shadow-xs';
                                        else if (code === 'B') actStyle = 'bg-zinc-500 text-white shadow-xs';
                                      }

                                      return (
                                        <button
                                          key={code}
                                          type="button"
                                          onClick={() => handleUpdateAttendanceCell(editingStudentIndex!, wIdx, isAct ? '' : code)}
                                          className={`w-7 h-7 text-sm font-black rounded-lg transition-all cursor-pointer ${actStyle}`}
                                        >
                                          {code}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Bulletins */}
                        <div className="grid grid-cols-2 gap-4 pt-1">
                          <label className="flex items-center gap-2.5 p-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={studentsData[editingStudentIndex].buletinCetak}
                              onChange={(e) => handleUpdateStudentField(editingStudentIndex, 'buletinCetak', e.target.checked)}
                              className="w-4 h-4 text-red-600 focus:ring-red-500"
                            />
                            <div className="text-sm font-bold text-zinc-650 dark:text-zinc-350">Buletin Cetak</div>
                          </label>
                          <label className="flex items-center gap-2.5 p-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={studentsData[editingStudentIndex].buletinDigital}
                              onChange={(e) => handleUpdateStudentField(editingStudentIndex, 'buletinDigital', e.target.checked)}
                              className="w-4 h-4 text-red-600 focus:ring-red-500"
                            />
                            <div className="text-sm font-bold text-zinc-650 dark:text-zinc-350">Buletin Digital</div>
                          </label>
                        </div>
                      </div>

                      {/* Modal Footer */}
                      <div className="pt-3 border-t flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingStudentIndex(null)}
                          className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-black transition-colors cursor-pointer"
                        >
                          Tutup
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  );
};
