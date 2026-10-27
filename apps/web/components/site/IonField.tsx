/** Three soft blobs in the brand colours, drifting slowly. Sits behind the hero; the glass header blurs it on scroll. */
export function IonField({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden className={`ion-field ${className}`}>
      <span className="ion-blob ion-blob-a" />
      <span className="ion-blob ion-blob-b" />
      <span className="ion-blob ion-blob-c" />
    </div>
  )
}
