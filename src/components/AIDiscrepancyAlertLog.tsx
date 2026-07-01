import { AlertTriangle } from 'lucide-react';

interface MaterialInconsistency {
  description: string;
  source: string;
}

interface AIDiscrepancyAlertLogProps {
  inconsistencies: MaterialInconsistency[];
}

export function AIDiscrepancyAlertLog({ inconsistencies }: AIDiscrepancyAlertLogProps) {
  if (inconsistencies.length === 0) return null;

  return (
    <div className="rounded-lg border-2 border-red-300 bg-red-50 p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="rounded-md bg-red-600 p-1.5">
          <AlertTriangle className="h-4 w-4 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-red-900">AI Discrepancy Alert Log</h3>
          <p className="text-xs text-red-700">
            {inconsistencies.length} material inconsistency{inconsistencies.length > 1 ? 'ies' : 'y'} detected
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {inconsistencies.map((item, idx) => (
          <div
            key={idx}
            className="rounded-md bg-white border border-red-200 p-3"
          >
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-semibold text-red-700">
                {idx + 1}
              </span>
              <div className="flex-1">
                <p className="text-sm text-slate-900">
                  {item.description}
                </p>
                <p className="mt-1 text-xs font-medium text-red-600">
                  <span className="font-normal text-slate-500">Source:</span> {item.source}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-md bg-amber-100 border border-amber-300 p-2.5 text-xs text-amber-900">
        <strong>⚠️ Auditor Action Required:</strong> Please manually verify each discrepancy highlighted above before proceeding with the audit report. AI suggestions should be validated against source documents.
      </div>
    </div>
  );
}
