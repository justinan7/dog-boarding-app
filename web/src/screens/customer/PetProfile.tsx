import { Icon } from '../../components/Icon'
import { Section, Card, Badge, Button, DogAvatar } from '../../components/primitives'

function ScheduleRow({
  icon,
  iconColor,
  label,
  time,
  last,
}: {
  icon: 'utensils' | 'pill'
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

function VaccineRow({
  name,
  through,
  last,
}: {
  name: string
  through: string
  last?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '11px 0',
        borderBottom: last ? undefined : '1px solid var(--border-subtle)',
      }}
    >
      <span style={{ fontSize: 14.5, color: 'var(--text-body)' }}>{name}</span>
      <Badge tone="success">{through}</Badge>
    </div>
  )
}

export function PetProfile() {
  return (
    <>
      {/* Title row (back chevron omitted — Pets tab root) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--lagoon-700)' }}>Edit</span>
      </div>

      {/* Pet identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <DogAvatar size={72} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--text-heading)' }}>
            Biscuit
          </span>
          <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Beagle · 24 lb · 4 years</span>
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Vet: Elm Street Animal Hospital</span>
        </div>
      </div>

      {/* Feeding & medication */}
      <Section label="Feeding & medication">
        <Card style={{ padding: '4px 16px' }}>
          <ScheduleRow icon="utensils" iconColor="var(--stone-600)" label="Breakfast, one cup" time="8:00 AM" />
          <ScheduleRow icon="pill" iconColor="var(--biscuit-700)" label="Rimadyl 75 mg, with food" time="8:00 AM" />
          <ScheduleRow icon="utensils" iconColor="var(--stone-600)" label="Dinner, one cup" time="5:30 PM" />
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
          <VaccineRow name="Rabies" through="Through Mar 2027" />
          <VaccineRow name="DHPP" through="Through Jan 2027" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0' }}>
            <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-heading)' }}>Bordetella</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Badge tone="error">Expired</Badge>
              <Button variant="secondary" size="sm">Update</Button>
            </div>
          </div>
        </Card>
        <Button variant="ghost" size="md" fullWidth icon="upload">
          Upload vaccination record
        </Button>
      </Section>

      {/* Waiver */}
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
          <Icon name="file-check" size={17} style={{ color: 'var(--green-success)' }} />
          Boarding waiver · signed Jun 28
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--lagoon-700)' }}>View</span>
      </div>
    </>
  )
}
