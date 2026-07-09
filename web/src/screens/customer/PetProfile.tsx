import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { Section, Card, Badge, Button, DogAvatar } from '../../components/primitives'
import { usePets, usePetDetail, useAddVaccinationRecord, useWaivers, useSignWaiver } from '../../lib/queries'
import { uploadMedia, pickFile } from '../../lib/upload'
import { fmtTime, parseDate } from '../../lib/format'

function ScheduleRow({
  icon,
  iconColor,
  label,
  time,
  last,
}: {
  icon: 'utensils' | 'pill' | 'clipboard-check'
  iconColor: string
  label: string
  time: string
  last?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '11px 0',
        borderBottom: last ? undefined : '1px solid var(--border-subtle)',
      }}
    >
      <Icon name={icon} size={16} style={{ color: iconColor }} />
      <span style={{ flex: 1, fontSize: 14.5, color: 'var(--text-body)' }}>{label}</span>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-heading)' }}>{time}</span>
    </div>
  )
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const monthYear = (ymd: string) => {
  const d = parseDate(ymd)
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}
const cap = (s: string) => (s === 'dhpp' ? 'DHPP' : s.charAt(0).toUpperCase() + s.slice(1))
const kindIcon = (kind: string): 'utensils' | 'pill' | 'clipboard-check' =>
  kind === 'medication' ? 'pill' : kind === 'feeding' ? 'utensils' : 'clipboard-check'
const kindColor = (kind: string) =>
  kind === 'medication' ? 'var(--biscuit-700)' : 'var(--stone-600)'

export function PetProfile() {
  const petsQ = usePets()
  const pets = petsQ.data?.items ?? []
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const pet = pets.find((p) => p.id === selectedId) ?? pets[0]
  const detail = usePetDetail(pet?.id ?? null)
  const addVax = useAddVaccinationRecord()
  const [vaxUploading, setVaxUploading] = useState(false)
  const [vaxUploaded, setVaxUploaded] = useState(false)

  const uploadVaxRecord = async () => {
    if (!pet || vaxUploading) return
    const file = await pickFile('image/*,application/pdf')
    if (!file) return
    setVaxUploading(true)
    try {
      const { objectKey } = await uploadMedia(file, 'document')
      addVax.mutate(
        { petId: pet.id, body: { type: 'uploaded record', documentObjectKey: objectKey } },
        { onSuccess: () => setVaxUploaded(true) },
      )
    } finally {
      setVaxUploading(false)
    }
  }

  if (!pet) {
    return (
      <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
        {petsQ.isLoading ? 'Loading…' : 'No dogs on file yet.'}
      </div>
    )
  }

  const careProfile = [...(detail.data?.careProfile ?? [])].sort((a, b) => a.localTime.localeCompare(b.localTime))
  const vaccinations = detail.data?.vaccinations ?? []

  return (
    <>
      {/* Pet switcher + edit */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {pets.length > 1 && pets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedId(p.id)}
              style={{
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                fontWeight: 600,
                padding: '6px 14px',
                borderRadius: 999,
                background: p.id === pet.id ? 'var(--lagoon-700)' : 'var(--surface-card)',
                color: p.id === pet.id ? 'var(--foam-50)' : 'var(--text-heading)',
                border: p.id === pet.id ? '1px solid var(--lagoon-700)' : '1px solid var(--border-subtle)',
              }}
            >
              {p.name}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--lagoon-700)' }}>Edit</span>
      </div>

      {/* Pet identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <DogAvatar size={72} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--text-heading)' }}>
            {pet.name}
          </span>
          <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            {[pet.breed, pet.weightLb ? `${pet.weightLb} lb` : null].filter(Boolean).join(' · ')}
          </span>
          {pet.behaviorNotes && (
            <span style={{ fontSize: 12.5, color: 'var(--biscuit-700)' }}>{pet.behaviorNotes}</span>
          )}
        </div>
      </div>

      {/* Feeding & medication */}
      <Section label="Feeding & medication">
        <Card style={{ padding: '4px 16px' }}>
          {careProfile.map((item) => (
            <ScheduleRow
              key={item.id}
              icon={kindIcon(item.kind)}
              iconColor={kindColor(item.kind)}
              label={item.dose && !item.label.includes(item.dose) ? `${item.label}, ${item.dose}` : item.label}
              time={fmtTime(item.localTime)}
            />
          ))}
          {careProfile.length === 0 && !detail.isLoading && (
            <div style={{ padding: '11px 0', fontSize: 13.5, color: 'var(--text-muted)' }}>
              No feeding or medication schedule yet.
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0' }}>
            <Icon name="plus" size={16} style={{ color: 'var(--lagoon-700)' }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--lagoon-700)' }}>
              Add feeding or medication
            </span>
          </div>
        </Card>
      </Section>

      {/* Vaccinations */}
      <Section label="Vaccinations">
        <Card style={{ padding: '4px 16px' }}>
          {vaccinations.map((v, i) => (
            <div
              key={v.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '11px 0',
                borderBottom: i < vaccinations.length - 1 ? '1px solid var(--border-subtle)' : undefined,
              }}
            >
              <span style={{ fontSize: 14.5, color: 'var(--text-body)', fontWeight: v.status === 'expired' ? 600 : undefined }}>
                {cap(v.type)}
              </span>
              {v.status === 'expired' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Badge tone="error">Expired</Badge>
                  <Button variant="secondary" size="sm">Update</Button>
                </div>
              ) : (
                <Badge tone="success">{v.expiresOn ? `Through ${monthYear(v.expiresOn)}` : 'Valid'}</Badge>
              )}
            </div>
          ))}
          {vaccinations.length === 0 && !detail.isLoading && (
            <div style={{ padding: '11px 0', fontSize: 13.5, color: 'var(--text-muted)' }}>
              No vaccination records yet.
            </div>
          )}
        </Card>
        <Button
          variant="ghost"
          size="md"
          fullWidth
          icon={vaxUploaded ? 'check' : 'upload'}
          disabled={vaxUploading || vaxUploaded}
          onClick={() => void uploadVaxRecord()}
        >
          {vaxUploaded
            ? 'Record uploaded — the team will review it'
            : vaxUploading
              ? 'Uploading…'
              : 'Upload vaccination record'}
        </Button>
      </Section>

      {/* Waiver */}
      <WaiverStrip />
    </>
  )
}

function WaiverStrip() {
  const waivers = useWaivers()
  const signWaiver = useSignWaiver()
  const first = waivers.data?.items[0]
  const enabled = waivers.data?.enabled ?? false

  const label = !first
    ? 'Boarding waiver'
    : first.status === 'signed'
      ? `${first.name} · signed${first.signedAt ? ` ${parseDate(first.signedAt.slice(0, 10)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}`
      : enabled
        ? `${first.name} · needs your signature`
        : `${first.name} · e-signature launches soon`

  const signed = first?.status === 'signed'
  const openSigning = () => {
    if (!first || signed || !enabled || signWaiver.isPending) return
    signWaiver.mutate(first.templateId, { onSuccess: ({ url }) => window.open(url, '_blank') })
  }

  return (
    <div
      style={{
        background: 'var(--surface-tint)',
        borderRadius: 'var(--radius-lg)',
        padding: '14px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-body)' }}>
        <Icon name="file-check" size={17} style={{ color: signed ? 'var(--green-success)' : 'var(--stone-400)' }} />
        {label}
      </span>
      {!signed && enabled && first && (
        <span
          onClick={openSigning}
          style={{ fontSize: 13, fontWeight: 600, color: 'var(--lagoon-700)', cursor: 'pointer' }}
        >
          {signWaiver.isPending ? 'Opening…' : 'Sign'}
        </span>
      )}
    </div>
  )
}
