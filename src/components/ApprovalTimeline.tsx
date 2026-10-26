import React from 'react';
import { Check, X, AlertCircle } from 'lucide-react';
import { PrintRequest, Approval } from '../types/models';

interface ApprovalTimelineProps {
  request: PrintRequest;
  approvals: Approval[];
}

type StageState = 'completed' | 'current' | 'rejected' | 'changes' | 'upcoming';

export const ApprovalTimeline: React.FC<ApprovalTimelineProps> = ({
  request,
  approvals,
}) => {
  const status = request.currentStatus;

  const profApproval = approvals.find(
    (a) => a.requestId === request.id && a.reviewerRole === 'PROFESSOR'
  );
  const pcApproval = approvals.find(
    (a) => a.requestId === request.id && a.reviewerRole === 'PC_ADMIN'
  );

  // Stage 1: Request Submitted
  const stage1State: StageState = status === 'DRAFT' ? 'current' : 'completed';
  const stage1Sub =
    status === 'DRAFT' ? 'Draft not submitted' : request.submissionDateTimeFormatted;

  // Stage 2: Professor Approval
  let stage2State: StageState = 'upcoming';
  let stage2Sub = 'Not yet';
  if (status === 'PENDING_PROFESSOR_APPROVAL' || status === 'SUBMITTED') {
    stage2State = 'current';
    stage2Sub = 'Pending';
  } else if (status === 'CHANGES_REQUESTED') {
    stage2State = 'changes';
    stage2Sub = 'Changes Requested';
  } else if (status === 'REJECTED_BY_PROFESSOR') {
    stage2State = 'rejected';
    stage2Sub = profApproval?.timestampFormatted || 'Rejected';
  } else if (
    status === 'PENDING_PC_APPROVAL' ||
    status === 'REJECTED_BY_PC' ||
    status === 'APPROVED_ACCESS_GRANTED' ||
    status === 'ACCESS_REVOKED'
  ) {
    stage2State = 'completed';
    stage2Sub = profApproval?.timestampFormatted || 'Approved';
  }

  // Stage 3: PC Approval
  let stage3State: StageState = 'upcoming';
  let stage3Sub = 'Not yet';
  if (status === 'PENDING_PC_APPROVAL') {
    stage3State = 'current';
    stage3Sub = 'Pending';
  } else if (status === 'REJECTED_BY_PC') {
    stage3State = 'rejected';
    stage3Sub = pcApproval?.timestampFormatted || 'Rejected';
  } else if (
    status === 'APPROVED_ACCESS_GRANTED' ||
    status === 'ACCESS_REVOKED'
  ) {
    stage3State = 'completed';
    stage3Sub = pcApproval?.timestampFormatted || 'Authorized';
  }

  // Stage 4: Access Granted
  let stage4State: StageState = 'upcoming';
  let stage4Sub = 'Not yet';
  if (status === 'APPROVED_ACCESS_GRANTED') {
    stage4State = 'completed';
    stage4Sub = 'Access Active';
  } else if (status === 'ACCESS_REVOKED') {
    stage4State = 'rejected';
    stage4Sub = 'Access Revoked';
  }

  const stages = [
    {
      num: 1,
      title: 'Submitted',
      subtitle: stage1Sub,
      state: stage1State,
    },
    {
      num: 2,
      title: 'Professor Approval',
      subtitle: stage2Sub,
      state: stage2State,
    },
    {
      num: 3,
      title: 'PC Approval',
      subtitle: stage3Sub,
      state: stage3State,
    },
    {
      num: 4,
      title: 'Access Granted',
      subtitle: stage4Sub,
      state: stage4State,
    },
  ];

  const renderNodeCircle = (num: number, state: StageState) => {
    if (state === 'completed') {
      return (
        <div className="w-8 h-8 rounded-full bg-[#1662F3] text-white flex items-center justify-center shadow-xs z-10">
          <Check className="w-4 h-4 stroke-[2.5]" />
        </div>
      );
    }
    if (state === 'current') {
      return (
        <div className="w-8 h-8 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center shadow-xs z-10">
          {num}
        </div>
      );
    }
    if (state === 'rejected') {
      return (
        <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xs z-10">
          <X className="w-4 h-4 stroke-[2.5]" />
        </div>
      );
    }
    if (state === 'changes') {
      return (
        <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-xs z-10">
          <AlertCircle className="w-4 h-4 stroke-[2.5]" />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-full bg-white border border-slate-300 text-slate-500 font-semibold text-xs flex items-center justify-center z-10">
        {num}
      </div>
    );
  };

  return (
    <div className="w-full py-2">
      <div className="grid grid-cols-4 relative">
        {stages.map((stage, idx) => {
          const nextStage = stages[idx + 1];
          const isLineBlue =
            stage.state === 'completed' &&
            nextStage &&
            nextStage.state !== 'upcoming';

          return (
            <div
              key={stage.num}
              className="flex flex-col items-center text-center relative"
            >
              {/* Connector line to the right */}
              {idx < stages.length - 1 && (
                <div
                  className={`absolute top-4 left-1/2 w-full h-[2px] ${
                    isLineBlue ? 'bg-[#1662F3]' : 'bg-slate-200'
                  }`}
                />
              )}

              {renderNodeCircle(stage.num, stage.state)}

              <span
                className={`mt-2.5 text-xs font-semibold ${
                  stage.state === 'upcoming'
                    ? 'text-slate-600'
                    : 'text-slate-900'
                }`}
              >
                {stage.title}
              </span>

              <span
                className={`mt-0.5 text-[11px] font-medium ${
                  stage.state === 'current'
                    ? 'text-amber-600 font-semibold'
                    : stage.state === 'rejected'
                    ? 'text-red-600 font-semibold'
                    : stage.state === 'changes'
                    ? 'text-orange-600 font-semibold'
                    : 'text-slate-500'
                }`}
              >
                {stage.subtitle}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
