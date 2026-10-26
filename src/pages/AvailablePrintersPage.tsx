import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  SlidersHorizontal,
  Box,
  Cpu,
  MapPin,
  ShieldAlert,
  ArrowRight,
  X,
  Info,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Printer, PrinterAvailability, SupportedMaterial } from '../types/models';
import { PrinterIllustration } from '../components/PrinterIllustration';
import { PrinterAvailabilityBadge } from '../components/StatusBadge';

export const AvailablePrintersPage: React.FC = () => {
  const { printers } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightedId = searchParams.get('highlight');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | PrinterAvailability>('ALL');
  const [materialFilter, setMaterialFilter] = useState<'ALL' | SupportedMaterial>('ALL');
  const [selectedPrinter, setSelectedPrinter] = useState<Printer | null>(() =>
    highlightedId ? printers.find((p) => p.id === highlightedId) || null : null
  );

  const filteredPrinters = printers.filter((printer) => {
    const matchesSearch =
      printer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      printer.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      printer.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      printer.supportedMaterials.some((m) =>
        m.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesStatus =
      statusFilter === 'ALL' || printer.availabilityStatus === statusFilter;

    const matchesMaterial =
      materialFilter === 'ALL' ||
      printer.supportedMaterials.includes(materialFilter);

    return matchesSearch && matchesStatus && matchesMaterial;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Available Printers
            </h1>
            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-[#1662F3] border border-blue-200">
              Demo Inventory
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Inspect SRH MakerLab FDM printer specifications, build volumes, and supported filaments.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/student/requests/new')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1662F3] hover:bg-[#1251D1] text-white text-sm font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          New Printer Request
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Search & Filters Bar */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search printer name, ID (e.g. PR-01, Prusa MK4), or filament..."
            aria-label="Search printers"
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1662F3]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Status:</span>
          </div>
          {(['ALL', 'Available', 'In Use', 'Maintenance'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#1662F3] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              {st === 'ALL' ? 'All Statuses' : st}
            </button>
          ))}

          <select
            value={materialFilter}
            onChange={(e) =>
              setMaterialFilter(e.target.value as 'ALL' | SupportedMaterial)
            }
            aria-label="Filter by material"
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1662F3]"
          >
            <option value="ALL">All Materials</option>
            <option value="PLA">PLA</option>
            <option value="PETG">PETG</option>
            <option value="ABS">ABS</option>
            <option value="TPU">TPU</option>
            <option value="ASA">ASA</option>
            <option value="PC">PC</option>
          </select>
        </div>
      </div>

      {/* Printer Catalogue Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-stretch">
        {filteredPrinters.map((printer) => (
          <div
            key={printer.id}
            className="bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden"
          >
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                {/* Top Row: ID & Availability */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-xs font-semibold">
                    {printer.id}
                  </span>
                  <PrinterAvailabilityBadge status={printer.availabilityStatus} />
                </div>

                {/* Illustration & Title */}
                <div className="flex items-center gap-3.5 mb-4">
                  <PrinterIllustration
                    printerKey={printer.illustrationKey}
                    className="w-16 h-16 shrink-0"
                  />
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-slate-900 leading-snug">
                      {printer.name}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{printer.model}</p>
                    <span className="inline-block mt-1.5 px-2 py-0.5 rounded bg-blue-50 text-[#1662F3] text-[11px] font-semibold">
                      {printer.technology}
                    </span>
                  </div>
                </div>

                {/* Specifications List */}
                <div className="space-y-2.5 pt-3 border-t border-slate-100 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Box className="w-3.5 h-3.5 text-slate-400" />
                      Build Volume
                    </span>
                    <span className="font-semibold text-slate-800 font-mono">
                      {printer.buildVolume}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-slate-400" />
                      Nozzle / Layer
                    </span>
                    <span className="font-medium text-slate-700">
                      {printer.layerResolution}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      Location
                    </span>
                    <span className="font-medium text-slate-700">
                      {printer.location}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 mt-3">
                <span className="text-slate-500 block mb-1.5 text-xs">
                  Supported Materials
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {printer.supportedMaterials.map((mat) => (
                    <span
                      key={mat}
                      className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-semibold text-[11px] border border-slate-200/80"
                    >
                      {mat}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Card Footer Actions */}
            <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-200/70 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setSelectedPrinter(printer)}
                className="flex-1 py-2 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                View Details
              </button>
              <button
                type="button"
                onClick={() =>
                  navigate(`/student/requests/new?printerId=${printer.id}`)
                }
                className="flex-1 py-2 px-3 rounded-lg bg-[#1662F3] hover:bg-[#1251D1] text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Select Printer
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredPrinters.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
          <p className="text-sm font-semibold text-slate-800">
            No printers match your filter criteria.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('ALL');
              setMaterialFilter('ALL');
            }}
            className="mt-3 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Printer Details Modal */}
      {selectedPrinter && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[1px] p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="printer-detail-title"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <PrinterIllustration
                  printerKey={selectedPrinter.illustrationKey}
                  className="w-16 h-16"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-xs font-bold text-slate-700">
                      {selectedPrinter.id}
                    </span>
                    <PrinterAvailabilityBadge
                      status={selectedPrinter.availabilityStatus}
                    />
                  </div>
                  <h3
                    id="printer-detail-title"
                    className="text-lg font-bold text-slate-900 mt-1"
                  >
                    {selectedPrinter.name}
                  </h3>
                  <p className="text-xs text-slate-500">{selectedPrinter.model}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPrinter(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
                aria-label="Close details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <div>
                  <span className="text-slate-500 block">Printer Technology</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">
                    {selectedPrinter.technology} (Fused Deposition Modeling)
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Build Volume</span>
                  <span className="font-bold text-slate-900 font-mono mt-0.5 block">
                    {selectedPrinter.buildVolume}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Nozzle Hardware</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {selectedPrinter.nozzleDiameter}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Layer Resolution</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {selectedPrinter.layerResolution}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-1.5 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  Usage Restrictions & Lab Guidelines
                </h4>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  {selectedPrinter.usageRestrictions.map((rule, i) => (
                    <li key={i}>{rule}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200/70 flex items-start gap-2 text-slate-700">
                <Info className="w-4 h-4 text-[#1662F3] shrink-0 mt-0.5" />
                <span>
                  Network Backend URL ({selectedPrinter.backendUrl}) and login tokens are unlocked automatically once your request passes both Professor and PC Administrator approval stages.
                </span>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedPrinter(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/student/requests/new?printerId=${selectedPrinter.id}`
                  )
                }
                className="px-4 py-2 rounded-lg bg-[#1662F3] hover:bg-[#1251D1] text-white text-xs font-semibold cursor-pointer"
              >
                Request This Printer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
