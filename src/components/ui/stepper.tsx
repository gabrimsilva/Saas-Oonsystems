import { Check } from 'lucide-react'

/**
 * Stepper Component
 * 
 * A reusable stepper component for multi-step processes.
 * Supports both horizontal and vertical layouts.
 * 
 * @example
 * ```tsx
 * const steps = [
 *   { label: 'Dados', description: 'Informações pessoais' },
 *   { label: 'Pagamento', description: 'Forma de pagamento' },
 *   { label: 'Confirmação', description: 'Revisar pedido' }
 * ]
 * 
 * <Stepper 
 *   steps={steps} 
 *   currentStep={1}
 *   variant="horizontal"
 *   onStepClick={(index) => setCurrentStep(index)}
 * />
 * ```
 */

export interface Step {
  /** Label text for the step */
  label: string
  /** Optional description text for the step */
  description?: string
}

interface StepperProps {
  /** Array of step objects */
  steps: Step[]
  /** Current active step index (0-based) */
  currentStep: number
  /** Layout variant */
  variant?: 'horizontal' | 'vertical'
  /** Optional callback when a step is clicked (enables navigation) */
  onStepClick?: (stepIndex: number) => void
  /** Optional CSS class name */
  className?: string
}

/**
 * Stepper component for displaying multi-step progress
 */
export const Stepper = ({
  steps,
  currentStep,
  variant = 'horizontal',
  onStepClick,
  className = ''
}: StepperProps) => {
  const isStepComplete = (index: number) => index < currentStep
  const isStepActive = (index: number) => index === currentStep
  const isStepClickable = (index: number) => onStepClick && index <= currentStep

  if (variant === 'vertical') {
    return (
      <div className={`flex flex-col ${className}`}>
        {steps.map((step, index) => (
          <div key={index} className="flex">
            {/* Step indicator column */}
            <div className="flex flex-col items-center mr-4">
              <button
                onClick={() => isStepClickable(index) && onStepClick?.(index)}
                disabled={!isStepClickable(index)}
                className={`
                  flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                  transition-colors
                  ${isStepComplete(index) ? 'bg-success text-white' : ''}
                  ${isStepActive(index) ? 'bg-primary text-white' : ''}
                  ${!isStepComplete(index) && !isStepActive(index) ? 'bg-gray-300 text-gray-500' : ''}
                  ${isStepClickable(index) ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}
                `}
                aria-label={`Step ${index + 1}: ${step.label}`}
                aria-current={isStepActive(index) ? 'step' : undefined}
              >
                {isStepComplete(index) ? <Check className="h-4 w-4" /> : index + 1}
              </button>
              {index < steps.length - 1 && (
                <div 
                  className={`
                    w-0.5 h-12 my-1
                    ${isStepComplete(index) ? 'bg-success' : 'bg-gray-300'}
                  `}
                />
              )}
            </div>

            {/* Step content column */}
            <div className="pb-8">
              <div className={`
                text-sm font-medium
                ${isStepActive(index) ? 'text-primary' : ''}
                ${isStepComplete(index) ? 'text-success' : ''}
                ${!isStepComplete(index) && !isStepActive(index) ? 'text-gray-500' : ''}
              `}>
                {step.label}
              </div>
              {step.description && (
                <div className="text-sm text-gray-500 mt-1">
                  {step.description}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Horizontal variant
  return (
    <div className={`flex items-center justify-center ${className}`}>
      {steps.map((step, index) => (
        <div key={index} className="flex items-center">
          {/* Step indicator com texto ao lado */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => isStepClickable(index) && onStepClick?.(index)}
              disabled={!isStepClickable(index)}
              className={`
                flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full text-sm sm:text-base font-bold
                transition-colors flex-shrink-0
                ${isStepComplete(index) ? 'bg-success text-white' : ''}
                ${isStepActive(index) ? 'bg-success text-white' : ''}
                ${!isStepComplete(index) && !isStepActive(index) ? 'bg-gray-300 text-gray-500' : ''}
                ${isStepClickable(index) ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}
              `}
              aria-label={`Step ${index + 1}: ${step.label}`}
              aria-current={isStepActive(index) ? 'step' : undefined}
            >
              {isStepComplete(index) ? <Check className="h-5 w-5" /> : index + 1}
            </button>
            <div className="text-left">
              <div className={`
                text-sm sm:text-base font-medium whitespace-nowrap
                ${isStepActive(index) ? 'text-success' : ''}
                ${isStepComplete(index) ? 'text-success' : ''}
                ${!isStepComplete(index) && !isStepActive(index) ? 'text-gray-400' : ''}
              `}>
                {step.label}
              </div>
            </div>
          </div>

          {/* Connector line */}
          {index < steps.length - 1 && (
            <div 
              className={`
                w-8 sm:w-16 h-0.5 mx-2 sm:mx-4
                ${isStepComplete(index) ? 'bg-success' : 'bg-gray-300'}
              `}
            />
          )}
        </div>
      ))}
    </div>
  )
}

export default Stepper
