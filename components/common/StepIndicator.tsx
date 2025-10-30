import React from 'react';

interface StepIndicatorProps {
    currentStep: number;
    totalSteps: number;
    navigateToStep: (step: number) => void;
}

const steps = [
    "Upload",
    "Clean",
    "EDA",
    "MBA",
    "RFM",
    "CLTV",
    "Summary",
];

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, totalSteps, navigateToStep }) => {
    return (
        <nav aria-label="Progress">
            <ol role="list" className="space-y-4 md:flex md:space-x-8 md:space-y-0">
                {steps.map((stepName, index) => {
                    const stepNumber = index + 1;
                    const isCompleted = stepNumber < currentStep;
                    const isCurrent = stepNumber === currentStep;

                    const stepClasses = isCompleted
                        ? "group cursor-pointer flex flex-col border-l-4 border-indigo-600 py-2 pl-4 hover:border-indigo-800 md:border-l-0 md:border-t-4 md:pl-0 md:pt-4 md:pb-0"
                        : isCurrent
                        ? "flex flex-col border-l-4 border-indigo-600 py-2 pl-4 md:border-l-0 md:border-t-4 md:pl-0 md:pt-4 md:pb-0"
                        : "group flex flex-col border-l-4 border-gray-200 py-2 pl-4 md:border-l-0 md:border-t-4 md:pl-0 md:pt-4 md:pb-0";

                    const titleClasses = isCompleted
                        ? "text-sm font-medium text-indigo-600 group-hover:text-indigo-800"
                        : isCurrent
                        ? "text-sm font-medium text-indigo-600"
                        : "text-sm font-medium text-gray-500";

                    return (
                        <li key={stepName} className="md:flex-1">
                            <div
                                onClick={isCompleted ? () => navigateToStep(stepNumber) : undefined}
                                className={stepClasses}
                                {...(isCurrent && { 'aria-current': 'step' })}
                            >
                                <span className={titleClasses}>{`Step ${stepNumber}`}</span>
                                <span className="text-sm font-medium">{stepName}</span>
                            </div>
                        </li>
                    )
                })}
            </ol>
        </nav>
    );
};

export default StepIndicator;