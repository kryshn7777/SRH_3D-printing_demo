import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  BookOpen,
  HelpCircle,
  ArrowRight,
  Thermometer,
  ShieldCheck,
  Mail,
} from 'lucide-react';

export const MaterialsPage: React.FC = () => {
  const navigate = useNavigate();
  const materials = [
    {
      code: 'PLA',
      name: 'Polylactic Acid (Standard Prototyping)',
      nozzleTemp: '205 – 220 °C',
      bedTemp: '55 – 60 °C',
      printers: 'Prusa MK4, Ultimaker S5, Creality K1, Bambu Lab X1E',
      useCase:
        'Visual models, architectural forms, low-stress brackets, and rapid concept verification.',
    },
    {
      code: 'PETG',
      name: 'Glycol-Modified PET (Mechanical & Robotics)',
      nozzleTemp: '235 – 250 °C',
      bedTemp: '75 – 85 °C',
      printers: 'Prusa MK4, Ultimaker S5, Creality K1, Bambu Lab X1E',
      useCase:
        'Robotic arm joints, functional snap-fits, sensor mounts, and impact-resistant assemblies.',
    },
    {
      code: 'ABS',
      name: 'Acrylonitrile Butadiene Styrene (Thermal & Enclosure)',
      nozzleTemp: '245 – 260 °C',
      bedTemp: '95 – 105 °C',
      printers: 'Prusa MK4, Creality K1, Bambu Lab X1E',
      useCase:
        'Higher temperature electronics housings and structural components requiring acetone smoothing.',
    },
    {
      code: 'TPU',
      name: 'Thermoplastic Polyurethane 95A (Flexible Elastomer)',
      nozzleTemp: '220 – 235 °C',
      bedTemp: '50 – 60 °C',
      printers: 'Ultimaker S5',
      useCase:
        'Vibration dampers, soft robotic grippers, gaskets, and protective bumpers.',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            FDM Filament Materials
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Technical properties and printer compatibility for SRH Berlin MakerLab filaments.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/student/requests/new')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1662F3] text-white text-xs font-semibold cursor-pointer"
        >
          New Printer Request <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {materials.map((m) => (
          <div
            key={m.code}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-md bg-blue-50 text-[#1662F3] font-bold text-xs">
                {m.code}
              </span>
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Thermometer className="w-3.5 h-3.5 text-amber-500" />
                Nozzle: {m.nozzleTemp} • Bed: {m.bedTemp}
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900">{m.name}</h2>
            <p className="text-xs text-slate-600 leading-relaxed">{m.useCase}</p>
            <div className="pt-2 border-t border-slate-100 text-xs text-slate-500">
              <strong>Compatible Printers:</strong> {m.printers}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const GuidelinesPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          3D Printing Lab Guidelines
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Design rules, approval stages, and safety requirements for SRH Berlin students.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4 text-xs text-slate-700 leading-relaxed">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <BookOpen className="w-4 h-4 text-[#1662F3]" />
          1. Two-Stage Academic &amp; Technical Approval Workflow
        </div>
        <p>
          Every print job at SRH University of Applied Sciences Berlin requires two approvals before printer credentials are unlocked:
          First, your course <strong>Professor</strong> reviews academic relevance and geometry feasibility. Second, the{' '}
          <strong>PC Administrator</strong> verifies machine scheduling, logs the job in the PC Audit Log, and issues time-limited printer backend credentials.
        </p>

        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 pt-2">
          <Layers className="w-4 h-4 text-[#1662F3]" />
          2. CAD &amp; Mesh Export Requirements
        </div>
        <ul className="list-disc pl-5 space-y-1">
          <li>Export meshes in binary <strong>.STL</strong>, <strong>.3MF</strong>, or <strong>.OBJ</strong> format (maximum file size: 50 MB).</li>
          <li>Minimum unsupported wall thickness: 1.2 mm for PLA/PETG and 1.6 mm for ABS.</li>
          <li>Verify that your model is manifold (watertight) and scaled in millimeters before uploading.</li>
        </ul>

        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 pt-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          3. MakerLab Safety Rules
        </div>
        <ul className="list-disc pl-5 space-y-1">
          <li>Never touch the brass nozzle or heated build plate during operation (temperatures exceed 240 °C).</li>
          <li>Wait until the build plate cools below 40 °C before removing finished parts.</li>
        </ul>
      </div>
    </div>
  );
};

export const HelpPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Help &amp; MakerLab Support
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Frequently asked questions and Print Center contact information.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-2 text-xs">
          <div className="font-bold text-slate-900 flex items-center gap-2 text-sm">
            <HelpCircle className="w-4 h-4 text-[#1662F3]" />
            Why is my Printer Access page locked?
          </div>
          <p className="text-slate-600 leading-relaxed">
            Printer backend credentials are only generated after both your Professor AND the PC Administrator have approved your request. Check your 4-stage timeline on the Request Details screen.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-2 text-xs">
          <div className="font-bold text-slate-900 flex items-center gap-2 text-sm">
            <Mail className="w-4 h-4 text-[#1662F3]" />
            Contact the SRH Print Center
          </div>
          <p className="text-slate-600 leading-relaxed">
            Location: Building B, Room 104 (Ernst-Reuter-Platz 10, Berlin)
            <br />
            PC Administrator: Markus Klein (markus.klein@srh-berlin.de)
          </p>
        </div>
      </div>
    </div>
  );
};
