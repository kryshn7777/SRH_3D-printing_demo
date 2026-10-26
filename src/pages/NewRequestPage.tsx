import React, { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  UploadCloud,
  Info,
  AlertCircle,
  CheckCircle2,
  FileBox,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DEPARTMENTS } from '../data/seedData';
import { SupportedMaterial, AttachmentMetadata } from '../types/models';
import { CadModelPreview } from '../components/PrinterIllustration';
import {
  saveModelBlob,
  parseStlOrObjGeometry,
  generateSeedStlArrayBuffer,
} from '../utils/stlStorageAndParser';

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
const ALLOWED_EXTENSIONS = ['stl', '3mf', 'obj'];

export const NewRequestPage: React.FC = () => {
  const { currentUser, printers, requests, createOrSubmitRequest } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedPrinterId = searchParams.get('printerId') || '';
  const editDraftId = searchParams.get('draftId') || '';

  const existingDraft = editDraftId
    ? requests.find((r) => r.id === editDraftId)
    : undefined;

  // Project Information state
  const [projectTitle, setProjectTitle] = useState(
    existingDraft?.projectTitle || ''
  );
  const [courseOrDepartment, setCourseOrDepartment] = useState(
    existingDraft?.courseOrDepartment || ''
  );
  const [description, setDescription] = useState(
    existingDraft?.description || ''
  );
  const [purpose, setPurpose] = useState(
    existingDraft?.purpose ||
      'Required for semester engineering coursework and prototype evaluation.'
  );
  const [intendedUse, setIntendedUse] = useState(
    existingDraft?.intendedUse ||
      'Functional testing, assembly verification, and academic demonstration.'
  );

  // Printer and Material state
  const [printerId, setPrinterId] = useState(
    existingDraft?.printerId || preselectedPrinterId || ''
  );
  const [material, setMaterial] = useState<SupportedMaterial | ''>(
    existingDraft?.material || ''
  );
  const [estimatedDuration, setEstimatedDuration] = useState(
    existingDraft?.estimatedDuration || ''
  );
  const [quantity, setQuantity] = useState<number>(
    existingDraft?.quantity || 1
  );
  const [requestedDateTime, setRequestedDateTime] = useState(
    existingDraft?.requestedDateTime || ''
  );

  // File Upload state
  const [attachment, setAttachment] = useState<AttachmentMetadata | null>(
    existingDraft?.attachment || null
  );
  const [fileError, setFileError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedPrinter = printers.find((p) => p.id === printerId);
  const availableMaterials: SupportedMaterial[] = selectedPrinter
    ? selectedPrinter.supportedMaterials
    : ['PLA', 'PETG', 'ABS', 'TPU', 'ASA', 'PC'];

  const handlePrinterChange = (newPrinterId: string) => {
    setPrinterId(newPrinterId);
    const pr = printers.find((p) => p.id === newPrinterId);
    if (pr && material && !pr.supportedMaterials.includes(material)) {
      setMaterial(pr.supportedMaterials[0]);
    }
  };

  const validateAndSetFile = async (file: File) => {
    setFileError(null);
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setAttachment(null);
      setFileError(
        `Unsupported file format ".${ext}". Only STL, 3MF, and OBJ 3D model files are permitted.`
      );
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setAttachment(null);
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setFileError(
        `File size (${sizeMb} MB) exceeds the maximum allowed limit of 50 MB.`
      );
      return;
    }
    if (file.size === 0) {
      setAttachment(null);
      setFileError('The selected file is empty (0 bytes).');
      return;
    }

    const sizeMb =
      file.size >= 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.max(1, Math.round(file.size / 1024))} KB`;

    try {
      const buffer = await file.arrayBuffer();
      const storageKey = `stl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await saveModelBlob(storageKey, buffer, file.name, ext.toUpperCase());

      const parsed = parseStlOrObjGeometry(buffer, file.name);
      if (ext === 'stl' && (!parsed || parsed.triangleCount === 0)) {
        setAttachment(null);
        setFileError(
          'Could not parse any valid 3D triangles from this .STL file. Please verify the file is a valid binary or ASCII STL.'
        );
        return;
      }

      setAttachment({
        fileName: file.name,
        fileSizeBytes: file.size,
        fileSizeFormatted: sizeMb,
        fileType: ext.toUpperCase() as 'STL' | '3MF' | 'OBJ',
        uploadedAt: 'Just now',
        dimensionsMm: parsed?.dimensionsMm || '124 × 76 × 42 mm',
        previewKey: 'generic-stl',
        storageKey,
        triangleCount: parsed?.triangleCount,
        volumeCm3: parsed?.volumeCm3,
      });
    } catch {
      setFileError('Failed to read the selected 3D model file.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void validateAndSetFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void validateAndSetFile(file);
    }
  };

  const attachSampleStl = async () => {
    setFileError(null);
    const sampleBuffer = generateSeedStlArrayBuffer('bracket-joint');
    const storageKey = `stl_sample_${Date.now()}`;
    await saveModelBlob(storageKey, sampleBuffer, 'robot_arm_joint.stl', 'STL');
    const parsed = parseStlOrObjGeometry(sampleBuffer, 'robot_arm_joint.stl');
    const kb = Math.max(1, Math.round(sampleBuffer.byteLength / 1024));
    setAttachment({
      fileName: 'robot_arm_joint.stl',
      fileSizeBytes: sampleBuffer.byteLength,
      fileSizeFormatted: `${kb} KB`,
      fileType: 'STL',
      uploadedAt: 'Just now',
      dimensionsMm: parsed?.dimensionsMm || '104 × 64 × 54 mm',
      previewKey: 'bracket-joint',
      storageKey,
      triangleCount: parsed?.triangleCount,
      volumeCm3: parsed?.volumeCm3,
    });
  };

  const fillSampleProject = () => {
    setProjectTitle('Autonomous Rover Gripper Bracket');
    setCourseOrDepartment('B.Eng. Applied Mechatronic Systems');
    setDescription(
      'Reinforced servo actuator mounting bracket for a 2-finger parallel gripper used in the Mechatronics Lab.'
    );
    setPurpose(
      'Required for MECH-401 Robotics Subsystem Integration practical assessment.'
    );
    setIntendedUse(
      'Functional mechanical load testing and end-effector assembly.'
    );
    setPrinterId('PR-02');
    setMaterial('PETG');
    setEstimatedDuration('4.5 hours');
    setQuantity(1);
    attachSampleStl();
    setFormErrors([]);
  };

  const validateForm = (isDraft: boolean): boolean => {
    const errs: string[] = [];
    if (!projectTitle.trim()) {
      errs.push('Project Title is required.');
    }
    if (!isDraft) {
      if (!courseOrDepartment.trim()) {
        errs.push('Course / Department is required.');
      }
      if (!description.trim() || description.trim().length < 10) {
        errs.push(
          'Detailed Description is required (minimum 10 characters explaining what you want to print).'
        );
      }
      if (!purpose.trim()) {
        errs.push('Academic reason / why the print is required must be specified.');
      }
      if (!intendedUse.trim()) {
        errs.push('Intended use of the printed object is required.');
      }
      if (!printerId) {
        errs.push('Please select a target FDM Printer.');
      }
      if (!material) {
        errs.push('Please select a Filament Material.');
      }
      if (!estimatedDuration.trim()) {
        errs.push('Estimated Print Time is required (e.g. 4 hours).');
      }
      if (!quantity || quantity < 1 || quantity > 50) {
        errs.push('Quantity must be between 1 and 50.');
      }
      if (!attachment) {
        errs.push('Please upload a valid 3D model file (.STL, .3MF, or .OBJ).');
      }
    }
    setFormErrors(errs);
    return errs.length === 0;
  };

  const handleAction = (saveAsDraft: boolean) => {
    if (!validateForm(saveAsDraft)) {
      return;
    }

    const chosenPrinterId = printerId || printers[0].id;
    const chosenPrinter =
      printers.find((p) => p.id === chosenPrinterId) || printers[0];
    const chosenMaterial =
      (material as SupportedMaterial) || chosenPrinter.supportedMaterials[0];

    const parsedHours = parseFloat(estimatedDuration) || 3;

    const result = createOrSubmitRequest({
      projectTitle: projectTitle || 'Untitled Draft Project',
      courseOrDepartment: courseOrDepartment || DEPARTMENTS[0],
      description: description || 'Draft description pending completion.',
      purpose: purpose || 'Academic coursework prototype.',
      intendedUse: intendedUse || 'Functional prototype evaluation.',
      printerId: chosenPrinter.id,
      material: chosenMaterial,
      estimatedDuration: estimatedDuration || '3 hours',
      estimatedHoursNumeric: parsedHours,
      quantity: quantity || 1,
      requestedDateTime: requestedDateTime || undefined,
      attachment: attachment || {
        fileName: 'draft_model.stl',
        fileSizeBytes: 1048576,
        fileSizeFormatted: '1.0 MB',
        fileType: 'STL',
        uploadedAt: 'Draft',
        previewKey: 'bracket-joint',
      },
      saveAsDraft,
      existingDraftId: existingDraft?.id,
    });

    if (!result.ok || !result.data) {
      setFormErrors([result.error || 'Could not save request.']);
      return;
    }

    if (saveAsDraft) {
      navigate('/student/requests?status=draft');
    } else {
      navigate(`/student/requests/${result.data.id}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Quick-Fill Helper */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            New Printer Request
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Provide the details of your project and printing requirements.
          </p>
        </div>

        <button
          type="button"
          onClick={fillSampleProject}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#1662F3] border border-blue-200 text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Auto-Fill Demo Request
        </button>
      </div>

      {/* Validation Errors Banner */}
      {formErrors.length > 0 && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs space-y-1"
        >
          <div className="font-bold flex items-center gap-2 text-red-900">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            Please correct the following issues before submitting:
          </div>
          <ul className="list-disc pl-6 space-y-0.5">
            {formErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Three-Column Structured Layout matching Screen 4 */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAction(false);
        }}
        noValidate
        className="space-y-6"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
          {/* Column 1: Project Information */}
          <section className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-900">
                Project Information
              </h2>

              <div>
                <label
                  htmlFor="req-project-title"
                  className="block text-xs font-semibold text-slate-800 mb-1.5"
                >
                  Project Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="req-project-title"
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="e.g. Drone bracket"
                  required
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1662F3]"
                />
              </div>

              <div>
                <label
                  htmlFor="req-department"
                  className="block text-xs font-semibold text-slate-800 mb-1.5"
                >
                  Course / Department <span className="text-red-500">*</span>
                </label>
                <select
                  id="req-department"
                  value={courseOrDepartment}
                  onChange={(e) => setCourseOrDepartment(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1662F3]"
                >
                  <option value="">Select department</option>
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="req-description"
                  className="block text-xs font-semibold text-slate-800 mb-1.5"
                >
                  Detailed Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="req-description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain what you want to print and why..."
                  required
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1662F3]"
                />
              </div>

              <div className="space-y-4 pt-1">
                <div>
                  <label
                    htmlFor="req-purpose"
                    className="block text-xs font-semibold text-slate-800 mb-1.5"
                  >
                    Why Print is Required (Academic Justification) <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="req-purpose"
                    type="text"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="e.g. Course milestone, thesis prototype, lab assignment"
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1662F3]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="req-intended-use"
                    className="block text-xs font-semibold text-slate-800 mb-1.5"
                  >
                    Intended Use of Printed Object <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="req-intended-use"
                    type="text"
                    value={intendedUse}
                    onChange={(e) => setIntendedUse(e.target.value)}
                    placeholder="e.g. Functional mechanical test, fit check, assembly"
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1662F3]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span className="font-medium text-slate-500">Applicant:</span>
              <span className="font-semibold text-slate-800 truncate ml-2">
                {currentUser?.name || 'Anna Müller'} ({currentUser?.email || 'anna.mueller@srh-berlin.de'})
              </span>
            </div>
          </section>

          {/* Column 2: Printer and Material */}
          <section className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-900">
                Printer and Material
              </h2>

              <div>
                <label
                  htmlFor="req-printer"
                  className="block text-xs font-semibold text-slate-800 mb-1.5"
                >
                  Select Printer <span className="text-red-500">*</span>
                </label>
                <select
                  id="req-printer"
                  value={printerId}
                  onChange={(e) => handlePrinterChange(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1662F3]"
                >
                  <option value="">Choose a printer</option>
                  {printers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.id}) — {p.availabilityStatus}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="req-material"
                  className="block text-xs font-semibold text-slate-800 mb-1.5"
                >
                  Material <span className="text-red-500">*</span>
                </label>
                <select
                  id="req-material"
                  value={material}
                  onChange={(e) =>
                    setMaterial(e.target.value as SupportedMaterial)
                  }
                  required
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1662F3]"
                >
                  <option value="">Select material</option>
                  {availableMaterials.map((mat) => (
                    <option key={mat} value={mat}>
                      {mat}
                    </option>
                  ))}
                </select>
                {selectedPrinter && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Supported on {selectedPrinter.name}:{' '}
                    <span className="font-semibold text-slate-700">
                      {selectedPrinter.supportedMaterials.join(', ')}
                    </span>
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="req-duration"
                  className="block text-xs font-semibold text-slate-800 mb-1.5"
                >
                  Estimated Print Time <span className="text-red-500">*</span>
                </label>
                <input
                  id="req-duration"
                  type="text"
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(e.target.value)}
                  placeholder="e.g. 6 hours"
                  required
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1662F3]"
                />
              </div>

              <div>
                <label
                  htmlFor="req-quantity"
                  className="block text-xs font-semibold text-slate-800 mb-1.5"
                >
                  Quantity
                </label>
                <input
                  id="req-quantity"
                  type="number"
                  min={1}
                  max={50}
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))
                  }
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1662F3]"
                />
              </div>

              <div>
                <label
                  htmlFor="req-datetime"
                  className="block text-[11px] font-semibold text-slate-700 mb-1"
                >
                  Preferred Print Slot (Optional)
                </label>
                <input
                  id="req-datetime"
                  type="datetime-local"
                  value={requestedDateTime}
                  onChange={(e) => setRequestedDateTime(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1662F3]"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span className="font-medium text-slate-500">Selected Machine:</span>
              <span className="font-semibold text-slate-800 truncate ml-2">
                {selectedPrinter?.name || 'None selected'}
              </span>
            </div>
          </section>

          {/* Column 3: Upload Files */}
          <section className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between space-y-4">
            <div className="space-y-4 flex-1 flex flex-col">
              <h2 className="text-sm font-bold text-slate-900">Upload Files</h2>

              {/* Dashed Dropzone matching Screen 4 */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`flex-1 rounded-xl border-2 border-dashed p-5 flex flex-col items-center justify-center text-center transition-colors ${
                  isDragging
                    ? 'border-[#1662F3] bg-blue-50/60'
                    : fileError
                    ? 'border-red-300 bg-red-50/30'
                    : attachment
                    ? 'border-emerald-300 bg-emerald-50/20'
                    : 'border-blue-200 bg-slate-50/40'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-blue-50 text-[#1662F3] flex items-center justify-center mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>

                <p className="text-xs font-semibold text-slate-800">
                  Upload your 3D model file
                </p>
                <p className="text-xs text-slate-500 mt-0.5">(STL, 3MF, OBJ)</p>

                <input
                  ref={fileInputRef}
                  id="model-file-input"
                  type="file"
                  accept=".stl,.3mf,.obj"
                  onChange={handleFileChange}
                  className="sr-only"
                />

                {/* Choose File Pill Control matching Screen 4 */}
                <div className="mt-4 inline-flex items-center rounded-lg border border-slate-300 bg-white overflow-hidden shadow-2xs max-w-full">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-1.5 bg-[#1662F3] hover:bg-[#1251D1] text-white text-xs font-semibold transition-colors cursor-pointer shrink-0"
                  >
                    Choose File
                  </button>
                  <span className="px-3 py-1.5 text-xs text-slate-500 truncate max-w-[165px]">
                    {attachment ? attachment.fileName : 'No file chosen'}
                  </span>
                </div>

                {/* Attached File Metadata Box + Live Interactive 3D STL Preview */}
                {attachment && (
                  <div className="mt-4 w-full space-y-2.5 text-left">
                    <CadModelPreview
                      previewKey={attachment.previewKey}
                      storageKey={attachment.storageKey}
                      fileName={attachment.fileName}
                      className="w-full h-40"
                    />
                    <div className="w-full p-2.5 rounded-lg bg-white border border-emerald-200 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileBox className="w-4 h-4 text-[#1662F3] shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {attachment.fileName}
                          </div>
                          <div className="text-[10px] text-emerald-700 font-medium flex flex-wrap items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                            <span>
                              {attachment.fileSizeFormatted} • {attachment.fileType}
                              {attachment.triangleCount
                                ? ` • ${attachment.triangleCount.toLocaleString()} tris`
                                : ''}
                              {attachment.volumeCm3
                                ? ` • ${attachment.volumeCm3} cm³`
                                : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAttachment(null)}
                        className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                        aria-label="Remove attached file"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* File Validation Error */}
                {fileError && (
                  <div
                    role="alert"
                    className="mt-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-700 flex items-start gap-1.5 text-left"
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                    <span>{fileError}</span>
                  </div>
                )}

                {/* Quick Sample File Buttons for Demo Testing */}
                <div className="mt-4 pt-3 border-t border-slate-200/70 w-full flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={attachSampleStl}
                    className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-[#1662F3] text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    + Attach Sample STL (2.4 MB)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachment(null);
                      setFileError(
                        'Unsupported file format ".exe". Only STL, 3MF, and OBJ 3D model files are permitted.'
                      );
                    }}
                    className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    Test Invalid File
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-1.5 text-slate-500">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Max size: 50 MB</span>
              </div>
              <span className="font-medium text-slate-500">STL / 3MF / OBJ</span>
            </div>
          </section>
        </div>

        {/* Bottom Right Actions matching Screen 4 */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={() => handleAction(true)}
            className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-colors cursor-pointer"
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={() => navigate('/student/dashboard')}
            className="px-5 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 rounded-lg bg-[#1662F3] hover:bg-[#1251D1] text-white text-sm font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Submit Request
          </button>
        </div>
      </form>
    </div>
  );
};
