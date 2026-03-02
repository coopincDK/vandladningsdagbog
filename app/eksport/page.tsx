"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { computeSummary } from "@/lib/summary";
import { format } from "date-fns";
import { da } from "date-fns/locale";

const BEV: Record<string,string> = { vand:"Vand", kaffe:"Kaffe", te:"Te", juice:"Juice", alkohol:"Alkohol", sodavand:"Sodavand", andet:"Andet" };
const SEV: Record<string,string> = { dry:"Tørt", damp:"Lidt fugtigt", wet:"Vådt", soaked:"Gennemblødt" };
const GENE = ["Slet ikke","Lidt generet","Noget generet","Meget generet"];
const IPSS_QS: Record<number,string> = {
  1:"Svag stråle?", 2:"Starter/stopper strålen?", 3:"Skal presse for at starte?",
  4:"Lang tid at lade vandet?", 5:"Hyppigere end tidligere?", 6:"Svært at vente?",
  7:"Op om natten?", 8:"Ufrivillig urinafgang?", 9:"Blæren ikke helt tømt?",
  10:"Drypper efter vandladning?", 11:"Smerter/svie?", 12:"Blod i urinen?",
  13:"Problemer med rejsning?", 14:"Problemer med samleje?", 15:"Problemer med sædafgang?",
};
const IPSS_OPTS: Record<number,string[]> = {
  5:["Nej","Lidt hyppigere","Noget hyppigere","Meget hyppigere"],
  7:["Nej","1 gang","2-3 gange","4+ gange"],
};
const DEFAULT_OPTS = ["Nej","Af og til","Som regel","Altid"];

const BEVERAGE_FACTS: Record<string,string> = {
  sodavand: "Sodavand indeholder koffein og sukker, som kan irritere blæren og øge vandladningstrang.",
  kaffe:    "Kaffe er et mildt vanddrivende middel og kan irritere blæren.",
  alkohol:  "Alkohol hæmmer ADH-hormonet og øger urinproduktionen.",
  te:       "Te (sort/grøn) indeholder koffein og tanniner, der kan irritere blæren.",
  juice:    "Juice er syrlig og kan irritere blæren — særligt citrusjuice.",
  vand:     "Vand er den mest blærevenlige drik og fortynder urinen.",
  andet:    "",
};

export default function EksportPage() {
  const { profile, days, entries, ipssResult } = useStore();
  const [inclProfil, setInclProfil] = useState(true);
  const [inclDagbog, setInclDagbog] = useState(true);
  const [inclKommentar, setInclKommentar] = useState(true);
  const [inclOverblik, setInclOverblik] = useState(true);
  const [inclDiagrammer, setInclDiagrammer] = useState(true);
  const [inclFunFacts, setInclFunFacts] = useState(true);
  const [inclIpss, setInclIpss] = useState(true);
  const [printing, setPrinting] = useState(false);
  const hasDays = days.length > 0;
  const hasIpss = !!ipssResult;

  async function generatePDF() {
    setPrinting(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
      const W = 210; const margin = 14; let y = margin;
      const checkY = (n: number) => { if (y+n>280) { doc.addPage(); y=margin; } };
      const h1 = (t: string) => { checkY(14); doc.setFontSize(16); doc.setFont("helvetica","bold"); doc.setTextColor(30,30,30); doc.text(t,margin,y); y+=8; doc.setDrawColor(180,180,180); doc.line(margin,y,W-margin,y); y+=5; };
      const h2 = (t: string) => { checkY(10); doc.setFontSize(12); doc.setFont("helvetica","bold"); doc.setTextColor(50,50,50); doc.text(t,margin,y); y+=7; };
      const body = (t: string, color?: [number,number,number]) => { checkY(6); doc.setFontSize(10); doc.setFont("helvetica","normal"); doc.setTextColor(...(color??[30,30,30])); const lines = doc.splitTextToSize(t, W-margin*2); doc.text(lines,margin,y); y+=6*lines.length; };

      // Titel
      doc.setFontSize(20); doc.setFont("helvetica","bold"); doc.setTextColor(20,20,20);
      doc.text("Væske- og vandladningsdagbog", margin, y); y+=8;
      doc.setFontSize(10); doc.setFont("helvetica","normal"); doc.setTextColor(120,120,120);
      doc.text(`Udskrevet: ${format(new Date(),"d. MMMM yyyy",{locale:da})}`, margin, y); y+=10;

      // Profil
      if (inclProfil && profile) {
        h1("Patientprofil");
        const age = new Date().getFullYear() - profile.birthYear;
        if (profile.patientLabel) body(`ID / Initialer: ${profile.patientLabel}`);
        body(`Køn: ${profile.sex==="male"?"Mand":"Kvinde"}  ·  Alder: ${age} år  ·  Fødselsår: ${profile.birthYear}`);
        body(`Sengetid: ${profile.sleepTime}  ·  Opstår: ${profile.wakeTime}`);
        y+=2;
      }

      // Dagbog
      if (inclDagbog && hasDays) {
        h1("Dagbog");
        const sorted = [...days].sort((a,b) => a.dayNumber-b.dayNumber);
        for (const day of sorted) {
          const de = entries.filter((e) => e.dayId===day.id).sort((a,b) => a.timestamp.localeCompare(b.timestamp));
          h2(`Dag ${day.dayNumber} — ${format(new Date(day.date),"d. MMMM yyyy",{locale:da})}`);
          if (de.length===0) { body("Ingen registreringer."); continue; }
          const head = ["Tid","Type","Mængde","Detalje","Urgency"];
          if (inclKommentar) head.push("Kommentar");
          const tableRows = de.map((e) => {
            const tid = format(new Date(e.timestamp),"HH:mm");
            const noteCol = inclKommentar ? [e.note??""] : [];
            if (e.type==="void") return [tid,"Vandladning",`${e.voidMl} ml`,e.isEstimated?"Est.":"Målt",String(e.urgencyScore??"-"),...noteCol];
            if (e.type==="intake") return [tid,"Væske",`${e.intakeMl} ml`,BEV[e.beverageType??"andet"],"-",...noteCol];
            return [tid,"Inkontinens","-",SEV[e.severity??"damp"],"-",...noteCol];
          });
          autoTable(doc, { startY:y, head:[head], body:tableRows, margin:{left:margin,right:margin}, styles:{fontSize:9,cellPadding:2}, headStyles:{fillColor:[37,99,235],textColor:255,fontStyle:"bold"} });
          y = (doc as any).lastAutoTable.finalY + 8;
        }
      }

      // Overblik
      if (inclOverblik && hasDays && profile) {
        h1("Overblik");
        for (const day of [...days].sort((a,b) => a.dayNumber-b.dayNumber)) {
          const de = entries.filter((e) => e.dayId===day.id); if (de.length===0) continue;
          const s = computeSummary(de, day, profile);
          h2(`Dag ${day.dayNumber}`);
          autoTable(doc, { startY:y, head:[["Parameter","Værdi"]], body:[
            ["Væskeindtag",`${s.totalIntakeMl} ml`],["Urinproduktion",`${s.totalVoidMl} ml`],
            ["Vandladninger dag",String(s.dayVoids)],["Vandladninger nat",String(s.nightVoids)],
            ["Største vandladning",`${s.maxVoidMl} ml`],["Mindste vandladning",`${s.minVoidMl} ml`],
            ["Natlig polyuri",`${s.nocturnalPolyuriaPct}%`],["Inkontinensepisoder",String(s.incontinenceCount)],
            ["Gns. urgency",String(s.avgUrgency)],
          ], margin:{left:margin,right:margin}, styles:{fontSize:9,cellPadding:2}, headStyles:{fillColor:[37,99,235],textColor:255,fontStyle:"bold"} });
          y = (doc as any).lastAutoTable.finalY + 5;
          for (const f of s.flags) { checkY(8); doc.setFontSize(9); doc.setTextColor(180,80,0); doc.text(`⚠ ${f.label}`,margin,y); y+=5; }
          y+=4;
        }
      }

      // Diagrammer (ASCII-stil søjlediagram i PDF)
      if (inclDiagrammer && hasDays && profile) {
        h1("Diagrammer");
        for (const day of [...days].sort((a,b) => a.dayNumber-b.dayNumber)) {
          const de = entries.filter((e) => e.dayId===day.id);
          const voids = de.filter((e) => e.type==="void" && e.voidMl);
          if (voids.length === 0) continue;

          h2(`Dag ${day.dayNumber} — Vandladningsstørrelser`);
          checkY(30);

          // Tegn søjlediagram
          const maxMl = Math.max(...voids.map((e) => e.voidMl ?? 0));
          const barMaxH = 25; const barW = Math.min(8, (W - margin*2) / voids.length - 1);
          const chartX = margin; const chartY = y + barMaxH;

          // Baseline
          doc.setDrawColor(180,180,180);
          doc.line(chartX, chartY, chartX + voids.length * (barW+1), chartY);

          voids.sort((a,b) => a.timestamp.localeCompare(b.timestamp)).forEach((e, i) => {
            const h = ((e.voidMl ?? 0) / maxMl) * barMaxH;
            const x = chartX + i * (barW + 1);
            const isEst = e.isEstimated;
            doc.setFillColor(isEst ? 245 : 37, isEst ? 158 : 99, isEst ? 11 : 235);
            doc.rect(x, chartY - h, barW, h, "F");
            // Tid under søjle
            doc.setFontSize(6); doc.setTextColor(120,120,120);
            doc.text(format(new Date(e.timestamp),"HH:mm"), x, chartY + 4);
          });

          // Legende
          y = chartY + 10;
          doc.setFontSize(8); doc.setTextColor(37,99,235);
          doc.text("■ Målt", margin, y);
          doc.setTextColor(245,158,11);
          doc.text("■ Estimeret", margin + 18, y);
          y += 8;

          // Urgency fordeling
          const urgencies = voids.filter((e) => e.urgencyScore != null);
          if (urgencies.length > 0) {
            h2(`Dag ${day.dayNumber} — Urgency fordeling`);
            const counts = [0,1,2,3,4].map((n) => urgencies.filter((e) => e.urgencyScore===n).length);
            const labels = ["0 Ingen","1 Svag","2 Moderat","3 Stærk","4 Kunne ikke holde"];
            const colors: [number,number,number][] = [[34,197,94],[132,204,22],[245,158,11],[249,115,22],[239,68,68]];
            const maxC = Math.max(...counts, 1);
            const bW = 30;
            counts.forEach((c, i) => {
              checkY(7);
              doc.setFontSize(8); doc.setTextColor(80,80,80);
              doc.text(labels[i], margin, y);
              doc.setFillColor(...colors[i]);
              doc.rect(margin + 45, y - 4, (c / maxC) * bW, 4, "F");
              doc.setTextColor(80,80,80);
              doc.text(String(c), margin + 45 + (c/maxC)*bW + 2, y);
              y += 6;
            });
            y += 4;
          }
        }
      }

      // Fun facts
      if (inclFunFacts && hasDays) {
        h1("Væske-noter");
        // Find hvilke driktyper der er brugt
        const intakes = entries.filter((e) => e.type==="intake" && e.beverageType);
        const usedTypes = Array.from(new Set(intakes.map((e) => e.beverageType ?? "andet")));
        if (usedTypes.length === 0) {
          body("Ingen væskeregistreringer.");
        } else {
          for (const bev of usedTypes) {
            const fact = BEVERAGE_FACTS[bev];
            if (!fact) continue;
            const totalMl = intakes.filter((e) => e.beverageType===bev).reduce((s,e) => s+(e.intakeMl??0), 0);
            checkY(12);
            doc.setFontSize(10); doc.setFont("helvetica","bold"); doc.setTextColor(37,99,235);
            doc.text(`${BEV[bev]} (${totalMl} ml total)`, margin, y); y+=5;
            body(fact, [80,80,80]);
            y+=2;
          }
        }
      }

      // IPSS
      if (inclIpss && ipssResult) {
        h1("DAN-PSS Spørgeskema");
        const sev = ipssResult.total >= 25 ? "Svære" : ipssResult.total >= 13 ? "Moderate" : "Lette";
        body(`Score: ${ipssResult.total} point — ${sev} symptomer`);
        if (!ipssResult.skipSex) body(`Seksualfunktion (separat): ${ipssResult.sexTotal} point`);
        body(`Udfyldt: ${format(new Date(ipssResult.completedAt),"d. MMMM yyyy",{locale:da})}`);
        y+=3;

        const mainIds = Object.keys(IPSS_QS).map(Number).filter(id => id <= 12);
        const sexIds = [13,14,15];
        const showIds = ipssResult.skipSex ? mainIds : [...mainIds, ...sexIds];

        const ipssRows = showIds.map(id => {
          const ans = ipssResult.answers[id];
          const opts = IPSS_OPTS[id] ?? DEFAULT_OPTS;
          const svar = ans ? opts[ans.a] ?? "-" : "-";
          const generet = ans && ans.a > 0 ? GENE[ans.b ?? 0] : "-";
          const kommentar = ans?.comment ?? "";
          return [String(id), IPSS_QS[id] ?? "", svar, generet, kommentar];
        });

        autoTable(doc, {
          startY: y,
          head: [["#","Spørgsmål","Svar","Generet","Kommentar"]],
          body: ipssRows,
          margin: {left:margin,right:margin},
          styles: {fontSize:8,cellPadding:2},
          headStyles: {fillColor:[37,99,235],textColor:255,fontStyle:"bold"},
          columnStyles: { 0:{cellWidth:8}, 1:{cellWidth:60}, 2:{cellWidth:30}, 3:{cellWidth:28} },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
      }

      // Disclaimer
      checkY(15);
      doc.setFontSize(8); doc.setFont("helvetica","italic"); doc.setTextColor(150,150,150);
      doc.text("Estimater er baseret på gennemsnitsværdier og erstatter ikke klinisk måling. DAN-PSS erstatter ikke lægelig vurdering.",margin,y);

      doc.save(`vandladningsdagbog-${format(new Date(),"yyyy-MM-dd")}.pdf`);
    } finally { setPrinting(false); }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Eksport til lægen</h1>
      <p className="text-[var(--muted)] mb-6">Vælg hvad rapporten skal indeholde.</p>

      <div className="space-y-3 mb-8">
        <Toggle icon="👤" label="Profil" sub={profile?.patientLabel ? `ID: ${profile.patientLabel} · Køn og alder` : "Køn og alder"} checked={inclProfil} onChange={setInclProfil} />
        <Toggle icon="📅" label="Dagbog" sub="Alle registreringer" checked={inclDagbog} onChange={setInclDagbog} disabled={!hasDays} />
        <Toggle icon="💬" label="Kommentarer" sub="Kommentarkolonne i dagbog" checked={inclKommentar} onChange={setInclKommentar} disabled={!hasDays||!inclDagbog} />
        <Toggle icon="📊" label="Overblik" sub="Nøgletal og kliniske flag" checked={inclOverblik} onChange={setInclOverblik} disabled={!hasDays} />
        <Toggle icon="📈" label="Diagrammer" sub="Søjlediagram + urgency fordeling per dag" checked={inclDiagrammer} onChange={setInclDiagrammer} disabled={!hasDays} />
        <Toggle icon="💡" label="Væske-noter" sub="Info om de drikkevarer du har registreret" checked={inclFunFacts} onChange={setInclFunFacts} disabled={!hasDays} />
        <Toggle icon="📝" label="DAN-PSS skema" sub={hasIpss ? `Score: ${ipssResult!.total} point — udfyldt ${format(new Date(ipssResult!.completedAt),"d. MMM",{locale:da})}` : "Ikke udfyldt endnu"} checked={inclIpss} onChange={setInclIpss} disabled={!hasIpss} />
      </div>

      {!profile?.patientLabel && (
        <div className="rounded-2xl p-4 mb-6" style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
          <p className="text-sm" style={{ color:"var(--muted)" }}>
            💡 Du kan tilføje dit ID/initialer under <strong>Profil</strong> — det vises øverst i PDF'en.
          </p>
        </div>
      )}

      <button
        onClick={generatePDF}
        disabled={printing||(!inclProfil&&!inclDagbog&&!inclOverblik&&!inclIpss&&!inclDiagrammer&&!inclFunFacts)}
        className="w-full py-5 rounded-2xl text-xl font-bold disabled:opacity-40"
        style={{ background:"var(--accent)", color:"#fff" }}
      >
        {printing ? "⏳ Genererer…" : "📄 Generer PDF"}
      </button>
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
