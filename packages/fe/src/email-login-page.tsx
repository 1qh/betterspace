'use client'

import { Button } from '@a/ui/button'
import { Input } from '@a/ui/input'
import { useState } from 'react'
import { useAuth } from 'react-oidc-context'
import { toast } from 'sonner'

const EmailLoginPage = () => {
  const auth = useAuth(),
    [login, setLogin] = useState(true),
    [pending, setPending] = useState(false),
    submitMagicLink = async (email: string) => {
      await auth.signinRedirect({
        extraQueryParams: {
          login_hint: email,
          provider: 'magic_link'
        },
        state: { flow: login ? 'signIn' : 'signUp' }
      })
    }
  return (
    <form
      className='m-auto max-w-60 space-y-2 *:w-full'
      onSubmit={async ev => {
        ev.preventDefault()
        setPending(true)
        const fd = new FormData(ev.currentTarget),
          emailVal = fd.get('email'),
          email = typeof emailVal === 'string' ? emailVal.trim() : ''
        try {
          await submitMagicLink(email)
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Could not continue with email')
          setPending(false)
        }
      }}>
      <Input autoComplete='email' id='email' name='email' placeholder='Email' />
      <Button disabled={pending} type='submit'>
        {login ? 'Continue with email' : 'Create account with email'}
      </Button>
      <button
        className='text-sm text-muted-foreground hover:text-foreground'
        onClick={() => setLogin(!login)}
        type='button'>
        {login ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
      </button>
    </form>
  )
}

export default EmailLoginPage
