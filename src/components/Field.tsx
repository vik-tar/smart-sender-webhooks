import type { ComponentProps } from 'react'

/** `ref` comes through as a regular prop (React 19), so `{...register(name)}` can be spread straight in. */
interface FieldProps extends ComponentProps<'input'> {
  label: string
  name: string
  error?: string
}

export function Field({ label, name, error, ...input }: FieldProps) {
  const id = `field-${name}`
  const errorId = `${id}-error`
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...input}
      />
      {error && (
        <p id={errorId} className="field-error">
          {error}
        </p>
      )}
    </div>
  )
}
