import React from 'react';
import { Check, Upload, ArrowRightLeft, CheckCircle2, Award } from 'lucide-react';

export interface ImportStepperProps {
  currentStep: 1 | 2 | 3 | 4;
}

export const ImportStepper: React.FC<ImportStepperProps> = ({ currentStep }) => {
  const steps = [
    { number: 1, label: 'Upload File', icon: Upload },
    { number: 2, label: 'Match Columns', icon: ArrowRightLeft },
    { number: 3, label: 'Check & Preview', icon: CheckCircle2 },
    { number: 4, label: 'Import Results', icon: Award },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs p-4 sm:p-5">
      <div className="flex items-center justify-between max-w-3xl mx-auto">
        {steps.map((step, idx) => {
          const isDone = currentStep > step.number;
          const isCurrent = currentStep === step.number;
          const Icon = step.icon;

          return (
            <React.Fragment key={step.number}>
              <div className="flex flex-col items-center gap-1.5 z-10">
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-xs font-bold transition-all shadow-2xs ${
                    isDone
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                      : 'bg-gray-100 text-gray-400 border border-gray-200'
                  }`}
                >
                  {isDone ? <Check className="w-4 h-4 stroke-[2.5]" /> : <Icon className="w-4 h-4" />}
                </div>
                <span
                  className={`text-2xs sm:text-xs font-semibold text-center whitespace-nowrap ${
                    isCurrent ? 'text-primary' : isDone ? 'text-gray-900' : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 sm:mx-4 -mt-5 transition-all ${
                    currentStep > idx + 1 ? 'bg-emerald-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
