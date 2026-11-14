import { Link } from 'react-router-dom'
import Rocket from 'lucide-react/dist/esm/icons/rocket'

const FOOTER_LINKS = [
  { path: '/', label: 'Dashboard' },
  { path: '/apod', label: 'APOD' },
  { path: '/mars-rover', label: 'Mars Rover' },
  { path: '/neo', label: 'Near Earth Objects' },
  { path: '/space-weather', label: 'Space Weather' },
  { path: '/earth-trends', label: 'Earth Trends' },
  { path: '/nasa-ai-research', label: 'NASA AI Research' },
  { path: '/data-explorer', label: 'Data Explorer' },
  { path: '/about', label: 'About' },
]

const Footer = () => (
  <footer className="mt-16 border-t" style={{ borderColor: 'var(--surface-border)' }}>
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <div className="flex items-center gap-2">
            <Rocket className="h-6 w-6 text-brand" />
            <span className="text-base font-bold text-ink">AstroLink</span>
          </div>
          <p className="mt-2 text-sm text-ink-soft">
            NASA Space Exploration and AI Research platform — real data from official NASA APIs, with scientific
            provenance and honest error states.
          </p>
        </div>

        <nav className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.path} to={link.path} className="text-sm text-ink-soft transition-colors hover:text-ink">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-6 border-t pt-4" style={{ borderColor: 'var(--surface-border)' }}>
        <p className="text-xs text-ink-muted">
          Data courtesy of NASA (and partner agencies). AstroLink is an independent explorer and is not affiliated
          with or endorsed by NASA.
        </p>
      </div>
    </div>
  </footer>
)

export default Footer
