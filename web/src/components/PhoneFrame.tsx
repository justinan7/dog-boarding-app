import type { ReactNode } from 'react'

/** iPhone device frame (402×874 logical) centered on the stage. */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="z-stage">
      <div className="z-phone">
        <div className="z-phone__notch" />
        {children}
      </div>
    </div>
  )
}
