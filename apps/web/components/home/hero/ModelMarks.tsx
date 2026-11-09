import { AppleMark, GoogleMark } from '@/components/site/BrandMarks'

/** Where a component lands: Apple Foundation Models and Gemini Nano (Google). */
export function ModelMarks() {
  return (
    <span className="hx-marks" aria-hidden="true">
      <AppleMark />
      <GoogleMark />
    </span>
  )
}
