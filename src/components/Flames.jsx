// Score de chaleur d'un prospect (1 à 5), affiché en flammes
export default function Flames({ score, size = 'text-sm', title }) {
  if (!score) return null
  const n = Math.max(1, Math.min(5, Number(score)))
  return (
    <span className={`inline-flex items-center gap-0.5 ${size} leading-none`} title={title || `Chaleur : ${n}/5`} aria-label={`Chaleur ${n} sur 5`}>
      {[1, 2, 3, 4, 5].map(i => <span key={i} className={i <= n ? '' : 'opacity-20 grayscale'}>🔥</span>)}
    </span>
  )
}
