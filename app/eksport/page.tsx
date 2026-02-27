"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { computeSummary } from "@/lib/summary";
import { format } from "date-fns";
import { da } from "date-fns/locale";

const BEV: Record<string,string> = { vand:"Vand", kaffe:"Kaffe", te:"Te", juice:"Juice", alkohol:"Alkohol", sodavand:"Sodavand", andet:"Andet" };
const SEV: Record<string,string> = { dry:"Tørt", damp:"Lidt fugtigt", wet:"Vådt", soaked:"Gennemblødt" };

export default function EksportPage() {
  const { profile, days, entries } = useStore();
  const [inclProfil, setInclProfil] = useState(true);
  const [inclDagbog, setInclDagbog] = useState(true);
  const [inclOverblik, setInclOverblik] = useState(true);
  const [inclKommentar, setInclKommentar] = useState(true);
  const [printing, setPrinting] = useState(false);
  const hasDays = days.length > 0;

  async function generatePDF() {
    setPrinting(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
      const W = 210; const margin = 14; let y = margin;
      const checkY = (n: number) => { if (y+n>280) { doc.addPage(); y=margin; } };
      const h1 = (t: string) => { checkY(12); doc.setFontSize(16); doc.setFont("helvetica","bold"); doc.setTextColor(30,30,30); doc.text(t,margin,y); y+=8; doc.setDrawColor(180,180,180); doc.line(margin,y,W-margin,y); y+=5; };
      const h2 = (t: string) => { checkY(10); doc.setFontSize(12); doc.setFont("helvetica","bold"); doc.setTextColor(50,50,50); doc.text(t,margin,y); y+=7; };

      doc.setFontSize(20); doc.setFont("helvetica","bold"); doc.setTextColor(20,20,20);
      doc.text("Væske- og vandladningsdagbog", margin, y); y+=8;
      doc.setFontSize(10); doc.setFont("helvetica","normal"); doc.setTextColor(120,120,120);
      doc.text(`Udskrevet: ${format(new Date(),"d. MMMM yyyy",{locale:da})}`, margin, y); y+=10;

      if (inclProfil && profile) {
        h1("Patientprofil");
        const age = new Date().getFullYear() - profile.birthYear;
        doc.setFontSize(10); doc.setFont("helvetica","normal"); doc.setTextColor(30,30,30);
        doc.text(`Køn: ${profile.sex==="male"?"Mand":"Kvinde"}  ·  Alder: ${age} år`, margin, y); y+=8;
      }

      if (inclDagbog) {
        h1("Dagbog");
        const sorted = [...days].sort((a,b) => a.dayNumber-b.dayNumber);
        for (const day of sorted) {
          const de = entries.filter((e) => e.dayId===day.id).sort((a,b) => a.timestamp.localeCompare(b.timestamp));
          h2(`Dag ${day.dayNumber} — ${format(new Date(day.date),"d. MMMM yyyy",{locale:da})}`);
          if (de.length===0) { doc.setFontSize(10); doc.text("Ingen registreringer.",margin,y); y+=6; continue; }
          const head = ["Tid","Type","Mængde","Detalje","Urgency"]; if (inclKommentar) head.push("Kommentar");
          const rows = de.map((e) => {
            const tid = format(new Date(e.timestamp),"HH:mm");
            const noteCol = inclKommentar ? [e.note??""] : [];
            if (e.type==="void") return [tid,"Vandladning",`${e.voidMl} ml`,e.isEstimated?"Est.":"Målt",String(e.urgencyScore??"-"),...noteCol];
            if (e.type==="intake") return [tid,"Væske",`${e.intakeMl} ml`,BEV[e.beverageType??"andet"],"-",...noteCol];
            return [tid,"Inkontinens","-",SEV[e.severity??"damp"],"-",...noteCol];
          });
          autoTable(doc, { startY:y, head:[head], body:rows, margin:{left:margin,right:margin}, styles:{fontSize:9,cellPadding:2}, headStyles:{fillColor:[37,99,235],textColor:255,fontStyle:"bold"} });
          y = (doc as any).lastAutoTable.finalY + 8;
        }
      }

      if (inclOverblik && profile) {
        h1("Overblik");
        for (const day of [...days].sort((a,b) => a.dayNumber-b.dayNumber)) {
          const de = entries.filter((e) => e.dayId===day.id); if (de.length===0) continue;
          const s = computeSummary(de, day, profile);
          h2(`Dag ${day.dayNumber}`);
          autoTable(doc, { startY:y, head:[["Parameter","Værdi"]], body:[
            ["Væskeindtag",`${s.totalIntakeMl} ml`],["Urinproduktion",`${s.totalVoidMl} ml`],
            ["Vandladninger dag",String(s.dayVoids)],["Vandladninger nat",String(s.nightVoids)],
            ["Største vandladning",`${s.maxVoidMl} ml`],["Natlig polyuri",`${s.nocturnalPolyuriaPct}%`],
          ], margin:{left:margin,right:margin}, styles:{fontSize:9,cellPadding:2}, headStyles:{fillColor:[37,99,235],textColor:255,fontStyle:"bold"} });
          y = (doc as any).lastAutoTable.finalY + 5;
          for (const f of s.flags) { checkY(8); doc.setFontSize(9); doc.setTextColor(180,80,0); doc.text(`⚠ ${f.label}`,margin,y); y+=5; }
          y+=4;
        }
      }

      checkY(15); doc.setFontSize(8); doc.setFont("helvetica","italic"); doc.setTextColor(150,150,150);
      doc.text("Estimater er baseret på gennemsnitsværdier og erstatter ikke klinisk måling.",margin,y);
      doc.save(`vandladningsdagbog-${format(new Date(),"yyyy-MM-dd")}.pdf`);
    } finally { setPrinting(false); }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Eksport til lægen</h1>
      <p className="text-[var(--muted)] mb-8">Vælg hvad rapporten skal indeholde.</p>
      <div className="space-y-3 mb-8">
        <Toggle icon="👤" label="Profil" sub="Køn og alder" checked={inclProfil} onChange={setInclProfil} />
        <Toggle icon="📅" label="Dagbog" sub="Alle registreringer" checked={inclDagbog} onChange={setInclDagbog} disabled={!hasDays} />
        <Toggle icon="💬" label="Kommentarer" sub="Kommentarkolonne i dagbog" checked={inclKommentar} onChange={setInclKommentar} disabled={!hasDays||!inclDagbog} />
        <Toggle icon="📊" label="Overblik" sub="Nøgletal og kliniske flag" checked={inclOverblik} onChange={setInclOverblik} disabled={!hasDays} />
      </div>
      <button onClick={generatePDF} disabled={printing||(!inclProfil&&!inclDagbog&&!inclOverblik)} className="w-full py-5 rounded-2xl text-xl font-bold disabled:opacity-40" style={{ background:"var(--accent)", color:"#fff" }}>{printing?"⏳ Genererer…":"📄 Generer PDF"}</button>
      <p className="text-xs text-[var(--muted)] text-center mt-6">PDF genereres lokalt. Ingen data sendes til en server.</p>
    </div>
  );
}

function Toggle({ icon, label, sub, checked, onChange, disabled=false }: { icon:string; label:string; sub:string; checked:boolean; onChange:(v:boolean)=>void; disabled?:boolean }) {
  return <button onClick={() => !disabled&&onChange(!checked)} className="w-full flex items-center gap-4 p-4 rounded-2xl text-left" style={{ background:"var(--surface)", border:`2px solid ${checked&&!disabled?"var(--accent)":"var(--border)"}`, opacity:disabled?0.4:1 }}>
    <span className="text-3xl">{icon}</span><div className="flex-1"><p className="font-semibold text-lg">{label}</p><p className="text-sm text-[var(--muted)]">{sub}</p></div>
    <div className="w-12 h-7 rounded-full flex items-center px-1" style={{ background:checked&&!disabled?"var(--accent)":"var(--border)" }}><div className="w-5 h-5 rounded-full bg-white transition-all" style={{ transform:checked&&!disabled?"translateX(20px)":"translateX(0)" }} /></div>
  </button>;
}
