import React, { useState } from 'react';
import { Link, } from 'react-router-dom';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { ImportStepper } from '../components/import/ImportStepper';
import { Step1Upload } from '../components/import/Step1Upload';
import { Step3CheckImport } from '../components/import/Step3CheckImport';
import { Step4Result } from '../components/import/Step4Result';
import { useSalesRights } from '../hooks/useSalesRights';
import type {
  ImportUploadResponse,
  ImportConfirmResponse,
} from '../types/sales.types';

/** What the server says about each column of the uploaded file (matched automatically by its name). */
interface UploadedColumn {
  header: string;
  field: string | null;
  how: 'name' | 'none' | 'not_importable';
}

export const ImportPage: React.FC = () => {
  const { canImport } = useSalesRights();

  // Three steps: upload the file (it is checked at once), review the check, done.
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [uploadData, setUploadData] = useState<ImportUploadResponse | null>(null);
  const [confirmData, setConfirmData] = useState<ImportConfirmResponse | null>(null);

  if (!canImport) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-8 text-center max-w-lg mx-auto mt-12 shadow-2xs">
        <ShieldAlert className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-gray-900">Import Permission Denied</h3>
        <p className="text-sm text-gray-500 mt-1 mb-4">
          You do not currently have rights to import companies via spreadsheets. Please contact your organization administrator to grant import rights.
        </p>
        <Link
          to="/sales/companies"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Companies</span>
        </Link>
      </div>
    );
  }

  const handleUploaded = (data: ImportUploadResponse) => {
    setUploadData(data);
    setCurrentStep(2);
  };

  const handleConfirmed = (data: ImportConfirmResponse) => {
    setConfirmData(data);
    setCurrentStep(3);
  };

  const handleReset = () => {
    setUploadData(null);
    setConfirmData(null);
    setCurrentStep(1);
  };

  const columns = (uploadData?.columns ?? []) as unknown as UploadedColumn[];
  const ignoredColumns = columns.filter((c) => c.how === 'none' && c.header).map((c) => c.header);
  const missingCompanyName = uploadData !== null && !columns.some((c) => c.field === 'name');

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/sales/companies"
          className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 shadow-2xs transition-colors shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Import Companies</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Download the template, fill in your companies, and upload it. Every row is checked before anything is saved.
          </p>
        </div>
      </div>

      {/* Progress Stepper */}
      <ImportStepper currentStep={currentStep} />

      {/* Wizard Steps */}
      {currentStep === 1 && <Step1Upload onUploaded={handleUploaded} />}

      {currentStep === 2 && uploadData && (
        <Step3CheckImport
          checkData={uploadData}
          ignoredColumns={ignoredColumns}
          missingCompanyName={missingCompanyName}
          onBack={handleReset}
          onConfirmed={handleConfirmed}
        />
      )}

      {currentStep === 3 && confirmData && (
        <Step4Result confirmData={confirmData} onReset={handleReset} />
      )}
    </div>
  );
};
