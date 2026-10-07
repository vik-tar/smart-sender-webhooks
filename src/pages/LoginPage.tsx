import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation } from 'react-router'
import { formError } from '../api/errors'
import { loginPayloadSchema } from '../api/schemas'
import { Field } from '../components/Field'
import { setServerErrors } from '../lib/form'
import { readFrom } from '../lib/navigation'
import { isAuthenticated, useSession } from '../session/context'

const FIELDS = ['email', 'password'] as const

export function LoginPage() {
  const { session, login } = useSession()
  const location = useLocation()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginPayloadSchema),
    defaultValues: { email: '', password: '' },
  })
  const mutation = useMutation({
    mutationFn: login,
    onError: (error) => setServerErrors(error, FIELDS, setError),
  })
  const target = readFrom(location.state) ?? '/webhooks'

  // Single exit path: login() sets the session, this re-render sends the user back where they came from.
  if (isAuthenticated(session)) return <Navigate to={target} replace />

  const formAlert = formError(mutation.error, FIELDS)
  return (
    <main className="auth">
      <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
        <h1>Sign in</h1>
        {session.expired && !mutation.error && (
          <p role="status" className="form-notice">
            Your session has expired. Please sign in again.
          </p>
        )}
        {formAlert && (
          <p role="alert" className="form-error">
            {formAlert}
          </p>
        )}
        <Field
          label="Email"
          type="email"
          autoComplete="username"
          {...register('email')}
          error={errors.email?.message}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          {...register('password')}
          error={errors.password?.message}
        />
        <button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}
