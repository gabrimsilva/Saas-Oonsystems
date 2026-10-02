/**
 * Switch Component
 * 
 * A reusable toggle switch component with optional label and description.
 * 
 * @example
 * ```tsx
 * <Switch 
 *   checked={isEnabled} 
 *   onChange={setIsEnabled}
 *   label="Enable notifications"
 *   description="Receive alerts when new orders arrive"
 * />
 * ```
 */

interface SwitchProps {
  /** Optional ID for the switch element */
  id?: string
  /** Whether the switch is in the checked (on) state */
  checked: boolean
  /** Callback function called when the switch state changes */
  onChange: (checked: boolean) => void
  /** Whether the switch is disabled */
  disabled?: boolean
  /** Optional label text displayed next to the switch */
  label?: string
  /** Optional description text displayed below the label */
  description?: string
  /** Optional CSS class name for custom styling */
  className?: string
}

/**
 * Switch component for toggling boolean states
 */
export const Switch = ({ 
  id,
  checked, 
  onChange, 
  disabled = false,
  label,
  description,
  className = ''
}: SwitchProps) => {
  const switchButton = (
    <button
      id={id}
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`
        relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full border border-transparent
        transition-colors duration-200 outline-none
        focus-visible:ring-[3px] focus-visible:ring-ring/25
        ${checked ? 'bg-primary hover:bg-primary-hover' : 'bg-border-strong hover:bg-muted-foreground/40'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      role="switch"
      aria-checked={checked}
      aria-label={label || 'Alternar'}
    >
      <span
        className={`
          inline-block size-4 transform rounded-full bg-white shadow-sm transition-transform duration-200
          ${checked ? 'translate-x-4' : 'translate-x-0.5'}
        `}
      />
    </button>
  )

  // If no label or description, return just the switch
  if (!label && !description) {
    return <div className={className}>{switchButton}</div>
  }

  // Return switch with label and description
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <div className="pt-0.5">{switchButton}</div>
      <div className="flex-1">
        {label && (
          <label
            htmlFor={id}
            className={`text-sm font-medium ${disabled ? 'text-muted-foreground' : 'text-foreground'}`}
          >
            {label}
          </label>
        )}
        {description && (
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </div>
  )
}

export default Switch
